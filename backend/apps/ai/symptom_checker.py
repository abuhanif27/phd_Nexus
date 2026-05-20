import os
import re
from typing import List, Dict, Optional
from django.conf import settings
from .services import AIService

from apps.doctors.models import Doctor
from apps.patients.models import Patient
from django.db.models import Avg, Q
from math import radians, cos, sin, asin, sqrt

# Lazy imports
pd = None
np = None
joblib = None
RandomForestClassifier = None

def _import_heavy_deps():
    global pd, np, joblib, RandomForestClassifier
    try:
        import pandas as p
        pd = p
        import numpy as n
        np = n
        import joblib as j
        joblib = j
        from sklearn.ensemble import RandomForestClassifier as rfc
        RandomForestClassifier = rfc
    except Exception as e:
        print(f"Warning: Symptom Checker could not load heavy dependencies: {e}")

class SymptomCheckerService:
    """
    Service for symptom-based disease prediction and specialist recommendation.
    Uses datasets from 'chating system' and integrates with HF Cloud for Zero Local Load.
    """
    
    DATA_DIR = os.path.join(settings.BASE_DIR, 'data/symptom_checker')
    MODEL_PATH = os.path.join(settings.BASE_DIR, 'ai_models/symptom_checker_rf.joblib')
    METADATA_PATH = os.path.join(settings.BASE_DIR, 'ai_models/symptom_checker_meta.joblib')

    def __init__(self):
        self.model = None
        self.all_symptoms = []
        self.symptom_idx = {}
        self.disease_info = {}
        self.severity_map = {}
        self.ai_service = AIService()
        self.use_hf_api = getattr(settings, 'USE_HF_INFERENCE_API', False)
        self.model_source = 'none'
        self._load_resources()

    def _load_resources(self):
        """Load datasets and model (Cloud Priority -> Local Fallback)."""
        # If Cloud API is enabled, we don't need to load the local model or large CSVs
        if self.use_hf_api:
            # We still need the list of symptoms for UI/Mapping
            # We'll try to load just the meta if it exists, otherwise we do a light load
            if os.path.exists(self.METADATA_PATH):
                try:
                    if joblib is None: import joblib as j; globals()['joblib'] = j
                    meta = joblib.load(self.METADATA_PATH)
                    self.all_symptoms = meta['all_symptoms']
                    self.symptom_idx = meta['symptom_idx']
                    self.model_source = 'cloud_meta'
                    print("☁️ Symptom Checker initialized in Cloud Mode (No local model)")
                    return
                except: pass
            
            # If no meta, we might need a light load of the symptom list
            # but for now let's assume it exists or will be trained if needed
        
        try:
            if pd is None: _import_heavy_deps()
            
            # Load basic info from CSVs
            df_specialist = pd.read_csv(os.path.join(self.DATA_DIR, 'Disease Specialist.csv'))
            df_desc = pd.read_csv(os.path.join(self.DATA_DIR, 'Symptom Description.csv'))
            df_prec = pd.read_csv(os.path.join(self.DATA_DIR, 'Symptom Precaution.csv'))
            df_severity = pd.read_csv(os.path.join(self.DATA_DIR, 'Symptom Severity.csv'))

            # Standardize names
            def standardize(name):
                return " ".join(str(name).strip().replace("'", "").replace('"', '').split())

            def standardize_symptom(s):
                return str(s).strip().lower().replace(' ', '_').replace('__', '_')

            # Pre-map data for fast lookup
            for _, row in df_specialist.iterrows():
                disease = standardize(row['Disease'])
                self.disease_info[disease] = {
                    'specialist': row['Specialist'],
                    'description': 'Description not available.',
                    'precautions': []
                }

            for _, row in df_desc.iterrows():
                disease = standardize(row['Disease'])
                if disease in self.disease_info:
                    self.disease_info[disease]['description'] = row['Description']

            for _, row in df_prec.iterrows():
                disease = standardize(row['Disease'])
                if disease in self.disease_info:
                    prec = [row[f'Precaution_{i}'] for i in range(1, 5) if pd.notna(row[f'Precaution_{i}'])]
                    self.disease_info[disease]['precautions'] = prec

            # Severity lookup
            self.severity_map = {standardize_symptom(k): v for k, v in zip(df_severity['Symptom'], df_severity['weight'])}

            # 1. TRY HUGGING FACE FIRST (Local execution of HF models)
            from huggingface_hub import hf_hub_download
            if getattr(settings, 'USE_HF_MODELS', False) and not self.use_hf_api:
                try:
                    repo_id = getattr(settings, 'HF_REPO_ID', None)
                    token = getattr(settings, 'HF_TOKEN', None)
                    if repo_id:
                        print(f"☁️ Loading Symptom Checker from HF: {repo_id}")
                        rf_path = hf_hub_download(repo_id=repo_id, filename="symptom_checker_rf.joblib", token=token)
                        meta_path = hf_hub_download(repo_id=repo_id, filename="symptom_checker_meta.joblib", token=token)
                        
                        self.model = joblib.load(rf_path)
                        meta = joblib.load(meta_path)
                        self.all_symptoms = meta['all_symptoms']
                        self.symptom_idx = meta['symptom_idx']
                        self.model_source = 'hf'
                        print(f"✓ Successfully loaded Symptom Checker from Hugging Face Hub")
                        return
                except Exception as e:
                    print(f"Warning: HF load failed for Symptom Checker: {e}")

            # 2. LOCAL FALLBACK
            if os.path.exists(self.MODEL_PATH) and os.path.exists(self.METADATA_PATH):
                self.model = joblib.load(self.MODEL_PATH)
                meta = joblib.load(self.METADATA_PATH)
                self.all_symptoms = meta['all_symptoms']
                self.symptom_idx = meta['symptom_idx']
                self.model_source = 'local'
                print(f"✓ Loaded Symptom Checker model (LOCAL) with {len(self.all_symptoms)} symptoms")
            else:
                if not self.use_hf_api:
                    self.train_model()
                    self.model_source = 'trained'

        except Exception as e:
            print(f"Error loading Symptom Checker resources: {e}")

    def train_model(self):
        """Train Random Forest model on the symptoms dataset."""
        if pd is None: _import_heavy_deps()
        print("Training Symptom Checker Random Forest model...")
        try:
            df_symptoms = pd.read_csv(os.path.join(self.DATA_DIR, 'Symptom.csv'))
            
            def standardize_symptom(s):
                return str(s).strip().lower().replace(' ', '_').replace('__', '_')

            # Extract all unique symptoms
            all_vals = df_symptoms.iloc[:, 1:].values.flatten()
            self.all_symptoms = sorted(list(set([standardize_symptom(x) for x in all_vals if pd.notna(x) and str(x).strip()])))
            self.symptom_idx = {s: i for i, s in enumerate(self.all_symptoms)}

            # Create feature matrix (Binary/One-Hot)
            X = np.zeros((len(df_symptoms), len(self.all_symptoms)))
            y = df_symptoms['Disease'].apply(lambda x: " ".join(str(x).strip().replace("'", "").replace('"', '').split())).values

            for i, row in df_symptoms.iterrows():
                for col in df_symptoms.columns[1:]:
                    val = standardize_symptom(row[col])
                    if val in self.symptom_idx:
                        X[i, self.symptom_idx[val]] = 1

            self.model = RandomForestClassifier(n_estimators=150, random_state=42)
            self.model.fit(X, y)

            # Save model and metadata
            os.makedirs(os.path.dirname(self.MODEL_PATH), exist_ok=True)
            joblib.dump(self.model, self.MODEL_PATH)
            joblib.dump({'all_symptoms': self.all_symptoms, 'symptom_idx': self.symptom_idx}, self.METADATA_PATH)
            print("✓ Symptom Checker model trained and saved.")
            
        except Exception as e:
            print(f"Failed to train Symptom Checker model: {e}")

    def check_symptoms(self, text: str, manual_symptoms: List[str] = None, patient=None) -> Dict:
        """
        Main entry point for checking symptoms.
        OFFLOADED: Uses HF Cloud for prediction when possible.
        """
        detected_symptoms = set()
        
        # 1. Manual selection
        if manual_symptoms:
            for s in manual_symptoms:
                if s in self.symptom_idx:
                    detected_symptoms.add(s)

        # 2. NLP Extraction & Prediction (HF Cloud Priority)
        if self.use_hf_api:
            model_id = getattr(settings, 'HF_LLM_MODEL', 'mistralai/Mistral-7B-Instruct-v0.2')
            
            # Combine text and manual symptoms for LLM
            combined_context = text
            if manual_symptoms:
                combined_context += f"\nSelected symptoms: {', '.join(manual_symptoms)}"

            prompt = f"""[INST] You are a medical diagnostic assistant. Analyze the symptoms and provide:
1. Predicted Disease
2. Specialist recommendation
3. Confidence level (0-100)
4. Alternatives (list of {{disease, specialist, confidence}})
5. Detected symptoms from this standard list: {', '.join(self.all_symptoms[:100])}... (and others)

Symptoms: {combined_context}

Return only a valid JSON object. [/INST]"""
            
            try:
                import json
                response = self.ai_service._call_hf_inference(prompt, model_id, task="text-generation", max_new_tokens=500)
                if response:
                    match = re.search(r'\{.*\}', response, re.DOTALL)
                    if match:
                        result = json.loads(match.group(0))
                        
                        # Add real doctor recommendations
                        spec = result.get('specialist', 'General Physician')
                        result['recommended_doctors'] = self._get_recommended_doctors(spec, patient=patient)
                        
                        # Add severity
                        weights = [self.severity_map.get(s.lower().replace(' ', '_'), 3) for s in result.get('detected_symptoms', [])]
                        avg_sev = sum(weights) / len(weights) if weights else 3
                        result['severity_score'] = round(avg_sev, 1)
                        result['severity_level'] = "URGENT" if avg_sev >= 5 else "MODERATE" if avg_sev >= 3 else "MILD"
                        
                        # Ensure descriptions/precautions are present
                        disease = result.get('disease')
                        if disease in self.disease_info:
                            result['description'] = self.disease_info[disease]['description']
                            result['precautions'] = self.disease_info[disease]['precautions']
                        
                        return result
            except Exception as e:
                print(f"HF Cloud Diagnostic Error: {e}")

        # LOCAL FALLBACK (Keyword search + Random Forest)
        if text.strip():
            clean_text = text.lower().replace('_', ' ').replace('-', ' ')
            for sym in self.all_symptoms:
                readable = sym.replace('_', ' ')
                pattern = rf'\b({re.escape(readable)}|{re.escape(sym)})\b'
                if re.search(pattern, clean_text):
                    detected_symptoms.add(sym)

        if not detected_symptoms:
            return {'error': 'No recognized symptoms found. Please describe your symptoms or select them from the list.'}

        if not self.model:
            return {'error': 'Local model not loaded and Cloud API failed.'}

        # 3. Predict Disease locally
        vector = np.zeros(len(self.all_symptoms))
        for s in detected_symptoms:
            vector[self.symptom_idx[s]] = 1
        
        probs = self.model.predict_proba([vector])[0]
        top_indices = np.argsort(probs)[-3:][::-1]
        
        disease = self.model.classes_[top_indices[0]]
        confidence = probs[top_indices[0]] * 100
        
        # ... (rest of info gathering)


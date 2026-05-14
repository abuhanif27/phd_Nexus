import os
import pandas as pd
import numpy as np
import joblib
import re
from typing import List, Dict, Optional
from django.conf import settings
from sklearn.ensemble import RandomForestClassifier
from .services import AIService

class SymptomCheckerService:
    """
    Service for symptom-based disease prediction and specialist recommendation.
    Uses datasets from 'chating system' and integrates with Remote AI Brain for NLP.
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
        self._load_resources()

    def _load_resources(self):
        """Load datasets and model."""
        try:
            # Load basic info from CSVs
            df_specialist = pd.read_csv(os.path.join(self.DATA_DIR, 'Disease Specialist.csv'))
            df_desc = pd.read_csv(os.path.join(self.DATA_DIR, 'Symptom Description.csv'))
            df_prec = pd.read_csv(os.path.join(self.DATA_DIR, 'Symptom Precaution.csv'))
            df_severity = pd.read_csv(os.path.join(self.DATA_DIR, 'Symptom Severity.csv'))

            # Standardize disease names
            def standardize(name):
                return " ".join(str(name).strip().replace("'", "").replace('"', '').split())

            # Pre-map data for fast lookup
            for _, row in df_specialist.iterrows():
                disease = standardize(row['Disease'])
                self.disease_info[disease] = {
                    'specialist': row['Specialist'],
                    'description': '',
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
            self.severity_map = dict(zip(df_severity['Symptom'].str.strip(), df_severity['weight']))

            # Load or train model
            if os.path.exists(self.MODEL_PATH) and os.path.exists(self.METADATA_PATH):
                self.model = joblib.load(self.MODEL_PATH)
                meta = joblib.load(self.METADATA_PATH)
                self.all_symptoms = meta['all_symptoms']
                self.symptom_idx = meta['symptom_idx']
                print("✓ Loaded Symptom Checker Random Forest model")
            else:
                self.train_model()

        except Exception as e:
            print(f"Error loading Symptom Checker resources: {e}")

    def train_model(self):
        """Train Random Forest model on the symptoms dataset."""
        print("Training Symptom Checker Random Forest model...")
        try:
            df_symptoms = pd.read_csv(os.path.join(self.DATA_DIR, 'Symptom.csv'))
            
            # Extract all unique symptoms
            all_vals = df_symptoms.iloc[:, 1:].values.flatten()
            self.all_symptoms = sorted(list(set([str(x).strip() for x in all_vals if pd.notna(x) and str(x).strip()])))
            self.symptom_idx = {s: i for i, s in enumerate(self.all_symptoms)}

            # Create feature matrix (Binary/One-Hot)
            X = np.zeros((len(df_symptoms), len(self.all_symptoms)))
            y = df_symptoms['Disease'].apply(lambda x: " ".join(str(x).strip().replace("'", "").replace('"', '').split())).values

            for i, row in df_symptoms.iterrows():
                for col in df_symptoms.columns[1:]:
                    val = str(row[col]).strip()
                    if val in self.symptom_idx:
                        X[i, self.symptom_idx[val]] = 1

            self.model = RandomForestClassifier(n_estimators=100, random_state=42)
            self.model.fit(X, y)

            # Save model and metadata
            os.makedirs(os.path.dirname(self.MODEL_PATH), exist_ok=True)
            joblib.dump(self.model, self.MODEL_PATH)
            joblib.dump({'all_symptoms': self.all_symptoms, 'symptom_idx': self.symptom_idx}, self.METADATA_PATH)
            print("✓ Symptom Checker model trained and saved.")
            
        except Exception as e:
            print(f"Failed to train Symptom Checker model: {e}")

    def check_symptoms(self, text: str, manual_symptoms: List[str] = None) -> Dict:
        """
        Main entry point for checking symptoms.
        1. Extracts standard symptoms from text (via Remote Brain if available).
        2. Combines with manual selections.
        3. Predicts disease and returns full info.
        """
        detected_symptoms = set()
        
        # 1. Manual selection
        if manual_symptoms:
            for s in manual_symptoms:
                if s in self.symptom_idx:
                    detected_symptoms.add(s)

        # 2. NLP Extraction (Proxy to Colab)
        if text.strip():
            if self.ai_service.remote_url:
                res = self.ai_service._call_remote_brain('extract_symptoms', {'text': text})
                for s in res.get('symptoms', []):
                    if s in self.symptom_idx:
                        detected_symptoms.add(s)
            else:
                # Basic local fallback (keyword search)
                clean_text = text.lower().replace('_', ' ')
                for sym in self.all_symptoms:
                    readable = sym.replace('_', ' ')
                    if re.search(rf'\b{re.escape(readable)}\b', clean_text):
                        detected_symptoms.add(sym)

        if not detected_symptoms:
            return {'error': 'No recognized symptoms found. Please describe your symptoms or select them from the list.'}

        # 3. Predict Disease
        vector = np.zeros(len(self.all_symptoms))
        for s in detected_symptoms:
            vector[self.symptom_idx[s]] = 1
        
        probs = self.model.predict_proba([vector])[0]
        top_idx = np.argmax(probs)
        disease = self.model.classes_[top_idx]
        confidence = probs[top_idx] * 100

        # 4. Gather Info
        info = self.disease_info.get(disease, {
            'specialist': 'General Physician',
            'description': 'Detailed clinical data not available.',
            'precautions': []
        })

        # 5. Calculate Severity
        weights = [self.severity_map.get(s, 0) for s in detected_symptoms]
        weights = [w for w in weights if w > 0]
        avg_sev = sum(weights) / len(weights) if weights else 0
        sev_msg = "URGENT" if avg_sev >= 5 else "MODERATE" if avg_sev >= 3 else "MILD"

        return {
            'disease': disease,
            'specialist': info['specialist'],
            'confidence': round(confidence, 1),
            'severity_score': round(avg_sev, 1),
            'severity_level': sev_msg,
            'description': info['description'],
            'precautions': info['precautions'],
            'detected_symptoms': [s.replace('_', ' ').title() for s in detected_symptoms]
        }

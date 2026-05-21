import os
import re
from typing import List, Dict, Optional
from django.conf import settings

# Zero Local Load: All heavy imports and resource loading are delayed until needed.
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
    Optimized for Zero Local Load by offloading to Hugging Face Cloud.
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
        self.use_hf_api = getattr(settings, 'USE_HF_INFERENCE_API', False)
        self.model_source = 'none'
        self._resources_loaded = False
        # ai_service is imported here to avoid top-level load
        self._ai_service = None

    @property
    def ai_service(self):
        if self._ai_service is None:
            from .services import ai_service
            self._ai_service = ai_service
        return self._ai_service

    def _ensure_resources(self):
        """Lazy load resources only when needed."""
        if self._resources_loaded:
            return
        self._load_resources()
        self._resources_loaded = True

    def _get_recommended_doctors(self, specialist_name, patient=None):
        """Find doctors by specialty (lightweight DB query)."""
        from apps.doctors.models import Doctor
        from django.db.models import Q
        
        clean_spec = specialist_name.split('(')[0].strip()
        doctors = Doctor.objects.filter(
            Q(specialty__icontains=clean_spec) | Q(specialty__icontains=clean_spec.replace('ist', '')),
            verification_status='approved'
        ).select_related('user')

        doc_list = []
        for d in doctors:
            doc_list.append({
                'id': d.id,
                'name': d.name,
                'specialty': d.specialty,
                'rating': d.rating,
                'location': d.location,
                'is_verified': d.is_verified
            })
        return doc_list[:5]

    def _load_resources(self):
        """Load datasets and model (Cloud Priority -> Local Fallback)."""
        if self.use_hf_api:
            # In Cloud mode, we only need the metadata (list of symptoms)
            if os.path.exists(self.METADATA_PATH):
                try:
                    import joblib as j
                    meta = j.load(self.METADATA_PATH)
                    self.all_symptoms = meta['all_symptoms']
                    self.symptom_idx = meta['symptom_idx']
                    self.model_source = 'cloud_meta'
                    print("☁️ Symptom Checker: Using Cloud mode (No local model loaded)")
                    return
                except: pass
        
        # Local Fallback path (Heavy)
        try:
            _import_heavy_deps()
            if pd is None: return

            # Load CSVs
            df_specialist = pd.read_csv(os.path.join(self.DATA_DIR, 'Disease Specialist.csv'))
            df_desc = pd.read_csv(os.path.join(self.DATA_DIR, 'Symptom Description.csv'))
            df_prec = pd.read_csv(os.path.join(self.DATA_DIR, 'Symptom Precaution.csv'))
            df_severity = pd.read_csv(os.path.join(self.DATA_DIR, 'Symptom Severity.csv'))

            # Standardize
            for _, row in df_specialist.iterrows():
                disease = str(row['Disease']).strip()
                self.disease_info[disease] = {'specialist': row['Specialist'], 'description': '', 'precautions': []}

            # Map Severity
            self.severity_map = {str(k).strip().lower().replace(' ', '_'): v for k, v in zip(df_severity['Symptom'], df_severity['weight'])}

            # Load Model
            if os.path.exists(self.MODEL_PATH):
                self.model = joblib.load(self.MODEL_PATH)
                self.model_source = 'local'
        except Exception as e:
            print(f"Error loading Symptom Checker resources: {e}")

    def check_symptoms(self, text: str, manual_symptoms: List[str] = None, patient=None) -> Dict:
        """
        Main entry point. Uses HF Cloud if enabled, else falls back to local.
        """
        self._ensure_resources()
        
        if self.use_hf_api and self.ai_service._hf_available():
            # Cloud Logic
            model_id = getattr(settings, 'HF_LLM_MODEL', 'openai/gpt-oss-20b')
            prompt = (
                "Diagnose these symptoms and return only valid JSON with keys: "
                "disease, specialist, confidence, alternatives, detected_symptoms.\n"
                f"Symptoms: {text}"
            )
            
            try:
                response = self.ai_service._call_hf_chat(prompt, system_prompt="You are a medical AI. Only output JSON.")
                result = self.ai_service._extract_json(response)
                if result:
                    # Enrich with doctor info
                    spec = result.get('specialist', 'General Physician')
                    result['recommended_doctors'] = self._get_recommended_doctors(spec, patient=patient)
                    return result
            except Exception as e:
                print(f"Cloud Diagnostic Error: {e}")

        # Local Fallback
        specialist = self.ai_service.predict_specialist(text, mode='quick')
        spec = specialist.get('specialist', 'General Physician')
        return {
            "disease": "Needs clinical review",
            "specialist": spec,
            "confidence": specialist.get('confidence', 0.5),
            "alternatives": specialist.get('alternatives', []),
            "detected_symptoms": manual_symptoms or self._extract_symptom_terms(text),
            "recommended_doctors": self._get_recommended_doctors(spec, patient=patient),
            "model_source": specialist.get('model_type', 'fallback')
        }

    def _extract_symptom_terms(self, text: str) -> List[str]:
        """Small no-model symptom term extractor for degraded mode."""
        tokens = re.findall(r"[a-zA-Z][a-zA-Z\s-]{2,30}", text.lower())
        common = ('pain', 'fever', 'cough', 'headache', 'nausea', 'vomiting', 'rash',
                  'dizziness', 'fatigue', 'breath', 'chest', 'stomach', 'joint')
        found = []
        for token in tokens:
            value = token.strip()
            if any(word in value for word in common) and value not in found:
                found.append(value)
        return found[:10]

import os
import re
import csv
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
        """Load datasets and model (Dataset Driven -> Cloud Fallback)."""
        # Always load standard symptom list from the project's local CSV (Very light)
        try:
            base_dir = settings.BASE_DIR
            dataset_path = os.path.join(base_dir, 'chating system', 'Dataset', 'Symptom Severity.csv')
            if os.path.exists(dataset_path):
                with open(dataset_path, mode='r', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    self.all_symptoms = [row['Symptom'].strip().replace('_', ' ').title() for row in reader]
                    self.all_symptoms = sorted(list(set(self.all_symptoms)))
                    print(f"✅ Loaded {len(self.all_symptoms)} symptoms from dataset.")
            
            # Populate disease_info for mapping
            spec_path = os.path.join(base_dir, 'chating system', 'Dataset', 'Disease Specialist.csv')
            if os.path.exists(spec_path):
                with open(spec_path, mode='r', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        disease = row['Disease'].strip()
                        self.disease_info[disease] = {'specialist': row['Specialist'], 'description': '', 'precautions': []}
        except Exception as e:
            print(f"Error loading lightweight symptoms: {e}")

        if self.use_hf_api:
            # Cloud mode metadata fallback (Legacy)
            if not self.all_symptoms and os.path.exists(self.METADATA_PATH):
                try:
                    import joblib as j
                    meta = j.load(self.METADATA_PATH)
                    self.all_symptoms = meta['all_symptoms']
                    self.model_source = 'cloud_meta'
                    return
                except: pass
        
        # We now avoid loading heavy sklearn models unless explicitly requested,
        # because the Reinforced Knowledge engine replaces them.
        self.model_source = 'reinforced_knowledge'

    def check_symptoms(self, text: str, manual_symptoms: List[str] = None, patient=None) -> Dict:
        """
        Main entry point. Prioritizes Reinforced Local Engine.
        """
        # Ensure we have symptoms to work with
        if not manual_symptoms and not text:
            return {"error": "No symptoms provided"}

        # 1. Use Reinforced Engine (Zero CPU, Dataset Driven)
        specialist_result = self.ai_service.predict_specialist(text or ", ".join(manual_symptoms or []))
        
        disease = specialist_result.get('disease_prediction', 'Undetermined')
        specialist = specialist_result.get('specialist', 'General Physician')
        
        # 2. Get additional info from datasets (Description, Precautions, Severity)
        description = "Please consult a professional for a detailed diagnosis."
        precautions = ["Avoid self-medication", "Monitor symptoms", "Consult a doctor if worsening"]
        severity_level = "Moderate"
        severity_score = 4
        
        try:
            # Use data from the 'chating system' datasets
            base_dir = settings.BASE_DIR
            
            # Map description
            desc_path = os.path.join(base_dir, 'chating system', 'Dataset', 'Symptom Description.csv')
            with open(desc_path, mode='r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    if row['Disease'].strip().lower() == disease.lower():
                        description = row['Description'].strip()
                        break
            
            # Map precautions
            prec_path = os.path.join(base_dir, 'chating system', 'Dataset', 'Symptom Precaution.csv')
            with open(prec_path, mode='r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    if row['Disease'].strip().lower() == disease.lower():
                        precautions = [row[f'Precaution_{i}'].strip() for i in range(1, 5) if row.get(f'Precaution_{i}') and row[f'Precaution_{i}'].strip()]
                        break
                        
            # Map severity (average weight of detected symptoms)
            sev_path = os.path.join(base_dir, 'chating system', 'Dataset', 'Symptom Severity.csv')
            detected_symptoms = specialist_result.get('symptoms_detected', manual_symptoms or [])
            total_sev = 0
            found_sev = 0
            with open(sev_path, mode='r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                sev_data = {row['Symptom'].strip().replace('_', ' ').lower(): int(row['weight']) for row in reader}
                for s in detected_symptoms:
                    s_clean = s.lower().strip()
                    if s_clean in sev_data:
                        total_sev += sev_data[s_clean]
                        found_sev += 1
            
            if found_sev > 0:
                severity_score = total_sev / found_sev
                severity_level = "High" if severity_score > 5 else "Moderate" if severity_score > 3 else "Low"

        except Exception as e:
            print(f"Error fetching dataset info: {e}")

        return {
            "disease": disease,
            "specialist": specialist,
            "confidence": specialist_result.get('confidence', 0.5),
            "alternatives": [
                {"disease": d, "specialist": self.ai_service._map_disease_to_specialist(d), "confidence": 0.4} 
                for d in specialist_result.get('alternatives', [])
            ],
            "detected_symptoms": detected_symptoms,
            "severity_score": severity_score,
            "severity_level": severity_level,
            "description": description,
            "precautions": precautions,
            "recommended_doctors": self._get_recommended_doctors(specialist, patient=patient),
            "model_source": "reinforced_knowledge"
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

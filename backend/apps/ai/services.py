"""
AI/ML Services: symptom analysis, specialist prediction, RAG-like summarization.
"""
import os
import re
import string
import pickle
from pathlib import Path
from typing import List, Dict, Tuple
from datetime import datetime
import numpy as np

# ML/NLP imports
try:
    import spacy
    import joblib
    import faiss
    from sentence_transformers import SentenceTransformer
    from sumy.parsers.plaintext import PlaintextParser
    from sumy.nlp.tokenizers import Tokenizer
    from sumy.summarizers.text_rank import TextRankSummarizer
except Exception:
    # Dependencies not yet installed
    spacy = None
    joblib = None
    faiss = None
    SentenceTransformer = None
    PlaintextParser = None
    Tokenizer = None
    TextRankSummarizer = None

from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from apps.records.models import LabResult, Prescription, Encounter, File
from apps.patients.models import Patient
from .models import EmbeddingMeta, AISummary
from .tasks import get_or_extract_file_text


class AIService:
    """
    Main AI service for NLP/ML operations.
    Supports sklearn and DistilBERT models with intelligent fallback.
    100% FREE - no API costs!
    """
    
    # Strictly filter out non-medical fragments (OCR noise, headers, names)
    # We use these patterns to purge noise from ALL summary fields
    SUMMARY_BLACKLIST = (
        r'Dr\.?\s+[A-Z]', r'Hospital', r'Institute', r'Center', r'Clinic',
        r'Phone', r'Email', r'Address', r'Website', r'www\.', r'Lane', r'Drive', r'Suite',
        r'Date:', r'Time:', r'Patient:', r'Age:', r'Gender:', r'Sex:',
        r'Fax', r'Tel:', r'Mobile', r'Miiy', r'Dui', r'Plsat', r'Viol', r'Id\s+Rroz',
        r'Unknown', r'Content\s+from\s+image', r'Document:', r'Medical\s+Document',
        r'Road', r'Street', r'St\.', r'Ave', r'Avenue', r'Bldg', r'Building',
        r'Pharmacy', r'Diagnostic', r'Medical\s+College', r'University',
        r'\d{10,}', r'\(\d{3}\)', r'[\w.-]+@[\w.-]+\.\w+', r'http[s]?://'
    )

    # Keywords that indicate a document has legitimate medical content
    MEDICAL_KEYWORDS = (
        r'mg', r'tablet', r'capsule', r'diagnosis', r'history', r'patient',
        r'blood', r'result', r'test', r'lab', r'clinical', r'symptom',
        r'treatment', r'physician', r'medicine', r'dose', r'dosage',
        r'injection', r'iv', r'bp', r'heart', r'pulse', r'temperature',
        r'pain', r'stable', r'acute', r'chronic', r'prescription', r'rx',
        r'indication', r'finding', r'exam', r'medical', r'condition'
    )

    def __init__(self, model_type: str = 'auto'):
        """
        Initialize AI Service.
        Supports REMOTE_BRAIN mode for low-resource systems.
        """
        self.model_type = model_type
        self.remote_url = getattr(settings, 'REMOTE_BRAIN_URL', None)
        
        self.spacy_model = None
        self.embedding_model = None
        self.specialist_classifier = None
        self.specialist_classifier_type = None
        self.distilbert_classifier = None
        self.faiss_index = None
        
        # If we have a remote URL, we don't load heavy local models
        if self.remote_url:
            self.remote_url = self.remote_url.rstrip('/')
            # Prevent accidental inclusion of endpoint in the base URL
            if '/extract_prescription' in self.remote_url:
                self.remote_url = self.remote_url.replace('/extract_prescription', '')
            print(f"🚀 AI Service running in REMOTE mode via {self.remote_url}")
        else:
            self._load_models()

    def _call_remote_brain(self, endpoint: str, data: Dict) -> Dict:
        """Helper to call Google Colab Brain."""
        import requests
        try:
            response = requests.post(f"{self.remote_url.rstrip('/')}/{endpoint}", json=data, timeout=30)
            return response.json()
        except Exception as e:
            print(f"Remote Brain Error: {e}")
            return {}

    def _load_models(self):
        """Lazy load ML models."""
        try:
            # Load spaCy
            self.spacy_model = spacy.load(settings.SPACY_MODEL)
        except Exception as e:
            print(f"Warning: Could not load spaCy model: {e}")
        
        try:
            # Load sentence transformer
            self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        except Exception as e:
            print(f"Warning: Could not load embedding model: {e}")
        
        # Load specialist classifier with intelligent model selection
        self._load_specialist_classifier()
        
        # Load FAISS index if it exists
        if os.path.exists(settings.FAISS_INDEX_PATH):
            try:
                self.faiss_index = faiss.read_index(str(settings.FAISS_INDEX_PATH))
            except Exception as e:
                print(f"Warning: Could not load FAISS index: {e}")
    
    def _load_specialist_classifier(self):
        """Load specialist classifier (Enhanced versions with fallback)."""
        # Enhanced model paths (PRIORITY)
        enhanced_sklearn_path = os.path.join(settings.BASE_DIR, 'ai_models/specialist_clf_sklearn_enhanced.joblib')
        enhanced_sklearn_labels = os.path.join(settings.BASE_DIR, 'ai_models/specialist_clf_sklearn_enhanced_labels.joblib')
        
        # Original model paths (fallback)
        pytorch_model_path = os.path.join(settings.BASE_DIR, 'ai_models/specialist_clf_pytorch.pt')
        pytorch_labels_path = os.path.join(settings.BASE_DIR, 'ai_models/specialist_clf_pytorch_labels.joblib')
        sklearn_model_path = os.path.join(settings.BASE_DIR, 'ai_models/specialist_clf_sklearn.joblib')
        sklearn_labels_path = os.path.join(settings.BASE_DIR, 'ai_models/specialist_clf_sklearn_labels.joblib')
        
        # Try ENHANCED sklearn first (best performance)
        if os.path.exists(enhanced_sklearn_path) and os.path.exists(enhanced_sklearn_labels):
            try:
                from apps.ai.sklearn_classifier_enhanced import EnhancedSklearnSpecialistClassifier
                self.specialist_classifier = EnhancedSklearnSpecialistClassifier.load(
                    enhanced_sklearn_path, enhanced_sklearn_labels
                )
                self.specialist_classifier_type = 'enhanced_sklearn'
                print(f"✓ Loaded ENHANCED sklearn specialist classifier (HIGH ACCURACY)")
                
                # Try to load FREE DistilBERT for deep mode
                distilbert_path = os.path.join(settings.BASE_DIR, 'ai_models/specialist_clf_distilbert_cpu.pt')
                if os.path.exists(distilbert_path):
                    try:
                        from apps.ai.distilbert_cpu_classifier import FreeDistilBERTClassifier
                        self.distilbert_classifier = FreeDistilBERTClassifier(distilbert_path)
                        print(f"✓ Deep mode available (FREE DistilBERT, no API costs)")
                    except Exception as e:
                        print(f"  Deep mode unavailable: {e}")
                
                return
            except Exception as e:
                print(f"Warning: Could not load enhanced sklearn classifier: {e}")
        
        # Try PyTorch if requested or auto
        if self.model_type in ['pytorch', 'auto']:
            if os.path.exists(pytorch_model_path) and os.path.exists(pytorch_labels_path):
                try:
                    from apps.ai.pytorch_classifier import PyTorchSpecialistClassifier
                    self.specialist_classifier = PyTorchSpecialistClassifier.load(
                        pytorch_model_path, pytorch_labels_path
                    )
                    self.specialist_classifier_type = 'pytorch'
                    print(f"✓ Loaded PyTorch specialist classifier")
                    return
                except Exception as e:
                    print(f"Warning: Could not load PyTorch classifier: {e}")
                    if self.model_type == 'pytorch':
                        return
        
        # Try regular sklearn (fallback or explicit)
        if self.model_type in ['sklearn', 'auto']:
            if os.path.exists(sklearn_model_path) and os.path.exists(sklearn_labels_path):
                try:
                    # Try to load precomputed sklearn models
                    model = joblib.load(sklearn_model_path)
                    labels = joblib.load(sklearn_labels_path)
                    self.specialist_classifier = model
                    self.specialist_classifier_type = 'sklearn'
                    print(f"✓ Loaded sklearn specialist classifier")
                    return
                except Exception as e:
                    print(f"Note: sklearn classifier models not yet trained: {e}")
        
        # Legacy fallback - try old joblib path
        if os.path.exists(settings.SYMPTOM_MODEL_PATH):
            try:
                self.specialist_classifier = joblib.load(settings.SYMPTOM_MODEL_PATH)
                self.specialist_classifier_type = 'legacy'
                print(f"✓ Loaded legacy specialist classifier")
            except Exception as e:
                print(f"Warning: Could not load legacy classifier: {e}")
    
    def clean_text(self, text: str) -> str:
        """Clean and normalize text."""
        # Lowercase
        text = text.lower()
        # Remove extra whitespace
        text = ' '.join(text.split())
        return text
    
    def analyze_symptoms(self, text: str) -> Dict:
        """
        Analyze symptom text using spaCy NER.
        Returns cleaned text and extracted entities.
        """
        if not self.spacy_model:
            return {
                'cleaned_text': self.clean_text(text),
                'entities': []
            }
        
        cleaned = self.clean_text(text)
        doc = self.spacy_model(text)
        
        # Extract entities (symptoms, drugs, dates, etc.)
        entities = []
        for ent in doc.ents:
            entities.append({
                'text': ent.text,
                'label': ent.label_,
                'start': ent.start_char,
                'end': ent.end_char
            })
        
        return {
            'cleaned_text': cleaned,
            'entities': entities
        }
    
    def predict_specialist(self, text: str, model_type: str = None, mode: str = 'quick', 
                          patient_history: str = None) -> Dict:
        """
        Predict specialist from symptom text.
        Proxies to Remote Brain if available.
        """
        if self.remote_url:
            return self._call_remote_brain('predict', {'text': text})

        # If caller requests a specific model type, attempt to load it.
        if model_type:
            # Normalize
            model_type = model_type.lower()
            # If requested model differs from currently loaded, try to load it
            if self.specialist_classifier_type != model_type:
                # update preference and attempt to reload
                self.model_type = model_type
                self._load_specialist_classifier()

        if not self.specialist_classifier:
            return {
                'specialist': 'General Physician',
                'confidence': 0.5,
                'alternatives': [],
                'model_type': 'fallback'
            }
        
        try:
            # DEEP MODE: Use FREE DistilBERT (no API costs!)
            if mode == 'deep' and self.distilbert_classifier:
                result = self.distilbert_classifier.predict_single(text, top_k=3)
                result['model_type'] = 'distilbert_cpu_free'
                return result
            
            # Use new classifiers (sklearn, enhanced_sklearn) with predict_single method
            if self.specialist_classifier_type in ['sklearn', 'pytorch', 'enhanced_sklearn']:
                result = self.specialist_classifier.predict_single(text, top_k=3)
                result['model_type'] = self.specialist_classifier_type
                return result
            
            # Legacy model handling (old embedding-based approach)
            if not self.embedding_model:
                return {
                    'specialist': 'General Physician',
                    'confidence': 0.5,
                    'alternatives': [],
                    'model_type': 'fallback'
                }
            
            # Generate embedding
            embedding = self.embedding_model.encode([text])[0]
            
            # Get prediction with probabilities
            if hasattr(self.specialist_classifier, 'predict_proba'):
                proba = self.specialist_classifier.predict_proba([embedding])[0]
                
                # Get top 3 predictions
                top_indices = np.argsort(proba)[-3:][::-1]
                alternatives = []
                
                for idx in top_indices[1:]:  # Skip the top one
                    if proba[idx] > 0.05:  # Only show if >5% confidence
                        alternatives.append({
                            'specialist': self.specialist_classifier.classes_[idx],
                            'confidence': float(proba[idx])
                        })
                
                # Top prediction
                pred_idx = top_indices[0]
                confidence = float(proba[pred_idx])
                specialist = self.specialist_classifier.classes_[pred_idx]
                
                # Lower the threshold to 0.15 so we show actual predictions
                # If confidence is very low, it means symptoms are unclear
                if confidence < 0.15:
                    specialist = 'General Physician'
                    confidence = 0.5
                    alternatives = []
            else:
                specialist = self.specialist_classifier.predict([embedding])[0]
                confidence = 0.8
                alternatives = []
            
            return {
                'specialist': specialist,
                'confidence': confidence,
                'alternatives': alternatives,
                'model_type': 'legacy'
            }
        except Exception as e:
            print(f"Prediction error: {e}")
            return {
                'specialist': 'General Physician',
                'confidence': 0.5,
                'alternatives': [],
                'model_type': 'error'
            }
    
    def build_patient_index(self, patient_id: int):
        """
        Build or update FAISS index for a patient's medical records.
        """
        if not self.embedding_model:
            raise Exception("Embedding model not loaded")
        
        patient = Patient.objects.get(id=patient_id)
        
        # Collect all documents
        documents = []
        metadata = []
        
        # Labs
        for lab in patient.lab_results.all():
            text = f"{lab.title}. {lab.summary}"
            documents.append(text)
            metadata.append({
                'type': 'lab_result',
                'id': lab.id,
                'patient_id': patient_id
            })
        
        # Prescriptions
        for rx in patient.prescriptions.all():
            items_text = ', '.join([f"{item.get('drug', '')} {item.get('dosage', '')}" 
                                   for item in rx.items])
            text = f"Prescription: {items_text}. {rx.notes}"
            documents.append(text)
            metadata.append({
                'type': 'prescription',
                'id': rx.id,
                'patient_id': patient_id
            })
        
        # Encounters
        for enc in patient.encounters.all():
            text = f"Encounter notes: {enc.notes}. Diagnosis: {enc.diagnosis}. Plan: {enc.plan}"
            documents.append(text)
            metadata.append({
                'type': 'encounter',
                'id': enc.id,
                'patient_id': patient_id
            })
        
        if not documents:
            return
        
        # Generate embeddings
        embeddings = self.embedding_model.encode(documents)
        
        # Initialize or update FAISS index
        if self.faiss_index is None:
            dimension = embeddings.shape[1]
            self.faiss_index = faiss.IndexFlatL2(dimension)
        
        # Add to index
        start_idx = self.faiss_index.ntotal
        self.faiss_index.add(embeddings.astype('float32'))
        
        # Save metadata to database
        for i, meta in enumerate(metadata):
            EmbeddingMeta.objects.update_or_create(
                owner_type=meta['type'],
                owner_id=meta['id'],
                defaults={
                    'vector_dim': embeddings.shape[1],
                    'meta': meta
                }
            )
        
        # Save FAISS index to disk
        os.makedirs(os.path.dirname(settings.FAISS_INDEX_PATH), exist_ok=True)
        faiss.write_index(self.faiss_index, str(settings.FAISS_INDEX_PATH))
    
    def summarize_patient(self, patient_id: int, top_k: int = 10) -> Dict:
        """
        Generate extractive summary of patient's medical records.
        """
        if not self.embedding_model or not self.faiss_index:
            return {
                'bullets': ['No summary available - index not built'],
                'citations': []
            }
        
        try:
            # Query for general medical summary
            query = "latest medical history summary diagnosis treatment"
            query_embedding = self.embedding_model.encode([query])[0]
            
            # Search FAISS index
            distances, indices = self.faiss_index.search(
                query_embedding.reshape(1, -1).astype('float32'), 
                min(top_k, self.faiss_index.ntotal)
            )
            
            # Retrieve documents
            patient = Patient.objects.get(id=patient_id)
            retrieved_docs = []
            citations = []
            
            for idx in indices[0]:
                if idx < 0:
                    continue
                
                # Find metadata by index order
                meta_objs = EmbeddingMeta.objects.filter(
                    meta__patient_id=patient_id
                ).order_by('id')
                
                if idx < len(meta_objs):
                    meta_obj = list(meta_objs)[idx]
                    
                    # Retrieve actual document
                    if meta_obj.owner_type == 'lab_result':
                        lab = LabResult.objects.get(id=meta_obj.owner_id)
                        retrieved_docs.append(f"{lab.title}. {lab.summary}")
                        citations.append({'type': 'lab', 'id': lab.id})
                    elif meta_obj.owner_type == 'prescription':
                        rx = Prescription.objects.get(id=meta_obj.owner_id)
                        retrieved_docs.append(f"Prescription: {rx.notes}")
                        citations.append({'type': 'prescription', 'id': rx.id})
                    elif meta_obj.owner_type == 'encounter':
                        enc = Encounter.objects.get(id=meta_obj.owner_id)
                        retrieved_docs.append(enc.notes)
                        citations.append({'type': 'encounter', 'id': enc.id})
            
            # Apply TextRank summarization
            full_text = ' '.join(retrieved_docs)
            bullets = self._extractive_summary(full_text, sentence_count=7)
            
            # Save summary
            AISummary.objects.create(
                patient=patient,
                source_ids=[c['id'] for c in citations],
                text='\n'.join(bullets),
                method='textrank',
                citations=citations
            )
            
            return {
                'bullets': bullets,
                'citations': citations
            }
        
        except Exception as e:
            print(f"Summarization error: {e}")
            return {
                'bullets': [f'Error generating summary: {str(e)}'],
                'citations': []
            }
    
    def _extractive_summary(self, text: str, sentence_count: int = 5) -> List[str]:
        """Generate extractive summary using TextRank."""
        if not text.strip():
            return []
        
        try:
            parser = PlaintextParser.from_string(text, Tokenizer("english"))
            summarizer = TextRankSummarizer()
            summary_sentences = summarizer(parser.document, sentence_count)
            
            return [str(sent) for sent in summary_sentences]
        except Exception as e:
            print(f"TextRank error: {e}")
            # Fallback: return first few sentences
            sentences = text.split('.')[:sentence_count]
            return [s.strip() + '.' for s in sentences if s.strip()]

    def _is_noise(self, text: str) -> bool:
        """Strictly verify if a piece of text is OCR noise or non-medical info."""
        if not text or len(text.strip()) < 5:
            return True
        
        # Check against blacklist patterns
        for pattern in self.SUMMARY_BLACKLIST:
            if re.search(pattern, text, re.IGNORECASE):
                return True
                
        # If it's just numbers and punctuation, it's noise
        if re.search(r'^[0-9\W]+$', text.strip()):
            return True
            
        return False

    def _has_medical_context(self, text: str) -> bool:
        """Holistically determine if a block of text has legitimate medical relevance."""
        if not text:
            return False
            
        # 1. Check for medical keywords
        for keyword in self.MEDICAL_KEYWORDS:
            if re.search(keyword, text, re.IGNORECASE):
                return True
                
        # 2. Check for numeric values with units (common in vitals/labs)
        if re.search(r'\d+(\.\d+)?\s*(mg|ml|kg|lb|bpm|c|f|%|g/dl|mmol/l)', text, re.IGNORECASE):
            return True
            
        # 3. Check for specific medical formatting like BP (120/80)
        if re.search(r'\d{2,3}\s*/\s*\d{2,3}', text):
            return True
            
        return False

    def _analyze_condition(self, condition_text: str) -> Dict:
        """
        Intelligently estimate severity and status of a medical condition from context.
        Uses clinical-style logic based on modifiers and descriptions.

        Clinical Standard Mapping:
        - Critical: Life-threatening or requiring immediate ICU-level monitoring.
        - Severe: Uncontrolled, advanced stage, or significantly impacting organ function.
        - Moderate: Symptomatic but stable, requiring regular monitoring/medication.
        - Mild: Well-controlled, early-stage, or minor impact.
        - Normal: Physiological findings within reference ranges or resolved issues.
        """
        text = condition_text.lower()

        # 1. Severity Logic (Clinical Modifier Priority)
        severity = 'moderate' # Clinical default

        # Priority 1: Critical / Life-threatening
        critical_markers = [
            'critical', 'emergency', 'acute respiratory distress', 'malignant', 
            'severe sepsis', 'life-threatening', 'instability', 'impending'
        ]

        # Priority 2: Severe / Advanced
        severe_markers = [
            'severe', 'uncontrolled', 'chronic stage 4', 'chronic stage 5', 
            'advanced', 'decompensated', 'high risk', 'grade 3', 'grade 4',
            'worsening', 'end-stage'
        ]

        # Priority 3: Mild / Stable
        mild_markers = [
            'mild', 'controlled', 'stable', 'minor', 'borderline', 
            'improving', 'early stage', 'well-controlled', 'grade 1'
        ]

        # Priority 4: Normal / Resolved
        normal_markers = [
            'normal', 'resolved', 'negative', 'within normal limits', 
            'non-specific', 'unremarkable', 'asymptomatic'
        ]

        if any(m in text for m in critical_markers):
            severity = 'critical'
        elif any(m in text for m in severe_markers):
            severity = 'severe'
        elif any(m in text for m in normal_markers):
            severity = 'normal'
        elif any(m in text for m in mild_markers):
            severity = 'mild'

        # 2. Status Logic (Longitudinal State)
        status = 'active' # Default
        managed_markers = [
            'controlled', 'managed', 'on medication', 'stable', 'improving', 
            'resolved', 'history of', 'maintenance', 'prophylaxis'
        ]
        recurrent_markers = ['recurrent', 'intermittent', 'episodic', 'chronic']

        if 'resolved' in text or 'negative' in text:
            status = 'resolved'
        elif any(m in text for m in managed_markers):
            status = 'managed'
        elif any(m in text for m in recurrent_markers):
            status = 'chronic'

        # 3. Name Cleanup (Removing clinical metadata noise)
        name = condition_text
        name = re.sub(r'Medication noted:', '', name, flags=re.I).strip()
        name = re.sub(r'Medication:', '', name, flags=re.I).strip()
        # Remove common severity words from the name itself for cleaner UI
        clean_name = re.sub(r'\b(mild|moderate|severe|critical|stable|uncontrolled|chronic)\b', '', name, flags=re.I).strip()
        # Capitalize and remove redundant spaces/punctuation
        clean_name = clean_name.strip(',. ').capitalize()

        return {
            'name': clean_name or name, # Fallback to original if cleanup was too aggressive
            'severity': severity,
            'status': status,
            'diagnosed_date': timezone.now().isoformat()
        }

    def _analyze_medication(self, med_text: str, record_date: datetime = None) -> Dict:
        """
        Intelligently infer medication status and expiration based on clinical standards.
        Doctors don't write 'active', so we infer it from date, duration, and keywords.
        """
        text = med_text.lower()
        if not record_date:
            record_date = timezone.now()

        # 1. Infer Duration (Clinical Standard Estimation)
        # Default durations based on typical treatment cycles
        duration_days = 30 # Standard default

        # Acute/Short-term patterns
        short_term_match = re.search(r'(\d+)\s*(?:days|day|hrs|hours)', text)
        if short_term_match:
            duration_days = int(short_term_match.group(1))
        elif any(k in text for k in ('antibiotic', 'infection', 'acute', 'pain', 'sos', 'short term')):
            duration_days = 10 # Acute course

        # Chronic/Maintenance patterns
        elif any(k in text for k in ('daily', 'maintenance', 'chronic', 'long-term', 'od', 'bd', 'tds', 'qid')):
            duration_days = 90 # Standard chronic refill cycle

        # 2. Calculate Expiration
        expires_at = record_date + timedelta(days=duration_days)

        # 3. Determine Status
        status = 'active'
        if expires_at < timezone.now():
            status = 'completed'

        # Keyword-based overrides
        if any(k in text for k in ('stop', 'discontinue', 'ceased', 'discontinued')):
            status = 'discontinued'
        elif any(k in text for k in ('hold', 'suspend', 'on hold')):
            status = 'on_hold'
        elif any(k in text for k in ('finish', 'completed the course', 'finished')):
            status = 'completed'

        # 4. Cleanup Name
        name = med_text
        # Strip common clinical prefixes
        name = re.sub(r'^(?:Medication:|Tab|Cap|Syr|Inj|Prescribed|Take)[\.\s:]*', '', name, flags=re.I).strip()
        # Extract drug name before dosage/instructions if possible
        name_match = re.search(r'^([^0-9,;]+)', name)
        if name_match:
            name = name_match.group(1).strip()

        return {
            'name': name.capitalize(),
            'status': status,
            'dosage': '', # Placeholder for specific extractor
            'frequency': '',
            'expires_at': expires_at.isoformat(),
            'is_active': status == 'active'
        }

    def _build_professional_summary(self, corpus: str) -> Tuple[str, List[str]]:
        """
        Turn raw OCR/corpus into a clean, professional narrative and short key findings.
        Strips metadata, extracts conditions/syndromes/vaccination, returns meaningful summary.
        """
        # Split corpus by headers like [2023-01-01] [file:12]
        header_pattern = r'\[\d{4}-\d{2}-\d{2}\]\s*\[([a-z]+):(\d+)\]'
        parts = re.split(header_pattern, corpus)
        
        findings = []
        seen = set()

        def add_finding(s: str, source_tag: str, max_len: int = 100):
            s = s.strip()
            if self._is_noise(s) or len(s) > 200:
                return
            s = s[:max_len].strip()
            key = s.lower()[:80]
            if key not in seen:
                seen.add(key)
                if source_tag:
                    s = f"{s} {source_tag}"
                findings.append(s)

        phrase_checks = [
            (r'mild\s+asthma.*?controlled.*?medication', 'Mild asthma, controlled with medication'),
            (r'asthma.*?controlled', 'Asthma, controlled with medication'),
            (r'occasional\s+migraine.*?stress', 'Occasional migraines, triggered by stress'),
            (r'migraine', 'Migraines noted'),
            (r'hypertension.*?lifestyle', 'Hypertension, managed with lifestyle changes'),
            (r'hypertension', 'Hypertension'),
            (r'diabetes', 'Diabetes'),
            (r'cardiac', 'Cardiac condition noted'),
            (r'cholesterol', 'Elevated cholesterol mentioned'),
        ]

        if len(parts) == 1:
            # No structured headers found, fallback
            raw_text = corpus
            raw_text = re.sub(r'\[\d{4}-\d{2}-\d{2}\]\s*\[\w+\]\s*Document:[^\n]+', ' ', raw_text)
            raw_text = re.sub(r'Content from image:\s*', ' ', raw_text)
            raw_text = re.sub(r'\(\d{3}\)\s*\d{3}[-\s]?\d{4}', ' ', raw_text)
            raw_text = re.sub(r'\d{3}[-.\s]?\d{3}[-.\s]?\d{4}', ' ', raw_text)
            raw_text = re.sub(r'[\w.-]+@[\w.-]+\.\w+', ' ', raw_text)
            raw_text = re.sub(r'www\.\S+', ' ', raw_text)
            raw_text = ' '.join(raw_text.split())
            
            for pat, phrase in phrase_checks:
                if re.search(pat, raw_text, re.IGNORECASE):
                    add_finding(phrase, "")
                    
            med_matches = re.findall(r'(?:Tab|Cap|Syr|Inj)[\.\s:]*([A-Z][a-z]+(?:\s+[0-9]+m?g)?)', raw_text)
            for med in med_matches:
                if len(med) > 3 and not self._is_noise(med):
                    add_finding(f"Medication: {med}", "")
                    
            m = re.search(r'(?:diagnosis|history|problems)[^:]*:\s*([^.]{10,120})', raw_text, re.IGNORECASE)
            if m:
                g = re.sub(r'\s+', ' ', m.group(1)).strip()
                if any(k in g.lower() for k in ('stable', 'pain', 'severe', 'mild', 'chronic', 'acute', 'managed')):
                    add_finding(g[:100], "")
                    
            if re.search(r'not\s+immune|NOT\s+IMMUNE', raw_text, re.IGNORECASE):
                if re.search(r'measles', raw_text, re.IGNORECASE):
                    add_finding('Measles: not immune', "")
                if re.search(r'varicella|chicken\s*pox', raw_text, re.IGNORECASE):
                    add_finding('Chicken pox (Varicella): not immune', "")
                if re.search(r'hepatitis\s*B.*no|vaccination.*no', raw_text, re.IGNORECASE):
                    add_finding('Hepatitis B vaccination: no', "")
                    
            for part in re.split(r'[.;\n]', raw_text):
                part = part.strip()
                if 15 < len(part) < 120:
                    if any(k in part.lower() for k in ('asthma', 'migraine', 'hypertension', 'medication', 'controlled', 'managed', 'stress', 'vaccination', 'immune', 'test result')):
                        add_finding(part, "", 90)
        else:
            for i in range(1, len(parts), 3):
                typ = parts[i]
                item_id = parts[i+1]
                block_text = parts[i+2]
                
                source_tag = f"[file:{item_id}]" if typ == 'file' else ""
                
                block_text = re.sub(r'Medical Document \([^\)]+\):\s*', ' ', block_text)
                block_text = re.sub(r'Content from image:\s*', ' ', block_text)
                block_text = re.sub(r'\(\d{3}\)\s*\d{3}[-\s]?\d{4}', ' ', block_text)
                block_text = re.sub(r'\d{3}[-.\s]?\d{3}[-.\s]?\d{4}', ' ', block_text)
                block_text = re.sub(r'[\w.-]+@[\w.-]+\.\w+', ' ', block_text)
                block_text = re.sub(r'www\.\S+', ' ', block_text)
                block_text = ' '.join(block_text.split())
                
                for pat, phrase in phrase_checks:
                    if re.search(pat, block_text, re.IGNORECASE):
                        add_finding(phrase, source_tag)
                
                med_matches = re.findall(r'(?:Tab|Cap|Syr|Inj)[\.\s:]*([A-Z][a-z]+(?:\s+[0-9]+m?g)?)', block_text)
                for med in med_matches:
                    if len(med) > 3 and not self._is_noise(med):
                        add_finding(f"Medication: {med}", source_tag)
                        
                m = re.search(r'(?:diagnosis|history|problems)[^:]*:\s*([^.]{10,120})', block_text, re.IGNORECASE)
                if m:
                    g = re.sub(r'\s+', ' ', m.group(1)).strip()
                    if any(k in g.lower() for k in ('stable', 'pain', 'severe', 'mild', 'chronic', 'acute', 'managed')):
                        add_finding(g[:100], source_tag)
                        
                if re.search(r'not\s+immune|NOT\s+IMMUNE', block_text, re.IGNORECASE):
                    if re.search(r'measles', block_text, re.IGNORECASE):
                        add_finding('Measles: not immune', source_tag)
                    if re.search(r'varicella|chicken\s*pox', block_text, re.IGNORECASE):
                        add_finding('Chicken pox (Varicella): not immune', source_tag)
                    if re.search(r'hepatitis\s*B.*no|vaccination.*no', block_text, re.IGNORECASE):
                        add_finding('Hepatitis B vaccination: no', source_tag)

                for part in re.split(r'[.;\n]', block_text):
                    part = part.strip()
                    if 15 < len(part) < 120:
                        if any(k in part.lower() for k in ('asthma', 'migraine', 'hypertension', 'medication', 'controlled', 'managed', 'stress', 'vaccination', 'immune', 'test result')):
                            add_finding(part, source_tag, 90)

        # Dedupe and limit
        clean_findings = []
        for f in findings[:14]:
            if f not in clean_findings:
                clean_findings.append(f)

        # Build short narrative
        n = (len(parts) - 1) // 3 if len(parts) > 1 else max(1, len(re.findall(r'\[\d{4}-\d{2}-\d{2}\]', corpus)))
        n = max(n, 1)
        record_word = 'record' if n == 1 else 'records'
        
        if clean_findings:
            narrative = f"Based on {n} medical {record_word}. Key findings: {clean_findings[0]}"
            if len(clean_findings) > 1:
                narrative += f"; {clean_findings[1]}"
            if len(clean_findings) > 2:
                narrative += f". Also noted: {', '.join(clean_findings[2:5])}."
            else:
                narrative += "."
        else:
            bullets = self._extractive_summary(corpus, sentence_count=2)
            filtered_bullets = [re.sub(r'\[\d{4}-\d{2}-\d{2}\]\s*\[[a-z]+:\d+\]', '', b).strip() for b in bullets if not self._is_noise(b)]
            if filtered_bullets:
                narrative = f"Based on {n} medical {record_word}. Summary: {' '.join(filtered_bullets)}"
            else:
                narrative = f"Based on {n} medical {record_word}. Medical records reviewed; see specific documents for detailed history."
        
        return narrative, clean_findings
    
    def summarize_text(self, text: str) -> Dict:
        """
        Generate summary from arbitrary medical text.
        Uses TextRank for extractive summarization and spaCy for entity extraction.
        """
        if not text.strip():
            return {
                'summary': '',
                'key_points': [],
                'entities': {}
            }
        
        try:
            # Generate extractive summary
            summary_sentences = self._extractive_summary(text, sentence_count=3)
            summary = ' '.join(summary_sentences)
            
            # Extract key points (top 5 sentences)
            key_points = self._extractive_summary(text, sentence_count=5)
            
            # Extract medical entities using spaCy
            entities = {}
            if self.spacy_model:
                doc = self.spacy_model(text)
                for ent in doc.ents:
                    entity_type = ent.label_
                    if entity_type not in entities:
                        entities[entity_type] = []
                    if ent.text not in entities[entity_type]:
                        entities[entity_type].append(ent.text)
            
            # Try to extract conditions and medications using simple patterns
            conditions = []
            medications = []
            
            # Simple pattern matching for common medical terms
            condition_keywords = ['diagnosed with', 'suffering from', 'condition', 'disease', 'disorder', 'syndrome']
            medication_keywords = ['prescribed', 'medication', 'drug', 'tablet', 'capsule', 'mg', 'ml']
            
            sentences = text.split('.')
            for sent in sentences:
                sent_lower = sent.lower()
                if any(keyword in sent_lower for keyword in condition_keywords):
                    # Extract potential condition
                    words = sent.strip().split()
                    if len(words) > 2:
                        conditions.append(sent.strip())
                
                if any(keyword in sent_lower for keyword in medication_keywords):
                    # Extract potential medication
                    words = sent.strip().split()
                    if len(words) > 2:
                        medications.append(sent.strip())
            
            return {
                'summary': summary,
                'key_points': key_points[:5],
                'entities': entities,
                'conditions': conditions[:5],
                'medications': medications[:5]
            }
        
        except Exception as e:
            print(f"Text summarization error: {e}")
            return {
                'summary': text[:200] + '...' if len(text) > 200 else text,
                'key_points': [text[:100] + '...' if len(text) > 100 else text],
                'entities': {},
                'conditions': [],
                'medications': []
            }

    def get_recent_records_corpus(self, patient_id: int, max_items: int = 80,
                                   max_days: int = 365, file_ids: List[int] = None) -> Tuple[str, Dict]:
        """
        Aggregate all medical records for a patient (most recent by date), build a single text corpus.
        Returns (corpus_text, meta) with meta: source_counts, date_range, record_count.
        """
        patient = Patient.objects.get(id=patient_id)
        cutoff = timezone.now() - timedelta(days=max_days)

        # Collect (timestamp, type, text) for unified sorting
        items = []

        for lab in patient.lab_results.filter(ts__gte=cutoff).order_by('-ts')[:max_items]:
            text = f"Lab: {lab.title}. {lab.summary or ''}"
            if lab.data:
                text += " " + " ".join(f"{k}: {v}" for k, v in list(lab.data.items())[:10])
            items.append((lab.ts, 'lab', lab.id, text))

        for rx in patient.prescriptions.filter(ts__gte=cutoff).order_by('-ts')[:max_items]:
            parts = ["Prescription:"]
            for item in (rx.items or [])[:15]:
                if isinstance(item, dict):
                    parts.append(
                        f"{item.get('drug', '')} {item.get('dosage', '')} "
                        f"{item.get('duration', '')} {item.get('instructions', '')}"
                    )
                else:
                    parts.append(str(item))
            parts.append(rx.notes or "")
            items.append((rx.ts, 'prescription', rx.id, " ".join(parts)))

        for enc in patient.encounters.filter(ts__gte=cutoff).order_by('-ts')[:max_items]:
            text = f"Encounter: {enc.notes}. Diagnosis: {enc.diagnosis}. Plan: {enc.plan}"
            items.append((enc.ts, 'encounter', enc.id, text))

        # Handle Files with customization support
        file_qs = patient.files.all()
        if file_ids is not None:
            # If explicit IDs provided, use them and ignore date filters
            file_qs = file_qs.filter(id__in=file_ids)
        else:
            # DEFAULT LOGIC: Latest 5 documents within 3 months, prioritized by clinical_date
            three_months_ago = timezone.now().date() - timedelta(days=90)
            
            # Prioritize clinical_date, fall back to created_at
            # We filter clinical_date >= three_months_ago
            file_qs = file_qs.filter(
                models.Q(clinical_date__gte=three_months_ago) | 
                models.Q(clinical_date__isnull=True, created_at__gte=three_months_ago)
            ).order_by('-clinical_date', '-created_at')[:5]

        for f in file_qs:
            extracted = get_or_extract_file_text(f)
            
            # Quietly skip documents that have NO medical context or are pure noise
            # unless they were explicitly labeled as labs/prescriptions by the user
            if f.kind == 'other' and not self._has_medical_context(extracted):
                print(f"[RELEVANCE] Skipping non-medical file: {f.filename}")
                continue
                
            # Include files even if text extraction fails (e.g. OCR not working)
            if not extracted or not extracted.strip():
                if f.kind == 'other' and file_ids is None:
                    continue # Skip empty generic uploads if not explicitly selected
                extracted = "[Medical document uploaded; content extraction not available.]"
            
            text = f"Medical Document ({f.get_kind_display()}): {extracted[:1000]}"
            # Use clinical_date for sorting if available
            sort_ts = f.clinical_date if f.clinical_date else f.created_at
            
            # Ensure sort_ts is a datetime object (never a date) to avoid TypeError in sorting
            if isinstance(sort_ts, (datetime, timezone.datetime)):
                pass
            elif hasattr(sort_ts, 'year'): # It's likely a date object
                sort_ts = timezone.make_aware(datetime.combine(sort_ts, datetime.min.time()))
            
            items.append((sort_ts, 'file', f.id, text))

        # Sort by date descending (most recent first), then take up to max_items
        items.sort(key=lambda x: x[0], reverse=True)
        items = items[:max_items]

        sections = []
        source_counts = {'lab': 0, 'prescription': 0, 'encounter': 0, 'file': 0}
        for ts, typ, item_id, text in items:
            source_counts[typ] = source_counts.get(typ, 0) + 1
            date_str = ts.strftime('%Y-%m-%d') if hasattr(ts, 'strftime') else str(ts)
            sections.append(f"[{date_str}] [{typ}:{item_id}] {text}")

        corpus = "\n".join(sections)
        date_range = {}
        if items:
            date_range = {
                'oldest': min(x[0] for x in items).isoformat() if hasattr(items[-1][0], 'isoformat') else str(items[-1][0]),
                'newest': max(x[0] for x in items).isoformat() if hasattr(items[0][0], 'isoformat') else str(items[0][0]),
            }
        
        selected_source_ids = [item[2] for item in items if item[1] == 'file']

        return corpus, {
            'source_counts': source_counts,
            'date_range': date_range,
            'record_count': len(items),
            'selected_source_ids': selected_source_ids,
        }

    def generate_health_summary_from_records(self, patient_id: int,
                                             max_items: int = 80,
                                             max_days: int = 365,
                                             file_ids: List[int] = None) -> Dict:
        """
        Generate AI health summary from records.
        Supports custom document selection via file_ids.
        """
        corpus, meta = self.get_recent_records_corpus(
            patient_id, max_items=max_items, max_days=max_days, file_ids=file_ids
        )
        if not corpus.strip():
            return {
                'summary': 'No recent medical records found. Upload lab results, prescriptions, or encounter notes to get an AI-generated health summary.',
                'bullets': [],
                'record_highlights': [],
                'insights': ['Add medical records to see personalized insights.'],
                'conditions': [],
                'medications': [],
                'source_counts': meta['source_counts'],
                'date_range': meta['date_range'],
                'record_count': 0,
            }

        # Extractive summary (TextRank) – medical-domain friendly
        # Aggressively filter bullets for noise
        raw_bullets = self._extractive_summary(corpus, sentence_count=8)
        bullets = [b for b in raw_bullets if not self._is_noise(b) and len(b.strip()) > 15]
        
        if not bullets and corpus.strip():
            # Fallback: use meaningful lines that aren't noise
            lines = [s.strip() for s in corpus.split('\n') if not self._is_noise(s) and len(s.strip()) > 30][:10]
            bullets = lines
            
        summary = ' '.join(bullets) if bullets else "Medical records reviewed; see specific documents for details."

        # Entity extraction (spaCy NER; medical models can be plugged here)
        manual_medications = []
        entities_map = {}

        if self.remote_url:
            # REMOTE BRAIN NER (Offload heavy work)
            remote_ner = self._call_remote_brain('analyze', {'text': corpus})
            for ent in remote_ner.get('entities', []):
                label = ent['label']
                if label not in entities_map:
                    entities_map[label] = []
                if ent['text'] not in entities_map[label]:
                    if not self._is_noise(ent['text']):
                        entities_map[label].append(ent['text'])
        elif self.spacy_model:
            # Local fallback
            doc = self.spacy_model(corpus)
            for ent in doc.ents:
                label = ent.label_
                if label not in entities_map:
                    entities_map[label] = []
                if ent.text not in entities_map[label]:
                    # Filter entities too
                    if not self._is_noise(ent.text):
                        entities_map[label].append(ent.text)
        
        # Map common labels to medications
        for label, vals in entities_map.items():
            if label in ('DRUG', 'MEDICATION', 'CHEMICAL', 'PRODUCT'):
                manual_medications.extend(vals[:15])

        # Extract vitals (Blood pressure, heart rate, temperature, weight)
        import re
        vitals = {
            'blood_pressure': 'N/A',
            'heart_rate': 'N/A',
            'temperature': 'N/A',
            'weight': 'N/A',
        }
        
        bp_match = re.search(r'(?:blood\s*pressure|BP)[\s:]*([\d]{2,3}\s*/\s*[\d]{2,3})', corpus, re.IGNORECASE)
        if bp_match:
            vitals['blood_pressure'] = bp_match.group(1).replace(' ', '')
            
        hr_match = re.search(r'(?:heart\s*rate|HR|pulse)[\s:]*([\d]{2,3})(?:\s*bpm)?', corpus, re.IGNORECASE)
        if hr_match:
            vitals['heart_rate'] = hr_match.group(1)
            
        temp_match = re.search(r'(?:temperature|temp|T)[\s:]*([\d]{2,3}(?:\.[\d])?)(?:\s*[FC])?', corpus, re.IGNORECASE)
        if temp_match:
            vitals['temperature'] = temp_match.group(1)
            
        weight_match = re.search(r'(?:weight|wt)[\s:]*([\d]{2,3}(?:\.[\d])?)(?:\s*(?:lbs|kg|pounds|kilograms))?', corpus, re.IGNORECASE)
        if weight_match:
            vitals['weight'] = weight_match.group(1)

        # Fallback: keyword-based extraction from corpus
        condition_keywords = (
            'diagnosis', 'diagnosed', 'condition', 'disease', 'disorder', 'syndrome',
            'lab', 'result', 'test', 'patient', 'treatment', 'symptom', 'note', 'finding'
        )
        medication_keywords = (
            'prescribed', 'drug', 'mg', 'tablet', 'capsule', 'medication', 'dose', 'dosage',
            'medicine', 'rx', 'pill', 'ml '
        )
        
        # Additional extraction only if not already found in structured professional findings
        manual_findings = []
        for sent in corpus.replace('\n', ' ').split('.'):
            s = sent.strip()
            if len(s) < 15 or self._is_noise(s):
                continue
            sent_lower = s.lower()
            if any(k in sent_lower for k in condition_keywords):
                manual_findings.append(s[:200])
            if any(k in sent_lower for k in medication_keywords):
                manual_medications.append(s[:200])
        
        # Professional summary: clean narrative + key findings (no raw OCR dump)
        professional_narrative = ''
        professional_findings = []
        try:
            professional_narrative, professional_findings = self._build_professional_summary(corpus)
        except Exception as e:
            print(f"Professional summary error: {e}")
        
        # CONVERT CONDITIONS TO OBJECTS WITH INTELLIGENT BADGES
        conditions_list = []
        raw_condition_sources = professional_findings if professional_findings else list(dict.fromkeys(manual_findings))[:10]
        
        for raw_cond in raw_condition_sources:
            conditions_list.append(self._analyze_condition(raw_cond))
            
        if professional_narrative:
            summary = professional_narrative

        # Prefer clean findings for highlights
        record_highlights = []
        if professional_findings:
            record_highlights = list(professional_findings)
        else:
            record_highlights = [b for b in bullets if not self._is_noise(b)]
            
        if not record_highlights and summary:
            record_highlights = [summary[:400]]
        record_highlights = record_highlights[:15]

        # Build short insights
        insights = []
        sc = meta['source_counts']
        if sc.get('lab'):
            insights.append(f"Based on {sc['lab']} recent lab result(s).")
        if sc.get('prescription'):
            insights.append(f"Based on {sc['prescription']} prescription(s) on file.")
        if sc.get('encounter'):
            insights.append(f"Based on {sc['encounter']} encounter note(s).")
        if sc.get('file'):
            insights.append(f"Based on {sc['file']} uploaded document(s).")
            
        # Add filtered findings to insights
        if professional_findings:
            insights.extend(professional_findings[:4])
        else:
            insights.extend([b for b in bullets if not self._is_noise(b)][:4])

        # Medications as objects WITH INTELLIGENT CLINICAL INFERENCE
        final_medications = []
        # Attempt to find the most recent record date for a better inference
        # The corpus is sorted descending, so the first date marker is the newest.
        ref_date = timezone.now()
        first_date_match = re.search(r'\[(\d{4}-\d{2}-\d{2})\]', corpus)
        if first_date_match:
            try:
                ref_date = timezone.make_aware(datetime.strptime(first_date_match.group(1), '%Y-%m-%d'))
            except Exception:
                pass

        for med in list(dict.fromkeys(manual_medications))[:12]:
            final_medications.append(self._analyze_medication(med, record_date=ref_date))

        return {
            'summary': summary,
            'bullets': bullets,
            'professional_summary': professional_narrative or summary,
            'professional_findings': professional_findings,
            'record_highlights': record_highlights,
            'insights': insights[:10],
            'conditions': conditions_list,
            'medications': final_medications,
            'entities': entities_map,
            'source_counts': meta['source_counts'],
            'date_range': meta['date_range'],
            'record_count': meta['record_count'],
            'extracted_vitals': vitals,
            'selected_source_ids': meta.get('selected_source_ids', []),
        }


# Global service instance
ai_service = AIService()

# ==========================================
# New Prescription Parser - RL and TrOCR 
# ==========================================
from datetime import timedelta
from django.utils import timezone
import io
import re

try:
    from apps.reminders.models import MedicationReminder
except ImportError:
    MedicationReminder = None

class PrescriptionParser:
    @staticmethod
    def parse_image(file_obj, patient):
        import requests
        import os
        import ast
        import re
        from datetime import timedelta
        from django.utils import timezone
        import dateutil.parser
        from django.conf import settings
        
        ngrok_url = getattr(settings, 'REMOTE_BRAIN_URL', None)
        if not ngrok_url:
            ngrok_url = os.environ.get("REMOTE_BRAIN_URL", "")
        
        ngrok_url = ngrok_url.rstrip('/') if ngrok_url else ""
        if ngrok_url:
            print(f"[AI Service] Using Remote Brain URL: {ngrok_url}")
        
        # ... (File sending and Colab execution)
        file_name = getattr(file_obj, 'name', 'prescription.jpg').lower()
        upload_file_obj = file_obj
        filename_to_send = 'prescription.jpg'

        remote_data = None
        if ngrok_url:
            print(f"[AI Service] Calling Remote Brain at: {ngrok_url}")
            if file_name.endswith('.pdf'):
                try:
                    import pypdfium2 as pdfium
                    import io
                    file_obj.seek(0)
                    pdf = pdfium.PdfDocument(file_obj)
                    page = pdf.get_page(0)  # Get first page
                    pil_image = page.render(scale=2).to_pil()
                    img_byte_arr = io.BytesIO()
                    pil_image.save(img_byte_arr, format='JPEG')
                    img_byte_arr.seek(0)
                    upload_file_obj = img_byte_arr
                except Exception as e:
                    print("PDF conversion failed:", str(e))
            else:
                file_obj.seek(0)

            try:
                files = {'file': (filename_to_send, upload_file_obj, 'application/octet-stream')}
                response = requests.post(f"{ngrok_url}/extract_prescription", files=files, timeout=60)
                if response.status_code == 200:
                    remote_data = response.json()
                else:
                    print(f"Colab Error {response.status_code}: {response.text}")
            except Exception as e:
                print("Failed to reach Colab:", str(e))
                pass
        else:
            print("[AI Service] REMOTE_BRAIN_URL not configured. Skipping remote processing.")

        raw_ocr = remote_data.get('raw_ocr', '') if remote_data else ""
        entities_str = remote_data.get('clinical_entities', '[]') if remote_data else "[]"
        
        try:
            entities = ast.literal_eval(entities_str)
        except:
            entities = []
            
        # VERY AGGRESSIVE DATE EXTRACTION
        extracted_date = None
        # Try finding standard numerical dates: DD-MM-YYYY, YYYY/MM/DD, DD.MM.YY etc
        date_pattern = r'(\d{1,2}[\./-]\d{1,2}[\./-]\d{2,4})'
        date_matches = re.findall(date_pattern, raw_ocr)
        if date_matches:
            for d in date_matches:
                try:
                    extracted_date = dateutil.parser.parse(d, fuzzy=True).date()
                    if extracted_date.year > 2000 and extracted_date.year < 2030:
                        break # Found a valid real date
                except:
                    pass
                
        # Try explicit worded dates 
        if not extracted_date:
            text_date_pattern = r'(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th|,)?[ 	]+\d{4}'
            text_matches = re.findall(text_date_pattern, raw_ocr, re.IGNORECASE)
            if text_matches:
                try:
                    extracted_date = dateutil.parser.parse(text_matches[0], fuzzy=True).date()
                except:
                    pass

        # If everything failed, only then use fallback
        if not extracted_date:
            extracted_date = timezone.now().date()
            
        # DOCTOR'S ADVICE EXTRACTION
        doctor_advice = None
        advice_match = re.search(r'(?:advise|advice|instruction(?:s)?|note|rx|c/o)\\s*[:\\-]*\\s*(.+?)(?=(?:\\n\\n|\\d+\\.|\\Z))', raw_ocr, re.IGNORECASE | re.DOTALL)
        if advice_match:
            doctor_advice = advice_match.group(1).strip()
            if len(doctor_advice) < 5 or len(doctor_advice) > 200:
                doctor_advice = None # Filtering noise

        # MEDICINES AND PURPOSES Dictionary
        med_dict = {
            "amoxicillin": "Antibiotic used to treat a wide variety of bacterial infections.",
            "ibuprofen": "NSAID used for reducing pain, swelling, and fever.",
            "paracetamol": "Used to treat mild to moderate pain and reduce fever.",
            "napa": "Used to treat mild to moderate pain and reduce fever.",
            "azithromycin": "Macrolide antibiotic used to treat bacterial infections.",
            "omeprazole": "Proton pump inhibitor that decreases stomach acid (GERD, Ulcers).",
            "pantoprazole": "Proton pump inhibitor used to treat stomach and esophagus problems.",
            "metformin": "Improves blood sugar levels in people with Type 2 diabetes.",
            "cetirizine": "Antihistamine used to relieve allergy symptoms.",
            "fexofenadine": "Antihistamine used to relieve allergy symptoms without causing sleepiness."
        }

        medicines = []
        current_med = {}
        
        for ent in entities:
            if isinstance(ent, dict):
                entity_group = ent.get('entity_group', '')
                word = ent.get('word', '').replace('##', '')
                
                if 'treatment' in entity_group.lower() or 'problem' in entity_group.lower():
                    if current_med.get('drug_name'):
                        medicines.append(current_med)
                    
                    found_purpose = "Prescribed for symptomatic relief and treatment as per doctor's clinical assessment."
                    for key, val in med_dict.items():
                        if key.lower() in word.lower():
                            found_purpose = val
                            break

                    current_med = {"drug_name": word, "dosage": "?", "frequency": "?", "duration_days": 15, "purpose": found_purpose}
                elif 'test' in entity_group.lower() and current_med.get('drug_name'):
                    current_med['dosage'] = current_med.get('dosage', '') + ' ' + word

        if current_med.get('drug_name'):
            medicines.append(current_med)
            
        if not medicines and raw_ocr:
            words = raw_ocr.split()
            for i, w in enumerate(words):
                if w.lower() in ['tab', 'cap', 'syp', 'inj', 'mg', 'tablet']:
                    drug = words[i-1] if i > 0 else "Unknown"
                    if len(drug) > 2:
                        found_purpose = "Prescribed for symptomatic relief and treatment as per doctor's clinical assessment."
                        for key, val in med_dict.items():
                            if key.lower() in drug.lower():
                                found_purpose = val
                                break

                        medicines.append({
                            "drug_name": f"{drug} {w}", 
                            "dosage": "1 unit", 
                            "frequency": "BD", 
                            "duration_days": 15,
                            "purpose": found_purpose
                        })

        expires_at = extracted_date + timedelta(days=15)
        
        return {
            "extracted_date": extracted_date.isoformat(),
            "expires_at": expires_at.isoformat(),
            "medicines": medicines,
            "raw_ocr": raw_ocr,
            "clinical_entities": entities_str,
            "doctor_advice": doctor_advice
        }

    @staticmethod
    def create_reminders(prescription, medicines):
        """
        Creates device alarms (MedicationReminder) for 15 days (or extracted duration)
        """
        if not MedicationReminder:
            return
            
        for med in medicines:
            duration = med.get("duration_days", 15)
            end_date = timezone.now().date() + timedelta(days=duration)
            
            # Map frequency to times
            times = ["08:00"]
            freq = med.get("frequency", "").upper()
            if freq == "BD":
                times = ["08:00", "20:00"]
            elif freq == "TDS":
                times = ["08:00", "14:00", "20:00"]
            
            MedicationReminder.objects.create(
                patient=prescription.patient,
                prescription=prescription,
                drug_name=med.get("drug_name", ""),
                dosage=med.get("dosage", ""),
                frequency=freq,
                start_date=timezone.now().date(),
                end_date=end_date,
                scheduled_times=times,
                is_active=True
            )

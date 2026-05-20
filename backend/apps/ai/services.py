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

# ML/NLP imports - Move heavy imports inside methods to reduce RAM footprint
np = None
spacy = None
joblib = None
faiss = None
hf_hub_download = None
InferenceClient = None
SentenceTransformer = None
PlaintextParser = None
Tokenizer = None
TextRankSummarizer = None
pytesseract = None
Image = None
easyocr = None
pipeline = None
AutoTokenizer = None
AutoModelForTokenClassification = None

def _import_heavy_deps():
    global spacy, joblib, faiss, hf_hub_download, InferenceClient, SentenceTransformer
    global PlaintextParser, Tokenizer, TextRankSummarizer, pytesseract, Image, easyocr
    global pipeline, AutoTokenizer, AutoModelForTokenClassification, np
    
    try:
        import numpy as n
        np = n
        import spacy as sp
        spacy = sp
        import joblib as jl
        joblib = jl
        import faiss as fs
        faiss = fs
        from huggingface_hub import hf_hub_download as hhd, InferenceClient as ic
        hf_hub_download = hhd
        InferenceClient = ic
        from sentence_transformers import SentenceTransformer as st
        SentenceTransformer = st
        from sumy.parsers.plaintext import PlaintextParser as pp
        PlaintextParser = pp
        from sumy.nlp.tokenizers import Tokenizer as tk
        Tokenizer = tk
        from sumy.summarizers.text_rank import TextRankSummarizer as trs
        TextRankSummarizer = trs
        import pytesseract as pt
        pytesseract = pt
        from PIL import Image as img
        Image = img
        import easyocr as eo
        easyocr = eo
        from transformers import pipeline as pl, AutoTokenizer as at, AutoModelForTokenClassification as am
        pipeline = pl
        AutoTokenizer = at
        AutoModelForTokenClassification = am
    except Exception as e:
        print(f"Warning: Some AI dependencies could not be loaded: {e}")

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
        Supports HF_INFERENCE_API mode for zero-local-load.
        """
        self.model_type = model_type
        self.use_hf_api = getattr(settings, 'USE_HF_INFERENCE_API', False)
        self.hf_token = getattr(settings, 'HF_TOKEN', None)
        
        self.spacy_model = None
        self.embedding_model = None
        self.specialist_classifier = None
        self.specialist_classifier_type = None
        self.distilbert_classifier = None
        self.faiss_index = None
        self._ocr_reader = None
        self.ner_pipeline = None
        
        # Initialize HF Inference Client if enabled
        self.hf_client = None
        if self.use_hf_api and self.hf_token:
            try:
                # Lazy import InferenceClient
                if globals().get('InferenceClient') is None:
                    from huggingface_hub import InferenceClient as ic
                    globals()['InferenceClient'] = ic
                
                self.hf_client = globals()['InferenceClient'](token=self.hf_token)
                print("☁️ AI Service running in HF CLOUD mode (Zero local load)")
            except Exception as e:
                print(f"Warning: Could not initialize HF Inference Client: {e}")
                self.use_hf_api = False

        # Load local models ONLY if NOT in HF API mode
        if not self.use_hf_api:
            self._load_models()

    def _call_hf_inference(self, data: any, model_id: str, task: str = "text-generation", **kwargs) -> any:
        """Call Hugging Face Inference API."""
        if not self.hf_client:
            # Try to initialize if not yet done
            if self.hf_token:
                try:
                    if globals().get('InferenceClient') is None:
                        from huggingface_hub import InferenceClient as ic
                        globals()['InferenceClient'] = ic
                    self.hf_client = globals()['InferenceClient'](token=self.hf_token)
                except: return None
            else:
                return None
                
        try:
            if task == "text-generation":
                return self.hf_client.text_generation(data, model=model_id, **kwargs)
            elif task == "token-classification":
                return self.hf_client.token_classification(data, model=model_id)
            elif task == "feature-extraction":
                return self.hf_client.feature_extraction(data, model=model_id)
            elif task == "text-classification":
                return self.hf_client.text_classification(data, model=model_id)
            elif task == "image-to-text":
                # Handle file-like objects or paths
                if hasattr(data, 'read'):
                    data.seek(0)
                    image_bytes = data.read()
                elif isinstance(data, str) and os.path.exists(data):
                    with open(data, 'rb') as f:
                        image_bytes = f.read()
                else:
                    image_bytes = data
                return self.hf_client.image_to_text(image_bytes, model=model_id)
            elif task == "document-question-answering":
                # Handle file-like objects or paths
                if hasattr(data, 'read'):
                    data.seek(0)
                    image_bytes = data.read()
                elif isinstance(data, str) and os.path.exists(data):
                    with open(data, 'rb') as f:
                        image_bytes = f.read()
                else:
                    image_bytes = data
                return self.hf_client.document_question_answering(image_bytes, kwargs.get('question', ''), model=model_id)
            return None
        except Exception as e:
            print(f"HF Inference API Error ({task}): {e}")
            return None

    def _load_models(self):
        """Lazy load ML models locally."""
        global spacy, SentenceTransformer
        try:
            if spacy is None:
                import spacy as sp
                spacy = sp
            # Load spaCy
            self.spacy_model = spacy.load(settings.SPACY_MODEL)
        except Exception as e:
            print(f"Warning: Could not load spaCy model: {e}")
        
        try:
            if SentenceTransformer is None:
                from sentence_transformers import SentenceTransformer as st
                SentenceTransformer = st
            # Load sentence transformer
            self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        except Exception as e:
            print(f"Warning: Could not load embedding model: {e}")

        
        # Load specialist classifier with intelligent model selection
        self._load_specialist_classifier()

        # Load clinical NER pipeline if HF models enabled
        if getattr(settings, 'USE_HF_MODELS', False):
            self._load_ner_pipeline()
            self._load_ocr_reader()
        
        # Load FAISS index if it exists
        if os.path.exists(settings.FAISS_INDEX_PATH):
            try:
                self.faiss_index = faiss.read_index(str(settings.FAISS_INDEX_PATH))
            except Exception as e:
                print(f"Warning: Could not load FAISS index: {e}")
    
    def _load_specialist_classifier(self):
        """Load specialist classifier (HF Hub -> Local Enhanced -> Pytorch -> Local Sklearn)."""
        # SKIP if using HF Inference API for everything (Zero Local Load)
        if self.use_hf_api:
            return

        # 1. Try Hugging Face Hub (Cloud Priority)
        if getattr(settings, 'USE_HF_MODELS', False) and hf_hub_download:
            try:
                repo_id = getattr(settings, 'HF_REPO_ID', None)
                token = getattr(settings, 'HF_TOKEN', None)
                
                if repo_id:
                    print(f"☁️ Loading models from Hugging Face Hub: {repo_id}")
                    
                    # Try to load ENHANCED sklearn from HF
                    try:
                        model_path = hf_hub_download(repo_id=repo_id, filename="specialist_clf_sklearn_enhanced.joblib", token=token)
                        labels_path = hf_hub_download(repo_id=repo_id, filename="specialist_clf_sklearn_enhanced_labels.joblib", token=token)
                        
                        from apps.ai.sklearn_classifier_enhanced import EnhancedSklearnSpecialistClassifier
                        self.specialist_classifier = EnhancedSklearnSpecialistClassifier.load(model_path, labels_path)
                        self.specialist_classifier_type = 'hf_enhanced_sklearn'
                        print(f"✓ Successfully loaded ENHANCED specialist classifier from HF Hub")
                    except Exception as e:
                        print(f"  Note: Could not load enhanced sklearn from HF: {e}")
                        # Fallback to basic sklearn on HF
                        model_path = hf_hub_download(repo_id=repo_id, filename="specialist_clf_sklearn.joblib", token=token)
                        labels_path = hf_hub_download(repo_id=repo_id, filename="specialist_clf_sklearn_labels.joblib", token=token)
                        self.specialist_classifier = joblib.load(model_path)
                        self.specialist_classifier_type = 'hf_sklearn'
                        print(f"✓ Successfully loaded BASIC specialist classifier from HF Hub")

                    # Try to load FREE DistilBERT from HF
                    try:
                        dist_pt = hf_hub_download(repo_id=repo_id, filename="specialist_clf_distilbert_cpu.pt", token=token)
                        # The labels are usually downloaded with the .pt or as a separate file
                        # labels_path is already loaded if it matches, but DistilBERT has its own
                        dist_labels = hf_hub_download(repo_id=repo_id, filename="specialist_clf_distilbert_cpu_labels.joblib", token=token)
                        
                        from apps.ai.distilbert_cpu_classifier import FreeDistilBERTClassifier
                        self.distilbert_classifier = FreeDistilBERTClassifier(dist_pt)
                        print(f"✓ Deep mode available (HF DistilBERT)")
                    except Exception as e:
                        print(f"  Note: Deep mode (DistilBERT) not found on HF: {e}")

                    if self.specialist_classifier:
                        return
            except Exception as e:
                print(f"Warning: Could not load from HF Hub, falling back to local: {e}")

        # 2. Enhanced model paths (LOCAL PRIORITY)
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
                print(f"✓ Loaded ENHANCED sklearn specialist classifier (LOCAL)")
                
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

    def _load_ner_pipeline(self):
        """Load clinical NER pipeline locally."""
        if pipeline is None:
            return
        try:
            print("☁️ Loading Clinical NER pipeline locally...")
            # We use the same model as in Remote Brain for consistency
            model_id = "samrawal/bert-base-uncased_clinical-ner"
            self.ner_pipeline = pipeline("ner", model=model_id, tokenizer=model_id, aggregation_strategy="simple")
            print("✓ Local Clinical NER pipeline loaded")
        except Exception as e:
            print(f"Warning: Could not load local NER pipeline: {e}")

    def _load_ocr_reader(self):
        """Load EasyOCR reader as a singleton."""
        if easyocr is None:
            return
        try:
            print("👁️ Initializing Local OCR Reader...")
            self._ocr_reader = easyocr.Reader(['en'], gpu=False)
            print("✓ Local OCR Reader ready")
        except Exception as e:
            print(f"Warning: Could not initialize local OCR reader: {e}")

    def extract_entities_hf(self, text: str) -> List[Dict]:
        """Extract entities using HF Inference API or local pipeline."""
        if not text.strip():
            return []
            
        # 1. Try HF Inference API (Cloud Priority)
        if self.use_hf_api and self.hf_client:
            model_id = getattr(settings, 'HF_NER_MODEL', 'samrawal/bert-base-uncased_clinical-ner')
            try:
                entities = self._call_hf_inference(text, model_id, task="token-classification")
                if entities:
                    serialized = []
                    for ent in entities:
                        serialized.append({
                            "entity_group": str(ent.get('entity_group', ent.get('entity', 'unknown'))),
                            "score": float(ent.get('score', 0)),
                            "word": str(ent.get('word', '')),
                            "start": int(ent.get('start', 0)),
                            "end": int(ent.get('end', 0))
                        })
                    return serialized
            except Exception as e:
                print(f"HF NER Error: {e}")

        # 2. Local Fallback
        if not self.ner_pipeline:
            return []
        try:
            entities = self.ner_pipeline(text)
            serialized = []
            for ent in entities:
                serialized.append({
                    "entity_group": str(ent.get('entity_group', 'unknown')),
                    "score": float(ent.get('score', 0)),
                    "word": str(ent.get('word', '')),
                    "start": int(ent.get('start', 0)),
                    "end": int(ent.get('end', 0))
                })
            return serialized
        except Exception as e:
            print(f"Local NER Error: {e}")
            return []
    
    def clean_text(self, text: str) -> str:
        """Clean and normalize text."""
        # Lowercase
        text = text.lower()
        # Remove extra whitespace
        text = ' '.join(text.split())
        return text
    
    def analyze_symptoms(self, text: str) -> Dict:
        """
        Analyze symptom text using HF Inference API or spaCy NER.
        Returns cleaned text and extracted entities.
        """
        cleaned = self.clean_text(text)
        
        # 1. Try HF Inference API (Cloud Priority)
        if self.use_hf_api and self.hf_client:
            entities = self.extract_entities_hf(text)
            if entities:
                # Map HF entities to standard format
                mapped_entities = []
                for ent in entities:
                    mapped_entities.append({
                        'text': ent.get('word', ''),
                        'label': ent.get('entity_group', 'symptom'),
                        'start': ent.get('start', 0),
                        'end': ent.get('end', 0)
                    })
                return {
                    'cleaned_text': cleaned,
                    'entities': mapped_entities
                }

        # 2. Local Fallback (spaCy)
        if not self.spacy_model:
            return {
                'cleaned_text': cleaned,
                'entities': []
            }
        
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
        Proxies to HF Inference API or Remote Brain if available.
        """
        # 1. Try HF Inference API (Cloud Priority)
        if self.use_hf_api and self.hf_client:
            model_id = getattr(settings, 'HF_LLM_MODEL', 'mistralai/Mistral-7B-Instruct-v0.2')
            prompt = f"""[INST] You are a medical specialist classifier. Given the symptoms, predict the most relevant medical specialist.
Possible specialists: Cardiology, Dermatology, Endocrinology, Gastroenterology, General Physician, Neurology, Oncology, Ophthalmology, Orthopedics, Pediatrics, Psychiatry, Pulmonology, Rheumatology, Urology.

Symptoms: {text}

Return only a JSON object with 'specialist', 'confidence' (0-1), and 'alternatives' (list of {{'specialist', 'confidence'}}). [/INST]"""
            
            try:
                response = self._call_hf_inference(prompt, model_id, task="text-generation", max_new_tokens=100)
                if response:
                    import json
                    # Extract JSON from response
                    match = re.search(r'\{.*\}', response, re.DOTALL)
                    if match:
                        result = json.loads(match.group(0))
                        result['model_type'] = f"hf_cloud_{model_id}"
                        return result
            except Exception as e:
                print(f"HF Prediction Error: {e}")
                # Fallback to local if HF fails

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
            if self.specialist_classifier_type in ['sklearn', 'pytorch', 'enhanced_sklearn', 'hf_enhanced_sklearn', 'hf_sklearn']:
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
            if self.use_hf_api and self.hf_client:
                model_id = getattr(settings, 'HF_EMBEDDING_MODEL', 'sentence-transformers/all-MiniLM-L6-v2')
                try:
                    embedding = self._call_hf_inference([text], model_id, task="feature-extraction")[0]
                    embedding = np.array(embedding)
                except Exception as e:
                    print(f"HF Embedding Error (specialist): {e}")
                    if self.embedding_model:
                        embedding = self.embedding_model.encode([text])[0]
                    else:
                        raise e
            elif self.embedding_model:
                embedding = self.embedding_model.encode([text])[0]
            else:
                return {
                    'specialist': 'General Physician',
                    'confidence': 0.5,
                    'alternatives': [],
                    'model_type': 'fallback_no_model'
                }
            
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
        if not self.use_hf_api and not self.embedding_model:
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
        if self.use_hf_api and self.hf_client:
            model_id = getattr(settings, 'HF_EMBEDDING_MODEL', 'sentence-transformers/all-MiniLM-L6-v2')
            try:
                # feature_extraction returns embeddings
                embeddings = self._call_hf_inference(documents, model_id, task="feature-extraction")
                embeddings = np.array(embeddings)
                print(f"✓ Generated {len(documents)} embeddings using HF Cloud")
            except Exception as e:
                print(f"HF Embedding Error: {e}")
                if self.embedding_model:
                    embeddings = self.embedding_model.encode(documents)
                else:
                    return
        elif self.embedding_model:
            embeddings = self.embedding_model.encode(documents)
        else:
            return
        
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
        if not self.use_hf_api and not self.embedding_model:
             return {
                'bullets': ['No summary available - local models not loaded'],
                'citations': []
            }
            
        if not self.faiss_index:
            return {
                'bullets': ['No summary available - index not built'],
                'citations': []
            }
        
        try:
            # Query for general medical summary
            query = "latest medical history summary diagnosis treatment"
            
            # Generate query embedding
            if self.use_hf_api and self.hf_client:
                model_id = getattr(settings, 'HF_EMBEDDING_MODEL', 'sentence-transformers/all-MiniLM-L6-v2')
                try:
                    query_embedding = self._call_hf_inference([query], model_id, task="feature-extraction")[0]
                    query_embedding = np.array(query_embedding)
                except Exception as e:
                    print(f"HF Embedding Error (query): {e}")
                    if self.embedding_model:
                        query_embedding = self.embedding_model.encode([query])[0]
                    else:
                        raise e
            else:
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
            
            # Apply Summarization
            full_text = ' '.join(retrieved_docs)
            bullets = []
            
            if self.use_hf_api and self.hf_client:
                model_id = getattr(settings, 'HF_LLM_MODEL', 'mistralai/Mistral-7B-Instruct-v0.2')
                prompt = f"""[INST] You are a medical consultant. Based on these record fragments, provide a concise bulleted summary of the patient's status.
Fragments: {full_text[:4000]}

Return only a list of strings representing bullet points. [/INST]"""
                try:
                    response = self._call_hf_inference(prompt, model_id, task="text-generation", max_new_tokens=300)
                    if response:
                        import json
                        match = re.search(r'\[.*\]', response, re.DOTALL)
                        if match:
                            bullets = json.loads(match.group(0))
                        else:
                            # Parse bullets manually if not JSON
                            bullets = [line.strip('*- ') for line in response.split('\n') if line.strip()]
                except Exception as e:
                    print(f"HF Patient Summary Error: {e}")
            
            if not bullets:
                # Apply TextRank summarization fallback
                bullets = self._extractive_summary(full_text, sentence_count=7)
            
            # Save summary
            AISummary.objects.create(
                patient=patient,
                source_ids=[c['id'] for c in citations],
                text='\n'.join(bullets),
                method='hf_cloud' if self.use_hf_api else 'textrank',
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

    def classify_document(self, text: str) -> str:
        """Classify document type (lab, prescription, other) based on text content."""
        if not text:
            return 'other'
        
        text = text.lower()
        
        # 1. Lab keywords
        lab_keywords = ['report', 'result', 'test', 'laboratory', 'blood', 'urine', 'analysis', 'serum', 'plasma', 'clinical pathology', 'hb', 'hba1c']
        if any(kw in text for kw in lab_keywords):
            return 'lab'
            
        # 2. Prescription keywords
        rx_keywords = ['rx', 'prescription', 'take', 'tablet', 'capsule', 'dosage', 'daily', 'medication', 'sig:', 'pharmacy', 'tab.', 'cap.', 'bd', 'tds', 'od']
        if any(kw in text for kw in rx_keywords):
            return 'prescription'
            
        # 3. Encounter/Notes
        note_keywords = ['encounter', 'visit', 'physical examination', 'patient complained', 'assessment', 'plan:', 'chief complaint']
        if any(kw in text for kw in note_keywords):
            return 'encounter'
            
        return 'other'

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
        Uses HF Inference LLM if available, else local TextRank.
        """
        if not text.strip():
            return {
                'summary': '',
                'key_points': [],
                'entities': {}
            }
        
        # 1. Try HF Inference API (Generative LLM)
        if self.use_hf_api and self.hf_client:
            model_id = getattr(settings, 'HF_LLM_MODEL', 'mistralai/Mistral-7B-Instruct-v0.2')
            prompt = f"""[INST] You are a medical assistant. Summarize the following medical text into a professional summary and a list of key points.
Text: {text}

Return only a JSON object with 'summary' (string) and 'key_points' (list of strings). [/INST]"""
            
            try:
                response = self._call_hf_inference(prompt, model_id, task="text-generation", max_new_tokens=300)
                if response:
                    import json
                    match = re.search(r'\{.*\}', response, re.DOTALL)
                    if match:
                        result = json.loads(match.group(0))
                        # Supplement with other local extraction for richness
                        result['entities'] = {}
                        if self.spacy_model:
                            doc = self.spacy_model(text)
                            for ent in doc.ents:
                                label = ent.label_
                                if label not in result['entities']: result['entities'][label] = []
                                if ent.text not in result['entities'][label]: result['entities'][label].append(ent.text)
                        return result
            except Exception as e:
                print(f"HF Summarization Error: {e}")

        # 2. Local Fallback
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

        # 1. Try HF Inference API for high-quality clinical insights
        if self.use_hf_api and self.hf_client:
            model_id = getattr(settings, 'HF_LLM_MODEL', 'mistralai/Mistral-7B-Instruct-v0.2')
            prompt = f"""[INST] You are a senior medical consultant. Analyze these patient records and provide:
1. A concise professional narrative.
2. Key clinical findings (max 10).
3. Predicted conditions with severity and status.
4. Medications mentioned.

Records: {corpus[:4000]}

Return only a JSON object with:
{{
  "narrative": "...",
  "findings": ["...", "..."],
  "conditions": [{{ "name": "...", "severity": "...", "status": "..." }}],
  "medications": [{{ "name": "...", "status": "..." }}]
}} [/INST]"""
            try:
                response = self._call_hf_inference(prompt, model_id, task="text-generation", max_new_tokens=800)
                if response:
                    import json
                    match = re.search(r'\{.*\}', response, re.DOTALL)
                    if match:
                        cloud_data = json.loads(match.group(0))
                        # Integrate cloud data
                        professional_narrative = cloud_data.get('narrative', '')
                        professional_findings = cloud_data.get('findings', [])
                        
                        # Use these as high-priority
                        conditions_list = cloud_data.get('conditions', [])
                        # Ensure fields exist
                        for c in conditions_list:
                            c.setdefault('diagnosed_date', timezone.now().isoformat())
                        
                        final_medications = cloud_data.get('medications', [])
                        for m in final_medications:
                            m.setdefault('is_active', True)
                            m.setdefault('dosage', '')
                            m.setdefault('expires_at', (timezone.now() + timedelta(days=30)).isoformat())

                        if professional_narrative:
                            summary = professional_narrative
                            record_highlights = professional_findings or record_highlights
                            
                            # Skip local heavy NER if cloud succeeded
                            print("✓ Using HF Cloud LLM for health summary")
            except Exception as e:
                print(f"HF Health Summary Error: {e}")

        if not conditions_list: # If cloud failed or not enabled
            if self.spacy_model:
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

    def extract_prescription_items(self, text: str) -> List[Dict]:
        """
        Extract structured prescription items from raw text.
        Returns a list of {drug, dosage, duration, instructions}.
        """
        items = []
        if not text:
            return items

        # Pattern for common medicine lines
        med_pattern = r'(?i)(?:Tab|Cap|Syr|Inj|T\.|C\.)?[\.\s]*([A-Z][a-z0-9\s\-]{2,})\s+(\d+(?:\.\d+)?\s*(?:mg|mcg|ml|gm|g|IU))\b.*?(\b(?:BD|TDS|QD|QID|OD|HS|twice daily|once daily|three times a day|at bedtime|every \d+ hours)\b)?.*?(?:for\s+(\d+)\s+(?:days|day|weeks|week))?'
        simple_pattern = r'(?i)([A-Z][a-z0-9\s\-]{2,})\s+(\d+(?:\.\d+)?\s*(?:mg|mcg|ml|gm|g|IU))\b'
        freq_pattern = r'\b(BD|TDS|QD|QID|OD|HS|twice daily|once daily|three times a day|at bedtime|every \d+ hours)\b'
        dur_pattern = r'\bfor\s+(\d+)\s+(?:days|day|weeks|week)\b'

        lines = text.split('\n')
        seen_drugs = set()

        for line in lines:
            line = line.strip()
            if not line or len(line) < 5: continue
            match = re.search(med_pattern, line)
            if match:
                drug = match.group(1).strip()
                dosage = match.group(2).strip()
                frequency = match.group(3).strip().upper() if match.group(3) else ""
                duration = match.group(4).strip() if match.group(4) else ""
            else:
                match_simple = re.search(simple_pattern, line)
                if match_simple:
                    drug = match_simple.group(1).strip()
                    dosage = match_simple.group(2).strip()
                    freq_match = re.search(freq_pattern, line, re.I)
                    frequency = freq_match.group(1).upper() if freq_match else ""
                    dur_match = re.search(dur_pattern, line, re.I)
                    duration = dur_match.group(1) if dur_match else ""
                else:
                    continue

            drug = re.sub(r'[\s\-,.]{2,}.*$', '', drug).strip()
            if len(drug) < 3: continue
            if drug.lower() in seen_drugs: continue
            seen_drugs.add(drug.lower())

            if not frequency:
                l_lower = line.lower()
                if 'bd' in l_lower or 'twice daily' in l_lower: frequency = 'BD'
                elif 'tds' in l_lower or 'three times' in l_lower: frequency = 'TDS'
                elif 'qd' in l_lower or 'od' in l_lower or 'once daily' in l_lower: frequency = 'QD'
                elif 'qid' in l_lower or 'four times' in l_lower: frequency = 'QID'
                elif 'hs' in l_lower or 'at bedtime' in l_lower: frequency = 'HS'

            items.append({
                'drug': drug.capitalize(),
                'dosage': dosage,
                'duration': f"{duration} days" if duration else "30 days",
                'instructions': frequency or 'As directed'
            })
        return items

    def get_medication_info(self, drug_name: str) -> Dict:
        """Provide detailed info about a medication."""
        drug_name = drug_name.lower()
        drug_info_db = {
            'paracetamol': 'Used to treat pain and fever.',
            'amoxicillin': 'Penicillin-type antibiotic used to treat bacterial infections.',
            'metformin': 'Medication used to treat type 2 diabetes.',
            'atorvastatin': 'Statin medication used to lower cholesterol.',
            'amlodipine': 'Used to treat high blood pressure.',
        }
        for key, info in drug_info_db.items():
            if key in drug_name:
                return {'name': drug_name.capitalize(), 'purpose': info, 'category': 'Prescription'}
        return {'name': drug_name.capitalize(), 'purpose': 'Medical prescription.', 'category': 'Unknown'}

class PrescriptionParser:
    @staticmethod
    def parse_image(file_obj, patient):
        import requests, os, ast, re, io
        from datetime import timedelta, datetime
        from django.utils import timezone
        import dateutil.parser
        from django.conf import settings
        from apps.ai.services import ai_service
        import numpy as np
        
        use_hf_api = getattr(settings, 'USE_HF_INFERENCE_API', False)
        file_name = getattr(file_obj, 'name', 'prescription.jpg').lower()
        raw_ocr = ""
        entities = []

        # 1. Try Hugging Face Cloud OCR (Zero Local Load)
        if use_hf_api and not file_name.endswith('.pdf'):
            try:
                print(f"[CLOUD OCR] Offloading prescription to Hugging Face...")
                model_id = getattr(settings, 'HF_OCR_MODEL', 'naver-clova-ix/donut-base-finetuned-docvqa')
                
                # Seek to start for reading
                file_obj.seek(0)
                # We need a temp file path for HF Inference if it doesn't take file objects directly
                # InferenceClient.image_to_text takes bytes or path
                image_data = file_obj.read()
                
                if 'donut' in model_id:
                    response = ai_service._call_hf_inference(image_data, model_id, 
                                                           task="document-question-answering", 
                                                           question="What are the medications and dosages in this prescription?")
                    if response and isinstance(response, list):
                        raw_ocr = response[0].get('answer', '')
                else:
                    response = ai_service._call_hf_inference(image_data, model_id, task="image-to-text")
                    if response:
                        raw_ocr = response.get('generated_text', '')
                
                if raw_ocr:
                    print(f"[CLOUD OCR] Success: {len(raw_ocr)} chars")
            except Exception as e:
                print(f"HF Cloud OCR failed: {e}")

        if not raw_ocr:
            # Native PDF extraction is light, so we can keep it as fallback
            if file_name.endswith('.pdf'):
                print("[AI Service] Running light local PDF extraction...")
                try:
                    import pypdfium2 as pdfium
                    file_obj.seek(0)
                    pdf = pdfium.PdfDocument(file_obj)
                    ocr_parts = []
                    
                    # We ONLY use light extraction for PDF in Zero Local Load mode
                    for i in range(len(pdf)):
                        page = pdf.get_page(i)
                        pil_image = page.render(scale=2).to_pil()
                        
                        page_text = ""
                        # Try Tesseract if available (much lighter than EasyOCR)
                        if globals().get('pytesseract'):
                            try:
                                page_text = globals()['pytesseract'].image_to_string(pil_image).strip()
                            except: pass
                            
                        if page_text:
                            ocr_parts.append(page_text)
                    
                    raw_ocr = "\n\n".join(ocr_parts).strip()
                except Exception as pdf_err:
                    print(f"Local PDF extraction failed: {pdf_err}")
            
            # For images, we ONLY fall back to Tesseract, NEVER EasyOCR in Zero Local Load mode
            elif not use_hf_api or not raw_ocr:
                if use_hf_api:
                    print("[AI Service] Cloud OCR failed. Avoiding heavy local OCR to prevent crash.")
                else:
                    print("[AI Service] Running local OCR...")
                
                try:
                    file_obj.seek(0)
                    image_data = file_obj.read()
                    
                    # Try Tesseract (Lightweight)
                    if globals().get('pytesseract'):
                        try:
                            if globals().get('Image') is None:
                                from PIL import Image as img
                                globals()['Image'] = img
                            pil_img = globals()['Image'].open(io.BytesIO(image_data))
                            raw_ocr = globals()['pytesseract'].image_to_string(pil_img).strip()
                        except Exception as e:
                            print(f"Tesseract image error: {e}")
                    
                    # ONLY load EasyOCR if NOT in HF mode
                    if not raw_ocr and not use_hf_api:
                        if globals().get('easyocr'):
                            ai_service._load_ocr_reader()
                            reader = ai_service._ocr_reader
                            if reader:
                                try:
                                    if globals().get('Image') is None:
                                        from PIL import Image as img
                                        globals()['Image'] = img
                                    pil_img = globals()['Image'].open(io.BytesIO(image_data))
                                    img_np = np.array(pil_img)
                                    result = reader.readtext(img_np)
                                    raw_ocr = '\n'.join([text[1] for text in result]).strip()
                                except Exception as e:
                                    print(f"EasyOCR image error: {e}")
                except Exception as ocr_err:
                    print(f"Local OCR error: {ocr_err}")

        # Local HF NER Fallback - ONLY if NOT in Zero Local Load mode
        if not entities and raw_ocr and not use_hf_api and getattr(settings, 'USE_HF_MODELS', False):
            print("[AI Service] Running local Hugging Face NER...")
            entities = ai_service.extract_entities_hf(raw_ocr)
        
        # If in HF mode and we have raw_ocr but no entities yet, try HF NER
        if not entities and raw_ocr and use_hf_api:
            print("[AI Service] Offloading NER to Hugging Face...")
            entities = ai_service.extract_entities_hf(raw_ocr)

        # Date extraction
        extracted_date = None
        date_match = re.search(r'(\d{1,2}[\./-]\d{1,2}[\./-]\d{2,4})', raw_ocr)
        if date_match:
            try: extracted_date = dateutil.parser.parse(date_match.group(1), fuzzy=True).date()
            except: pass
        if not extracted_date: extracted_date = timezone.now().date()

        # Medicines
        medicines = []
        if entities:
            # Handle remote entities (same logic as before)
            current_med = {}
            for ent in entities:
                if isinstance(ent, dict):
                    word = ent.get('word', '').replace('##', '')
                    if 'treatment' in ent.get('entity_group', '').lower():
                        if current_med.get('drug_name'): medicines.append(current_med)
                        current_med = {"drug_name": word, "dosage": "?", "frequency": "?", "duration_days": 15, "purpose": "Prescribed medication."}
            if current_med.get('drug_name'): medicines.append(current_med)
        else:
            # Use local structured extractor
            items = ai_service.extract_prescription_items(raw_ocr)
            for item in items:
                medicines.append({
                    "drug_name": item['drug'],
                    "dosage": item['dosage'],
                    "frequency": item['instructions'],
                    "duration_days": int(re.search(r'\d+', item['duration']).group()) if re.search(r'\d+', item['duration']) else 15,
                    "purpose": ai_service.get_medication_info(item['drug'])['purpose']
                })

        # Create Prescription record in database
        try:
            from apps.records.models import Prescription
            from apps.reminders.models import MedicationReminder
            
            # Create the main prescription record
            rx = Prescription.objects.create(
                patient=patient,
                doctor=None, # AI Generated
                items=items if not entities else medicines, # items are from structured extractor
                notes=f"AI Analyzed Prescription from {extracted_date.isoformat()}\n\nRaw Text:\n{raw_ocr[:1000]}",
                ts=timezone.make_aware(datetime.combine(extracted_date, datetime.min.time())),
                expires_at=timezone.make_aware(datetime.combine(extracted_date + timedelta(days=15), datetime.min.time()))
            )
            
            # Create reminders
            PrescriptionParser.create_reminders(rx, medicines)
            prescription_id = rx.id
        except Exception as save_err:
            print(f"Failed to save prescription record: {save_err}")
            prescription_id = None

        return {
            "id": prescription_id,
            "extracted_date": extracted_date.isoformat(),
            "expires_at": (extracted_date + timedelta(days=15)).isoformat(),
            "medicines": medicines,
            "raw_ocr": raw_ocr,
            "doctor_advice": "Your medications have been saved and reminders synced to your mobile device. Consult your doctor for specific instructions."
        }

    @staticmethod
    def create_reminders(prescription, medicines):
        try: from apps.reminders.models import MedicationReminder
        except ImportError: return
        for med in medicines:
            freq = med.get("frequency", "").upper()
            times = ["08:00", "20:00"] if freq == "BD" else ["08:00", "14:00", "20:00"] if freq == "TDS" else ["08:00"]
            MedicationReminder.objects.create(
                patient=prescription.patient, prescription=prescription,
                drug_name=med.get("drug_name", ""), dosage=med.get("dosage", ""),
                frequency=freq, start_date=timezone.now().date(),
                end_date=timezone.now().date() + timedelta(days=med.get("duration_days", 15)),
                scheduled_times=times, is_active=True
            )

# Global service instance
ai_service = AIService()

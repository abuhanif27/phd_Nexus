"""
AI/ML Services: symptom analysis, specialist prediction, RAG-like summarization.
"""
import os
import re
import string
import pickle
import time
import csv
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
from .models import EmbeddingMeta, AISummary, ReinforcedKnowledge
from .tasks import get_or_extract_file_text
from .reinforcement import ReinforcementEngine


class AIService:
    """
    Main AI service for NLP/ML operations.
    Uses Reinforced Knowledge engine for Zero CPU pressure and adaptive learning.
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
        self.use_hf_api = getattr(settings, 'USE_HF_INFERENCE_API', True) # Default to True
        self.hf_token = getattr(settings, 'HF_TOKEN', None)
        self.hf_disabled_until = 0
        self.hf_last_error = ''
        self.local_fallback_mode = getattr(settings, 'AI_LOCAL_FALLBACK_MODE', 'lightweight')
        
        self.rl_engine = ReinforcementEngine()
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
        if self.use_hf_api:
            if not self.hf_token:
                print("⚠️ Warning: USE_HF_INFERENCE_API is True but HF_TOKEN is missing. AI features will fail but machine will not crash.")
            else:
                try:
                    # Lazy import InferenceClient
                    if globals().get('InferenceClient') is None:
                        from huggingface_hub import InferenceClient as ic
                        globals()['InferenceClient'] = ic
                    
                    self.hf_client = globals()['InferenceClient'](token=self.hf_token)
                    print("☁️ AI Service running in HF CLOUD mode (Zero local load)")
                except Exception as e:
                    print(f"❌ Error: Could not initialize HF Inference Client: {e}")
                    # We still keep use_hf_api = True to PREVENT falling back to heavy local models
                    # but we mark the client as None so methods can fail gracefully.
        
        # Load local models ONLY if EXPLICITLY NOT in HF API mode
        # and NOT in a resource-constrained environment (default to False for safety)
        if not self.use_hf_api and getattr(settings, 'USE_LOCAL_AI_MODELS', False):
            print("🏠 AI Service running in LOCAL mode (Warning: High RAM usage)")
            self._load_models()
        elif not self.use_hf_api:
            print("🚫 AI Service: Local models disabled (USE_LOCAL_AI_MODELS=False). Cloud mode suggested.")

    def _hf_available(self) -> bool:
        """Return False while HF is cooling down after rate limits or outages."""
        if not self.use_hf_api or not self.hf_client:
            return False
        return time.time() >= self.hf_disabled_until

    def _mark_hf_failure(self, error: Exception | str):
        """Temporarily back off HF after rate limits/server errors to avoid request storms."""
        message = str(error)
        self.hf_last_error = message[:300]
        lower = message.lower()
        retryable = (
            '429' in lower or 'rate limit' in lower or 'too many requests' in lower
            or '503' in lower or '504' in lower or 'timeout' in lower
        )
        if retryable:
            cooldown = getattr(settings, 'HF_RATE_LIMIT_COOLDOWN_SECONDS', 120)
            self.hf_disabled_until = time.time() + cooldown
            print(f"☁️ HF temporarily disabled for {cooldown}s: {self.hf_last_error}")

    def _requests_post_hf(self, url: str, headers: Dict, **kwargs):
        import requests

        timeout = getattr(settings, 'HF_INFERENCE_TIMEOUT_SECONDS', 20)
        attempts = max(1, getattr(settings, 'HF_INFERENCE_MAX_RETRIES', 1) + 1)
        last_error = None
        for _ in range(attempts):
            try:
                response = requests.post(url, headers=headers, timeout=timeout, **kwargs)
                if response.status_code == 429 or response.status_code >= 500:
                    self._mark_hf_failure(f"{response.status_code}: {response.text[:200]}")
                return response
            except requests.RequestException as exc:
                last_error = exc
                self._mark_hf_failure(exc)
        if last_error:
            raise last_error
        return None

    def _load_lightweight_specialist_classifier(self) -> bool:
        """
        Load only cheap local specialist models for HF fallback.
        This avoids DistilBERT, embeddings, spaCy, OCR, and FAISS.
        """
        if self.specialist_classifier:
            return True
        if self.local_fallback_mode not in {'lightweight', 'full'}:
            return False

        try:
            import joblib as jl
            enhanced_model = os.path.join(settings.BASE_DIR, 'ai_models/specialist_clf_sklearn_enhanced.joblib')
            enhanced_labels = os.path.join(settings.BASE_DIR, 'ai_models/specialist_clf_sklearn_enhanced_labels.joblib')
            sklearn_model = os.path.join(settings.BASE_DIR, 'ai_models/specialist_clf_sklearn.joblib')
            sklearn_labels = os.path.join(settings.BASE_DIR, 'ai_models/specialist_clf_sklearn_labels.joblib')

            if os.path.exists(enhanced_model) and os.path.exists(enhanced_labels):
                from apps.ai.sklearn_classifier_enhanced import EnhancedSklearnSpecialistClassifier
                self.specialist_classifier = EnhancedSklearnSpecialistClassifier.load(enhanced_model, enhanced_labels)
                self.specialist_classifier_type = 'local_lightweight_enhanced_sklearn'
                return True

            if os.path.exists(sklearn_model) and os.path.exists(sklearn_labels):
                self.specialist_classifier = jl.load(sklearn_model)
                self.specialist_classifier_labels = jl.load(sklearn_labels)
                self.specialist_classifier_type = 'local_lightweight_sklearn'
                return True
        except Exception as exc:
            print(f"Lightweight specialist fallback unavailable: {exc}")
        return False

    def _extract_json(self, text: str) -> any:
        """Robustly extract JSON from a string that might contain other text."""
        if not text: return None
        import json
        import re
        
        # Clean markdown code blocks
        if '```json' in text:
            text = text.split('```json')[1].split('```')[0]
        elif '```' in text:
            text = text.split('```')[1].split('```')[0]
            
        # Clean trailing commas which break python json.loads
        text = re.sub(r',\s*([\]}])', r'\1', text)
            
        try:
            # 1. Try direct parse
            return json.loads(text.strip())
        except:
            try:
                # 2. Try finding JSON-like structure
                match = re.search(r'(\{.*\}|\[.*\])', text, re.DOTALL)
                if match:
                    # Clean trailing commas again just in case
                    clean_match = re.sub(r',\s*([\]}])', r'\1', match.group(0))
                    return json.loads(clean_match)
            except:
                pass
        return None

    def _call_hf_chat(self, prompt: str, system_prompt: str = "You are a helpful medical assistant.", model_id: str = None) -> str:
        """Call HF Chat Completion API (preferred for Mistral/Llama)."""
        if not self._hf_available(): return ""
        if not model_id:
            model_id = getattr(settings, 'HF_LLM_MODEL', 'Qwen/Qwen2.5-Coder-32B-Instruct')
            
        try:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ]
            response = self.hf_client.chat_completion(
                messages, 
                model=model_id, 
                max_tokens=800,
                temperature=0.1
            )
            return response.choices[0].message.content
        except Exception as e:
            self._mark_hf_failure(e)
            print(f"☁️ HF Chat Error: {e}")
            return ""

    def _call_hf_inference(self, data: any, model_id: str, task: str = "text-generation", **kwargs) -> any:
        """
        Call Hugging Face Inference API with intelligent task routing.
        Supports text-generation, chat-completion, and document-qa.
        """
        if not self._hf_available() and self.hf_client:
            return None

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
            # 1. Handle Chat/Conversational Models (Mistral, Llama, etc.)
            chat_model_markers = (
                "mistral", "llama", "gpt-oss", "deepseek", "qwen",
                "gemma", "phi", "glm", "olmo", "aya"
            )
            is_chat_model = any(marker in model_id.lower() for marker in chat_model_markers)
            
            if (task == "text-generation" or task == "conversational") and is_chat_model:
                return self._call_hf_chat(data, model_id=model_id)

            if task == "text-generation":
                try:
                    return self.hf_client.text_generation(data, model=model_id, **kwargs)
                except StopIteration:
                    import requests, os
                    hf_ep = os.environ.get("HF_INFERENCE_ENDPOINT", "https://router.huggingface.co/hf-inference")
                    url = f"{hf_ep}/models/{model_id}"
                    headers = {"Authorization": f"Bearer {self.hf_token}"}
                    response = self._requests_post_hf(url, headers=headers, json={"inputs": data})
                    res_json = response.json()
                    if isinstance(res_json, list) and len(res_json)>0:
                        return res_json[0].get('generated_text', '')
                    return str(res_json)
            
            elif task == "token-classification":
                try:
                    return self.hf_client.token_classification(data, model=model_id)
                except StopIteration:
                    import requests, os
                    hf_ep = os.environ.get("HF_INFERENCE_ENDPOINT", "https://router.huggingface.co/hf-inference")
                    url = f"{hf_ep}/models/{model_id}"
                    headers = {"Authorization": f"Bearer {self.hf_token}"}
                    response = self._requests_post_hf(url, headers=headers, json={"inputs": data})
                    return response.json()
            
            elif task == "feature-extraction":
                return self.hf_client.feature_extraction(data, model=model_id)
            
            elif task == "text-classification":
                return self.hf_client.text_classification(data, model=model_id)
            
            elif task == "image-to-text":
                image_bytes = self._get_image_bytes(data)
                if not image_bytes: return None
                try:
                    return self.hf_client.image_to_text(image_bytes, model=model_id)
                except StopIteration:
                    import requests, os
                    hf_ep = os.environ.get("HF_INFERENCE_ENDPOINT", "https://router.huggingface.co/hf-inference")
                    url = f"{hf_ep}/models/{model_id}"
                    headers = {"Authorization": f"Bearer {self.hf_token}"}
                    response = self._requests_post_hf(url, headers=headers, data=image_bytes)
                    res_json = response.json()
                    if isinstance(res_json, list) and len(res_json) > 0:
                        return res_json[0].get('generated_text', str(res_json))
                    elif isinstance(res_json, dict) and 'error' in res_json:
                        print(f"HF Image-to-Text API Error: {res_json['error']}")
                        return ""
                    return str(res_json)
            
            elif task == "document-question-answering":
                image_bytes = self._get_image_bytes(data)
                if not image_bytes: return None
                question = kwargs.get('question', 'Extract all text from this medical document.')
                
                try:
                    response = self.hf_client.document_question_answering(image_bytes, question, model=model_id)
                except StopIteration:
                    import requests, base64, os
                    hf_ep = os.environ.get("HF_INFERENCE_ENDPOINT", "https://router.huggingface.co/hf-inference")
                    url = f"{hf_ep}/models/{model_id}"
                    headers = {"Authorization": f"Bearer {self.hf_token}"}
                    img_b64 = base64.b64encode(image_bytes).decode('utf-8')
                    payload = {"inputs": {"image": img_b64, "question": question}}
                    resp = self._requests_post_hf(url, headers=headers, json=payload)
                    response = resp.json()

                if isinstance(response, list) and len(response) > 0:
                    return response[0].get('answer', '')
                elif isinstance(response, dict):
                    if 'error' in response:
                        print(f"HF DocQA API Error: {response['error']}")
                        return ""
                    return response.get('answer', response.get('generated_text', str(response)))
                return str(response)
                
            return None
        except Exception as e:
            self._mark_hf_failure(e)
            print(f"☁️ HF Inference API Error ({task}): {e}")
            return None

    def _get_image_bytes(self, data: any) -> bytes:
        """Helper to extract bytes from various image data formats."""
        try:
            if hasattr(data, 'read'):
                data.seek(0)
                return data.read()
            elif isinstance(data, str) and os.path.exists(data):
                with open(data, 'rb') as f:
                    return f.read()
            elif isinstance(data, bytes):
                return data
            return None
        except:
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
        if self._hf_available():
            model_id = getattr(settings, 'HF_NER_MODEL', 'd4data/biomedical-ner-all')
            try:
                entities = self._call_hf_inference(text, model_id, task="token-classification")
                if entities:
                    if isinstance(entities, dict) and 'error' in entities:
                        print(f"HF NER Error from API: {entities['error']}")
                        return []
                        
                    serialized = []
                    for ent in (entities if isinstance(entities, list) else []):
                        if not isinstance(ent, dict):
                            continue
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
        Analyze symptom text using HF Inference API or Dataset-based Mapping.
        Returns cleaned text and extracted entities.
        """
        cleaned = self.clean_text(text)
        entities = []
        
        # 1. Try HF Inference API (Cloud Priority)
        if self._hf_available():
            entities = self.extract_entities_hf(text)
        
        # 2. Dataset-based Fallback (Zero CPU, High Reliability)
        if not entities:
            # Find known symptoms in text
            found = self.rl_engine.get_contained_symptoms(text)
            for sym in found:
                # Find position in original text for UI mapping
                match = re.search(re.escape(sym), text, re.IGNORECASE)
                start = match.start() if match else 0
                end = match.end() if match else 0
                entities.append({
                    'text': sym,
                    'label': 'symptom',
                    'start': start,
                    'end': end
                })

        # 3. Local Model Fallback (Legacy/Heavy)
        if not entities and self.spacy_model:
            doc = self.spacy_model(text)
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
        PRIORITY 1: Reinforced Local Engine (Zero CPU, Dataset Driven, Continuous Learning)
        FALLBACK: HF Inference API
        """
        # Extract symptoms from text for the RL engine
        analysis = self.analyze_symptoms(text)
        found_symptoms = [ent['text'] for ent in analysis.get('entities', []) if ent['label'].lower() in ('symptom', 'condition')]
        
        # If no specific symptoms found via NER, use the keyword containment fallback
        if not found_symptoms:
            found_symptoms = self.rl_engine.get_contained_symptoms(text)

        # 1. Use Reinforced Engine
        predictions = self.rl_engine.predict(found_symptoms)
        
        if predictions:
            best_disease, score = predictions[0]
            # Map disease to specialist (lightweight lookup)
            specialist = self._map_disease_to_specialist(best_disease)
            
            return {
                'specialist': specialist,
                'disease_prediction': best_disease,
                'confidence': min(0.95, 0.5 + (score / 10)),
                'source': 'reinforced_knowledge',
                'symptoms_detected': found_symptoms,
                'alternatives': [self._map_disease_to_specialist(d) for d, s in predictions[1:]]
            }

        # 2. Try HF Inference API (If RL engine had zero matches)
        if self._hf_available():
            model_id = getattr(settings, 'HF_LLM_MODEL', 'openai/gpt-oss-20b')
            prompt = f"""You are a medical specialist classifier. Given the symptoms, predict the most relevant medical specialist.
Possible specialists: Cardiology, Dermatology, Endocrinology, Gastroenterology, General Physician, Neurology, Oncology, Ophthalmology, Orthopedics, Pediatrics, Psychiatry, Pulmonology, Rheumatology, Urology.

Symptoms: {text}

Return only valid JSON with this schema:
{{"specialist":"Dermatology","confidence":0.9,"alternatives":[{{"specialist":"General Physician","confidence":0.3}}]}}"""
            
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
            self._load_lightweight_specialist_classifier()

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
            if self.specialist_classifier_type in [
                'sklearn', 'pytorch', 'enhanced_sklearn', 'hf_enhanced_sklearn',
                'hf_sklearn', 'local_lightweight_enhanced_sklearn'
            ]:
                result = self.specialist_classifier.predict_single(text, top_k=3)
                result['model_type'] = self.specialist_classifier_type
                return result

            if self.specialist_classifier_type == 'local_lightweight_sklearn':
                if hasattr(self.specialist_classifier, 'predict_proba') and hasattr(self, 'specialist_classifier_labels'):
                    import numpy as local_np
                    proba = self.specialist_classifier.predict_proba([text])[0]
                    labels = self.specialist_classifier_labels
                    classes = getattr(labels, 'classes_', labels)
                    top_indices = local_np.argsort(proba)[-3:][::-1]
                    return {
                        'specialist': str(classes[top_indices[0]]),
                        'confidence': float(proba[top_indices[0]]),
                        'alternatives': [
                            {'specialist': str(classes[idx]), 'confidence': float(proba[idx])}
                            for idx in top_indices[1:] if proba[idx] > 0.05
                        ],
                        'model_type': self.specialist_classifier_type
                    }
                prediction = self.specialist_classifier.predict([text])[0]
                return {
                    'specialist': str(prediction),
                    'confidence': 0.65,
                    'alternatives': [],
                    'model_type': self.specialist_classifier_type
                }
            
            # Legacy model handling (old embedding-based approach)
            if not self.embedding_model:
                return {
                    'specialist': 'General Physician',
                    'confidence': 0.5,
                    'alternatives': [],
                    'model_type': 'fallback'
                }
            
            # Generate embedding
            if self._hf_available():
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
        global np, faiss
        if np is None:
            import numpy as local_np
            np = local_np
        if faiss is None:
            import faiss as local_faiss
            faiss = local_faiss

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
        if self._hf_available():
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
            if self._hf_available():
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
            
            if self._hf_available():
                model_id = getattr(settings, 'HF_LLM_MODEL', 'openai/gpt-oss-20b')
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
            global PlaintextParser, Tokenizer, TextRankSummarizer
            if PlaintextParser is None or Tokenizer is None or TextRankSummarizer is None:
                from sumy.parsers.plaintext import PlaintextParser as pp
                from sumy.nlp.tokenizers import Tokenizer as tk
                from sumy.summarizers.text_rank import TextRankSummarizer as trs
                PlaintextParser = pp
                Tokenizer = tk
                TextRankSummarizer = trs
            parser = PlaintextParser.from_string(text, Tokenizer("english"))
            summarizer = TextRankSummarizer()
            summary_sentences = summarizer(parser.document, sentence_count)
            return [str(sent) for sent in summary_sentences]
        except Exception as e:
            print(f"TextRank error: {e}")
            # Fallback: return first few sentences
            sentences = text.split('.')[:sentence_count]
            return [s.strip() + '.' for s in sentences if s.strip()]

    def _map_disease_to_specialist(self, disease: str) -> str:
        """Map disease name to a specialist using the CSV dataset."""
        try:
            primary = os.path.join(settings.BASE_DIR, 'data', 'symptom_checker', 'Disease Specialist.csv')
            fallback = os.path.join(settings.BASE_DIR, 'chating system', 'Dataset', 'Disease Specialist.csv')
            for path in (primary, fallback):
                if not os.path.exists(path):
                    continue
                with open(path, mode='r', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        if row['Disease'].strip().lower() == disease.strip().lower():
                            return row['Specialist'].strip()
        except Exception as e:
            print(f"Mapping error: {e}")
        return "General Physician"

    def reinforce_knowledge(self, symptoms_text: str, disease: str, is_reward: bool = True):
        """
        Public interface to reward or penalize the AI's knowledge base.
        Called when a doctor confirms a diagnosis (Prescription creation).
        """
        analysis = self.analyze_symptoms(symptoms_text)
        symptoms = [ent['text'] for ent in analysis.get('entities', []) if ent['label'].lower() in ('symptom', 'condition')]
        
        # If NER failed to find entities, use the keyword containment fallback
        if not symptoms:
            symptoms = self.rl_engine.get_contained_symptoms(symptoms_text)

        if is_reward:
            self.rl_engine.reward(symptoms, disease)
        else:
            self.rl_engine.penalize(symptoms, disease)

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
        if self._hf_available():
            model_id = getattr(settings, 'HF_LLM_MODEL', 'openai/gpt-oss-20b')
            max_chars = getattr(settings, 'AI_LOCAL_TEXT_MAX_CHARS', 6000)
            prompt = f"""[INST] You are a medical assistant. Summarize the following medical text into a professional summary and a list of key points.
Text: {text[:max_chars]}

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

        # Initialize all potential result variables
        summary = "Medical records reviewed; see specific documents for details."
        bullets = []
        record_highlights = []
        insights = []
        conditions_list = []
        final_medications = []
        entities_map = {}
        manual_medications = []
        professional_narrative = ''
        professional_findings = []

        # Extractive summary (TextRank) – medical-domain friendly
        # Aggressively filter bullets for noise
        raw_bullets = self._extractive_summary(corpus, sentence_count=8)
        bullets = [b for b in raw_bullets if not self._is_noise(b) and len(b.strip()) > 15]
        
        if not bullets and corpus.strip():
            # Fallback: use meaningful lines that aren't noise
            lines = [s.strip() for s in corpus.split('\n') if not self._is_noise(s) and len(s.strip()) > 30][:10]
            bullets = lines
            
        summary = ' '.join(bullets) if bullets else summary

        # 1. Try HF Inference API for high-quality clinical insights
        if self._hf_available():
            model_id = getattr(settings, 'HF_LLM_MODEL', 'openai/gpt-oss-20b')
            max_chars = min(getattr(settings, 'AI_LOCAL_TEXT_MAX_CHARS', 6000), 4000)
            prompt = f"""[INST] You are a senior medical consultant. Analyze these patient records and provide:
1. A concise professional narrative.
2. Key clinical findings (max 10).
3. Predicted conditions with severity and status.
4. Medications mentioned.

Records: {corpus[:max_chars]}

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
                    cloud_data = self._extract_json(response)
                    if isinstance(cloud_data, dict):
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
                            record_highlights = professional_findings
                            
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
        # Only build local conditions if cloud didn't provide them
        if not conditions_list:
            raw_condition_sources = professional_findings if professional_findings else list(dict.fromkeys(manual_findings))[:10]
            for raw_cond in raw_condition_sources:
                conditions_list.append(self._analyze_condition(raw_cond))
            
        if professional_narrative:
            summary = professional_narrative

        # Prefer clean findings for highlights
        if not record_highlights:
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
        # Only build local medications if cloud didn't provide them
        if not final_medications:
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
        med_pattern = (
            r'(?i)(?:Tab|Cap|Syr|Syp|Inj|Cream|Oint|Drop|Drops|Susp|Soln|T\.|C\.)?[\.\s]*'
            r'([A-Z][a-z0-9\s\-]{2,})\s+'
            r'(\d+(?:\.\d+)?\s*(?:mg|mcg|ml|gm|g|IU|mcg/ml|mg/ml|%))\b'
            r'.*?(\b(?:BD|TDS|QD|QID|OD|HS|SOS|PRN|twice daily|once daily|three times a day|at bedtime|every \d+ hours)\b)?'
            r'.*?(?:for\s+(\d+)\s+(?:days|day|weeks|week|w|d))?'
        )
        simple_pattern = r'(?i)([A-Z][a-z0-9\s\-]{2,})\s+(\d+(?:\.\d+)?\s*(?:mg|mcg|ml|gm|g|IU|mcg/ml|mg/ml|%))\b'
        loose_dose_pattern = r'(?i)([A-Z][a-z0-9\s\-]{2,})\s+(\d{1,4})\b'
        freq_pattern = r'\b(BD|TDS|QD|QID|OD|HS|SOS|PRN|twice daily|once daily|three times a day|at bedtime|every \d+ hours)\b'
        schedule_pattern = r'\b(\d+\s*[-+]\s*\d+\s*[-+]\s*\d+(?:\s*[-+]\s*\d+)?)\b'
        dur_pattern = r'(?:\bfor\b|\bx\b|\b×\b)?\s*(\d{1,3})\s*(days|day|d|weeks|week|w)\b'

        def _normalize_frequency(line: str, explicit: str | None) -> str:
            if explicit:
                return explicit.upper()
            l_lower = line.lower()
            schedule = re.search(schedule_pattern, line)
            if schedule:
                raw = re.sub(r'\s+', '', schedule.group(1))
                if raw in {'1-0-1', '1+0+1'}:
                    return 'BD'
                if raw in {'1-1-1', '1+1+1'}:
                    return 'TDS'
                if raw in {'1-1-1-1', '1+1+1+1'}:
                    return 'QID'
                if raw in {'0-0-1', '0+0+1'}:
                    return 'HS'
            if 'bd' in l_lower or 'twice daily' in l_lower:
                return 'BD'
            if 'tds' in l_lower or 'three times' in l_lower:
                return 'TDS'
            if 'qd' in l_lower or 'od' in l_lower or 'once daily' in l_lower:
                return 'QD'
            if 'qid' in l_lower or 'four times' in l_lower:
                return 'QID'
            if 'hs' in l_lower or 'at bedtime' in l_lower:
                return 'HS'
            if 'sos' in l_lower:
                return 'SOS'
            if 'prn' in l_lower:
                return 'PRN'
            return ''

        def _normalize_duration(line: str, explicit: str | None) -> str:
            if explicit:
                return explicit
            dur_match = re.search(dur_pattern, line, re.I)
            if not dur_match:
                return ''
            qty = int(dur_match.group(1))
            unit = dur_match.group(2).lower()
            if unit.startswith('w'):
                qty *= 7
            return str(qty)

        lines = []
        for chunk in text.split('\n'):
            parts = re.split(r'[;|]', chunk)
            lines.extend(parts)
        seen_drugs = set()

        for line in lines:
            line = line.strip()
            if not line or len(line) < 5: continue
            match = re.search(med_pattern, line)
            if match:
                drug = match.group(1).strip()
                dosage = match.group(2).strip()
                frequency = _normalize_frequency(line, match.group(3))
                duration = _normalize_duration(line, match.group(4))
            else:
                match_simple = re.search(simple_pattern, line)
                if match_simple:
                    drug = match_simple.group(1).strip()
                    dosage = match_simple.group(2).strip()
                    freq_match = re.search(freq_pattern, line, re.I)
                    frequency = _normalize_frequency(line, freq_match.group(1) if freq_match else "")
                    duration = _normalize_duration(line, "")
                else:
                    match_loose = re.search(loose_dose_pattern, line)
                    if match_loose:
                        drug = match_loose.group(1).strip()
                        dosage = match_loose.group(2).strip()
                        frequency = _normalize_frequency(line, "")
                        duration = _normalize_duration(line, "")
                    else:
                        continue

            drug = re.sub(r'[\s\-,.]{2,}.*$', '', drug).strip()
            if len(drug) < 3: continue
            if drug.lower() in seen_drugs: continue
            seen_drugs.add(drug.lower())

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
    def parse_image(
        file_obj,
        patient,
        auto_save=True,
        raw_text_override: str | None = None,
        clinical_date_override=None,
    ):
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

        if raw_text_override and raw_text_override.strip():
            raw_ocr = raw_text_override.strip()
            print("[Prescription] Using stored extracted text; skipping OCR.")

        # 1. Try Hugging Face Cloud OCR (Zero Local Load)
        if not raw_ocr and use_hf_api and not file_name.endswith('.pdf'):
            try:
                print(f"[Prescription] Offloading to HF Cloud OCR (Model: {getattr(settings, 'HF_OCR_MODEL', 'donut')})...")
                file_obj.seek(0)
                image_data = file_obj.read()
                
                model_id = getattr(settings, 'HF_OCR_MODEL', 'naver-clova-ix/donut-base-finetuned-docvqa')
                if 'donut' in model_id:
                    raw_ocr = ai_service._call_hf_inference(
                        image_data, model_id, 
                        task="document-question-answering", 
                        question="What are the medications and dosages in this prescription?"
                    )
                else:
                    response = ai_service._call_hf_inference(image_data, model_id, task="image-to-text")
                    if isinstance(response, dict):
                        raw_ocr = response.get('generated_text', '')
                    elif isinstance(response, str):
                        raw_ocr = response
                
                raw_ocr = raw_ocr or ""
                
                if raw_ocr:
                    print(f"[Prescription] Cloud OCR Success: {len(raw_ocr)} chars extracted.")
                else:
                    print("[Prescription] Cloud OCR returned empty text.")
            except Exception as e:
                print(f"[Prescription] Cloud OCR Error: {e}")

        # 2. Local fallback OCR - ONLY if NOT in HF mode or Cloud OCR returned nothing
        # In Zero Local Load mode, we strictly avoid heavy local OCR.
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
            
            # For images, if Cloud OCR failed, we only try Tesseract explicitly as a light fallback.
            elif not raw_ocr:
                print("[AI Service] Cloud OCR failed. Running lightweight local OCR (Tesseract)...")
                try:
                    file_obj.seek(0)
                    image_data = file_obj.read()
                    
                    # Try Tesseract (Lightweight)
                    try:
                        import pytesseract
                        from PIL import Image as img, ImageEnhance, ImageOps
                        pil_img = img.open(io.BytesIO(image_data))
                        
                        # Handle transparent backgrounds (RGBA to RGB with white background)
                        if pil_img.mode in ('RGBA', 'LA') or (pil_img.mode == 'P' and 'transparency' in pil_img.info):
                            alpha = pil_img.convert('RGBA').split()[-1]
                            bg = img.new("RGB", pil_img.size, (255, 255, 255))
                            bg.paste(pil_img, mask=alpha)
                            pil_img = bg
                            
                        # Pre-process for better OCR accuracy
                        # 1. Convert to Grayscale
                        pil_img = pil_img.convert('L')
                        # 2. Increase contrast
                        enhancer = ImageEnhance.Contrast(pil_img)
                        pil_img = enhancer.enhance(2.0)
                        # 3. Increase sharpness
                        sharpness = ImageEnhance.Sharpness(pil_img)
                        pil_img = sharpness.enhance(2.0)
                        
                        # Try psm 6 (Assume a single uniform block of text) which works well for prescriptions
                        raw_ocr = pytesseract.image_to_string(pil_img, config='--psm 6').strip()
                        if raw_ocr:
                            print(f"[Prescription] Lightweight Local OCR Success: {len(raw_ocr)} chars extracted.")
                    except ImportError:
                        print("pytesseract not installed, skipping light OCR.")
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

        raw_ocr = raw_ocr or ""

        # Date extraction
        extracted_date = None

        if clinical_date_override:
            try:
                if isinstance(clinical_date_override, str):
                    extracted_date = dateutil.parser.parse(clinical_date_override, fuzzy=True).date()
                else:
                    extracted_date = clinical_date_override
            except Exception:
                extracted_date = None

        def _extract_date_from_text(text: str):
            if not text:
                return None
            # Prefer lines that explicitly mention date
            date_lines = [line for line in text.split('\n') if re.search(r'\bdate\b|\bdated\b', line, re.I)]
            for line in date_lines:
                try:
                    return dateutil.parser.parse(line, fuzzy=True, dayfirst=True).date()
                except Exception:
                    continue

            # Common explicit formats with year
            patterns = [
                r'(\d{4}[\./-]\d{1,2}[\./-]\d{1,2})',
                r'(\d{1,2}[\./-]\d{1,2}[\./-]\d{2,4})',
                r'(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4})',
                r'([A-Za-z]{3,9}\s+\d{1,2},\s*\d{4})',
            ]
            for pattern in patterns:
                match = re.search(pattern, text)
                if match:
                    raw = match.group(1)
                    try:
                        if re.match(r'^\d{4}', raw):
                            return dateutil.parser.parse(raw, fuzzy=True, yearfirst=True).date()
                        return dateutil.parser.parse(raw, fuzzy=True, dayfirst=True).date()
                    except Exception:
                        continue
            return None

        if not extracted_date:
            extracted_date = _extract_date_from_text(raw_ocr)
        if not extracted_date:
            extracted_date = timezone.now().date()

        # Medicines Extraction (Clinical NER -> LLM Fallback -> Regex Fallback)
        medicines = []
        
        # Pre-process raw_ocr to remove excessive whitespace and noisy symbols
        clean_ocr = re.sub(r'[\s\t\n]+', ' ', raw_ocr).strip()
        
        # 1. Try specialized Clinical NER
        if entities:
            print("[Prescription] Processing Clinical NER entities...")
            current_med = {}
            for ent in entities:
                if isinstance(ent, dict):
                    word = ent.get('word', '').replace('##', '').strip()
                    label = ent.get('entity_group', '').lower()
                    if 'treatment' in label or 'medication' in label or 'clinical_drug' in label or 'drug' in label or 'lab_value' in label:
                        if current_med.get('drug_name'): medicines.append(current_med)
                        current_med = {"drug_name": word, "dosage": "?", "frequency": "?", "duration_days": 15, "purpose": "Prescribed medication."}
            if current_med.get('drug_name'): medicines.append(current_med)

        # 2. Try LLM Extraction (High-priority fallback)
        if len(medicines) < 1 and clean_ocr and use_hf_api:
            print("[Prescription] NER empty or failed. Attempting deep LLM extraction...")
            prompt = f"""Extract every single medication, drug, or tablet mentioned in this prescription text.
For each medication found, provide:
- drug_name (e.g., Amoxicillin, Paracetamol)
- dosage (e.g., 500mg, 1 tab)
- frequency (e.g., BD, TDS, daily)
- duration_days (number of days to take it)

Text to analyze: {clean_ocr[:2500]}

Return ONLY a JSON list of objects. If no medications are found, return []."""
            
            system_msg = "You are a precise medical data extraction engine. You specialize in identifying drug names, dosages, and frequencies from noisy OCR text. Only output valid JSON."
            llm_res = ai_service._call_hf_chat(prompt, system_prompt=system_msg)
            llm_json = ai_service._extract_json(llm_res)
            
            if isinstance(llm_json, list) and len(llm_json) > 0:
                print(f"[Prescription] LLM extraction success: {len(llm_json)} items")
                medicines = llm_json
            elif isinstance(llm_json, dict) and 'medicines' in llm_json:
                medicines = llm_json['medicines']
            else:
                print("[Prescription] LLM extraction returned no items.")

        # 3. Final Fallback: Regex-based extraction (if all else failed)
        if not medicines and clean_ocr:
            print("[Prescription] NER and LLM failed. Using Regex fallback...")
            items = ai_service.extract_prescription_items(raw_ocr) # Use raw text for regex to preserve lines
            for item in items:
                medicines.append({
                    "drug_name": item['drug'],
                    "dosage": item['dosage'],
                    "frequency": item['instructions'],
                    "duration_days": int(re.search(r'\d+', item['duration']).group()) if re.search(r'\d+', item['duration']) else 15,
                    "purpose": ai_service.get_medication_info(item['drug'])['purpose']
                })

        # Create Prescription record in database ONLY if auto_save is True AND medicines were found
        prescription_id = None
        if auto_save and len(medicines) > 0:
            try:
                from apps.records.models import Prescription
                from apps.reminders.models import MedicationReminder
                
                # Create the main prescription record
                rx = Prescription.objects.create(
                    patient=patient,
                    doctor=None, # AI Generated
                    items=medicines, 
                    notes=f"AI Analyzed Prescription from {extracted_date.isoformat()}\n\nRaw Text:\n{raw_ocr[:1000]}",
                    ts=timezone.make_aware(datetime.combine(extracted_date, datetime.min.time())),
                    expires_at=timezone.make_aware(datetime.combine(extracted_date + timedelta(days=15), datetime.min.time()))
                )
                
                # Create reminders
                PrescriptionParser.create_reminders(rx, medicines)
                prescription_id = rx.id
                print(f"[Prescription] Record saved to database: {prescription_id}")
            except Exception as save_err:
                print(f"Failed to save prescription record: {save_err}")
        else:
            if not auto_save:
                print("[Prescription] Skip saving: auto_save is False")
            elif len(medicines) == 0:
                print("[Prescription] Skip saving: No medicines extracted")

        return {
            "id": prescription_id,
            "extracted_date": extracted_date.isoformat(),
            "expires_at": (extracted_date + timedelta(days=15)).isoformat(),
            "medicines": medicines,
            "raw_ocr": raw_ocr,
            "doctor_advice": "Your medications have been saved and reminders synced to your mobile device. Consult your doctor for specific instructions." if prescription_id else "No medications were saved. Try a clearer photo for better analysis."
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

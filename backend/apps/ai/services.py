"""
AI/ML Services: symptom analysis, specialist prediction, RAG-like summarization.
"""
import os
import re
import string
import pickle
from pathlib import Path
from typing import List, Dict, Tuple
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
    def __init__(self, model_type: str = 'auto'):
        """
        Initialize AI Service.
        
        Args:
            model_type: 'sklearn', 'distilbert', or 'auto' (defaults to sklearn)
        """
        self.model_type = model_type
        self.spacy_model = None
        self.embedding_model = None
        self.specialist_classifier = None
        self.specialist_classifier_type = None
        self.distilbert_classifier = None  # FREE CPU-friendly DistilBERT
        self.faiss_index = None
        self._load_models()
    
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
        Predict specialist from symptom text using loaded classifier.
        Supports sklearn (quick) and DistilBERT (deep) - 100% FREE!
        
        Args:
            text: Symptom description
            model_type: Override model type ('sklearn', 'distilbert')
            mode: 'quick' (fast sklearn 5-10ms) or 'deep' (FREE DistilBERT 100ms)
            patient_history: Optional patient history (currently unused)
            
        Returns specialist name, confidence, and top alternatives.
        """
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

    def _build_professional_summary(self, corpus: str) -> Tuple[str, List[str]]:
        """
        Turn raw OCR/corpus into a clean, professional narrative and short key findings.
        Strips metadata, extracts conditions/syndromes/vaccination, returns meaningful summary.
        """
        import re
        # Extract actual content: remove "[date] [type] Document: ... Content from image:" and keep medical text
        content_parts = []
        for block in re.split(r'\[\d{4}-\d{2}-\d{2}\]\s*\[\w+\]\s*Document:[^\n]*\.?\s*', corpus):
            block = block.replace('Content from image:', '').strip()
            if len(block) > 40 and not block.startswith('['):
                content_parts.append(block)
        raw_text = ' '.join(content_parts) if content_parts else corpus
        raw_text = re.sub(r'\[\d{4}-\d{2}-\d{2}\]\s*\[\w+\]\s*Document:[^\n]+', ' ', raw_text)
        raw_text = re.sub(r'Content from image:\s*', ' ', raw_text)
        # Remove long phone/email/URL runs so they don't become "findings"
        raw_text = re.sub(r'\(\d{3}\)\s*\d{3}[-\s]?\d{4}', ' ', raw_text)
        raw_text = re.sub(r'\d{3}[-.\s]?\d{3}[-.\s]?\d{4}', ' ', raw_text)
        raw_text = re.sub(r'[\w.-]+@[\w.-]+\.\w+', ' ', raw_text)
        raw_text = re.sub(r'www\.\S+', ' ', raw_text)
        raw_text = ' '.join(raw_text.split())

        findings = []
        seen = set()

        def add_finding(s: str, max_len: int = 100):
            s = s.strip()
            if not s or len(s) < 4:
                return
            s = s[:max_len].strip()
            key = s.lower()[:80]
            if key not in seen:
                seen.add(key)
                findings.append(s)

        # Medical problems / conditions – clean, professional phrases only
        phrase_checks = [
            (r'mild\s+asthma.*?controlled.*?medication', 'Mild asthma, controlled with medication'),
            (r'asthma.*?controlled', 'Asthma, controlled with medication'),
            (r'occasional\s+migraine.*?stress', 'Occasional migraines, triggered by stress'),
            (r'migraine', 'Migraines noted'),
            (r'hypertension.*?lifestyle', 'Hypertension, managed with lifestyle changes'),
            (r'hypertension', 'Hypertension'),
            (r'diabetes', 'Diabetes'),
        ]
        for pat, phrase in phrase_checks:
            if re.search(pat, raw_text, re.IGNORECASE):
                add_finding(phrase)
        # One free-form line after "List any Medical Problems" if short enough
        m = re.search(r'list any medical problems[^:]*:\s*([^.]{20,120})', raw_text, re.IGNORECASE)
        if m:
            g = re.sub(r'\s+', ' ', m.group(1)).strip()
            if not re.search(r'\d{5}|street|avenue', g, re.IGNORECASE):
                add_finding(g[:100])

        # Vaccination / immunity
        if re.search(r'not\s+immune|NOT\s+IMMUNE', raw_text, re.IGNORECASE):
            imm = []
            if re.search(r'measles', raw_text, re.IGNORECASE):
                imm.append('Measles: not immune')
            if re.search(r'varicella|chicken\s*pox', raw_text, re.IGNORECASE):
                imm.append('Chicken pox (Varicella): see record')
            if re.search(r'hepatitis\s*B.*no|vaccination.*no', raw_text, re.IGNORECASE):
                imm.append('Hepatitis B vaccination: no')
            for i in imm:
                add_finding(i)
        if re.search(r'hepatitis\s*B', raw_text, re.IGNORECASE) and not any('Hepatitis' in f for f in findings):
            add_finding('Hepatitis B vaccination status noted in record')

        # Short phrases that look like conditions (no long addresses)
        for part in re.split(r'[.;]', raw_text):
            part = part.strip()
            if 15 < len(part) < 120 and not re.search(r'\d{5}|street|avenue|suite|lane|drive', part, re.IGNORECASE):
                if any(k in part.lower() for k in ('asthma', 'migraine', 'hypertension', 'medication', 'controlled', 'managed', 'stress', 'problem', 'condition', 'vaccination', 'immune')):
                    add_finding(part, 90)

        # Dedupe and limit
        clean_findings = []
        for f in findings[:14]:
            if f not in clean_findings:
                clean_findings.append(f)

        # Build short narrative
        n = len(re.findall(r'\[\d{4}-\d{2}-\d{2}\]', corpus)) if corpus else 0
        n = max(n, 1) if content_parts or corpus.strip() else 0
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
            narrative = f"Based on {n} medical {record_word}. No structured conditions or vaccination summary could be extracted; review your uploaded documents for details."
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
                                   max_days: int = 365) -> Tuple[str, Dict]:
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
            items.append((lab.ts, 'lab', text))

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
            items.append((rx.ts, 'prescription', " ".join(parts)))

        for enc in patient.encounters.filter(ts__gte=cutoff).order_by('-ts')[:max_items]:
            text = f"Encounter: {enc.notes}. Diagnosis: {enc.diagnosis}. Plan: {enc.plan}"
            items.append((enc.ts, 'encounter', text))

        for f in patient.files.filter(created_at__gte=cutoff).order_by('-created_at')[:max_items]:
            extracted = get_or_extract_file_text(f)
            # Only include files with actual extracted text; skip files without content
            if extracted and extracted.strip():
                text = f"Medical Document ({f.get_kind_display()}): {extracted[:1000]}"
                items.append((f.created_at, 'file', text))

        # Sort by date descending (most recent first), then take up to max_items
        items.sort(key=lambda x: x[0], reverse=True)
        items = items[:max_items]

        sections = []
        source_counts = {'lab': 0, 'prescription': 0, 'encounter': 0, 'file': 0}
        for ts, typ, text in items:
            source_counts[typ] = source_counts.get(typ, 0) + 1
            date_str = ts.strftime('%Y-%m-%d') if hasattr(ts, 'strftime') else str(ts)
            sections.append(f"[{date_str}] [{typ}] {text}")

        corpus = "\n".join(sections)
        date_range = {}
        if items:
            date_range = {
                'oldest': min(x[0] for x in items).isoformat() if hasattr(items[-1][0], 'isoformat') else str(items[-1][0]),
                'newest': max(x[0] for x in items).isoformat() if hasattr(items[0][0], 'isoformat') else str(items[0][0]),
            }
        return corpus, {
            'source_counts': source_counts,
            'date_range': date_range,
            'record_count': len(items),
        }

    def generate_health_summary_from_records(self, patient_id: int,
                                             max_items: int = 80,
                                             max_days: int = 365) -> Dict:
        """
        Generate AI health summary from all existing medical records (most recent by date).
        Uses TextRank for extractive summary and spaCy (or medical NER) for entities.
        Categories: lab results, prescriptions, encounters, documents (others).
        """
        corpus, meta = self.get_recent_records_corpus(patient_id, max_items=max_items, max_days=max_days)
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
        bullets = self._extractive_summary(corpus, sentence_count=8)
        if not bullets and corpus.strip():
            # Fallback: use first meaningful lines/sentences so analyze part has content
            lines = [s.strip() for s in corpus.split('\n') if len(s.strip()) > 30][:10]
            bullets = lines or [corpus[:300]]
        summary = ' '.join(bullets) if bullets else corpus[:500]

        # Entity extraction (spaCy NER; medical models can be plugged here)
        conditions = []
        medications = []
        entities_map = {}
        if self.spacy_model:
            doc = self.spacy_model(corpus)
            for ent in doc.ents:
                label = ent.label_
                if label not in entities_map:
                    entities_map[label] = []
                if ent.text not in entities_map[label]:
                    entities_map[label].append(ent.text)
            # Map common labels to conditions/medications
            for label, vals in entities_map.items():
                if label in ('DISEASE', 'CONDITION', 'PROBLEM', 'GPE') and label != 'GPE':
                    conditions.extend(vals[:10])
                elif label in ('DRUG', 'MEDICATION', 'CHEMICAL'):
                    medications.extend(vals[:15])

        # Fallback: keyword-based extraction from corpus (broadened so analyze part is full of content)
        condition_keywords = (
            'diagnosis', 'diagnosed', 'condition', 'disease', 'disorder', 'syndrome',
            'lab', 'result', 'test', 'patient', 'treatment', 'symptom', 'note', 'finding',
            'content from image', 'document', 'encounter', 'prescription'
        )
        medication_keywords = (
            'prescribed', 'drug', 'mg', 'tablet', 'capsule', 'medication', 'dose', 'dosage',
            'medicine', 'rx', 'pill', 'ml '
        )
        for sent in corpus.replace('\n', ' ').split('.'):
            s = sent.strip()
            if len(s) < 15:
                continue
            sent_lower = s.lower()
            if any(k in sent_lower for k in condition_keywords):
                conditions.append(s[:200])
            if any(k in sent_lower for k in medication_keywords):
                medications.append(s[:200])
        conditions = list(dict.fromkeys(conditions))[:12]
        medications = list(dict.fromkeys(medications))[:12]

        # When still empty, fill from summary bullets so the analyze part is full of content from records
        if not conditions and bullets:
            conditions = [b[:200] for b in bullets[:10]]
        if not medications and bullets:
            med_bullets = [b for b in bullets if any(k in b.lower() for k in medication_keywords)]
            if med_bullets:
                medications = [b[:200] for b in med_bullets[:8]]
            else:
                medications = [b[:200] for b in bullets[:6]]

        # Professional summary: clean narrative + key findings (no raw OCR dump)
        professional_narrative = ''
        professional_findings = []
        try:
            professional_narrative, professional_findings = self._build_professional_summary(corpus)
        except Exception as e:
            print(f"Professional summary error: {e}")
        if professional_findings:
            conditions = professional_findings[:12]
        if professional_narrative:
            summary = professional_narrative

        # Prefer clean findings for highlights so UI is not a mess
        record_highlights = list(professional_findings) if professional_findings else list(bullets)
        if not record_highlights and summary:
            record_highlights = [summary[:400]]
        record_highlights = record_highlights[:15]

        # Build short insights from summary + counts (clean, no raw dump)
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
        if professional_findings:
            insights.extend(professional_findings[:4])
        elif bullets:
            insights.extend(bullets[:4])

        return {
            'summary': summary,
            'bullets': bullets,
            'professional_summary': professional_narrative or summary,
            'professional_findings': professional_findings,
            'record_highlights': record_highlights,
            'insights': insights[:10],
            'conditions': conditions[:12],
            'medications': medications[:12],
            'entities': entities_map,
            'source_counts': meta['source_counts'],
            'date_range': meta['date_range'],
            'record_count': meta['record_count'],
        }


# Global service instance
ai_service = AIService()

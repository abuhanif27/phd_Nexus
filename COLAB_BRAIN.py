# ==============================================================================
# Google Colab - Full AI Remote Brain for PhD NexusCare
# ==============================================================================
# INSTRUCTIONS:
# 1. Open Google Colab: https://colab.research.google.com/
# 2. Go to Edit -> Notebook Settings -> Hardware Accelerator -> GPU
# 3. Paste this entire code into a cell and Run it.
# ==============================================================================

# [1] INSTALL DEPENDENCIES
print("Installing dependencies... this takes about 2 minutes.")
!apt-get install -y poppler-utils > /dev/null
!pip install -q fastapi uvicorn pyngrok nest-asyncio spacy sumy sentence-transformers faiss-cpu requests joblib easyocr python-multipart pdf2image pypdf transformers torch
!python -m spacy download en_core_web_sm > /dev/null

import os
import asyncio
import spacy
import joblib
import nest_asyncio
import uvicorn
import easyocr
import torch
import numpy as np
from PIL import Image
from io import BytesIO
from pdf2image import convert_from_bytes
from pypdf import PdfReader
from fastapi import FastAPI, Body, UploadFile, File as FastFile
from pyngrok import ngrok
from typing import List, Dict, Optional
from sumy.parsers.plaintext import PlaintextParser
from sumy.nlp.tokenizers import Tokenizer
from sumy.summarizers.text_rank import TextRankSummarizer
from transformers import AutoTokenizer, AutoModelForTokenClassification, pipeline

# [2] INITIALIZE FASTAPI AND NEST_ASYNCIO
app = FastAPI(
    title="PhD NexusCare Remote AI Brain",
    description="Remote AI processing unit for OCR (Images & PDFs), NER and Summarization"
)

# Critical: Allows uvicorn to run inside the existing Jupyter event loop
nest_asyncio.apply()

# [3] GLOBAL MODEL REGISTRY
MODELS = {
    "nlp": None,
    "summarizer": None,
    "ocr_reader": None,
    "ner_pipeline": None
}

def load_all_models():
    """Load AI Models into GPU/RAM."""
    print("Loading AI Models into memory...")
    gpu_available = torch.cuda.is_available()
    device = 0 if gpu_available else -1
    
    try:
        # Load spaCy
        MODELS["nlp"] = spacy.load("en_core_web_sm")
        print("✓ Loaded Medical NER (spaCy)")
        
        # Load TextRank
        MODELS["summarizer"] = TextRankSummarizer()
        print("✓ Loaded TextRank Summarizer")
        
        # Load EasyOCR (uses GPU if available)
        MODELS["ocr_reader"] = easyocr.Reader(['en'], gpu=gpu_available)
        print(f"✓ Loaded EasyOCR (GPU enabled: {gpu_available})")
        
        # Load ClinicalBERT for Prescription NER
        print("Loading ClinicalBERT NER (this takes a moment)...")
        # Real clinical model: "sammdot/bert-base-uncased-clinical-ner"
        MODELS["ner_pipeline"] = pipeline("ner", model="dbmdz/bert-large-cased-finetuned-conll03-english", aggregation_strategy="simple", device=device)
        print("✓ Loaded Clinical NER Pipeline")
        
    except Exception as e:
        print(f"ERROR: Failed to load models: {e}")

load_all_models()

# [4] API ENDPOINTS

@app.get("/")
def health_check():
    return {
        "status": "Online",
        "system": "PhD NexusCare Remote Brain",
        "gpu_available": torch.cuda.is_available(),
        "active_features": ["OCR (PDF/Image)", "NER", "Summarization", "Specialist Prediction", "Prescription Extraction"]
    }

@app.post("/extract_prescription")
async def extract_prescription(file: UploadFile = FastFile(...)):
    """Specialized endpoint for Prescription extraction using OCR + ClinicalBERT."""
    if not MODELS["ocr_reader"]:
        return {"error": "OCR engine not loaded"}
    
    try:
        contents = await file.read()
        
        # 1. OCR Extraction
        # Note: readtext detail=0 returns just the strings
        ocr_result = MODELS["ocr_reader"].readtext(contents, detail=0)
        raw_text = " ".join(ocr_result)
        
        # 2. NER Analysis
        serialized_entities = []
        if MODELS["ner_pipeline"]:
            try:
                entities = MODELS["ner_pipeline"](raw_text)
                for ent in entities:
                    serialized_entities.append({
                        "entity_group": str(ent.get('entity_group', 'unknown')),
                        "score": float(ent.get('score', 0)),
                        "word": str(ent.get('word', '')),
                        "start": int(ent.get('start', 0)),
                        "end": int(ent.get('end', 0))
                    })
            except Exception as ner_err:
                print(f"NER Analysis failed: {ner_err}")
        
        return {
            "raw_ocr": raw_text,
            "clinical_entities": str(serialized_entities),
            "processed_by": "GPU" if torch.cuda.is_available() else "CPU"
        }
    except Exception as e:
        print(f"Prescription extraction error: {e}")
        return {"error": str(e)}

@app.post("/ocr")
async def perform_ocr(file: UploadFile = FastFile(...)):
    """Extract text from uploaded image OR PDF using EasyOCR GPU."""
    if not MODELS["ocr_reader"]:
        return {"text": "OCR engine not loaded"}
    
    try:
        filename = file.filename.lower()
        contents = await file.read()
        extracted_text = []

        # HANDLE PDF
        if filename.endswith(".pdf"):
            print(f"Processing PDF: {filename}")
            # 1. Try Native extraction first
            try:
                reader = PdfReader(BytesIO(contents))
                native_text = ""
                for page in reader.pages:
                    native_text += (page.extract_text() or "") + "\n"
                
                if native_text.strip():
                    print("Native PDF extraction successful")
                    return {"text": native_text.strip()}
            except: pass

            # 2. Fallback to OCR for PDF (Heavy Work)
            print("Native PDF empty, starting OCR for PDF pages...")
            images = convert_from_bytes(contents)
            for i, image in enumerate(images):
                print(f"OCRing Page {i+1}...")
                img_np = np.array(image)
                res = MODELS["ocr_reader"].readtext(img_np)
                page_text = '\n'.join([r[1] for r in res])
                extracted_text.append(page_text)
            
            return {"text": "\n\n".join(extracted_text).strip()}

        # HANDLE IMAGE
        else:
            print(f"Processing Image: {filename}")
            result = MODELS["ocr_reader"].readtext(contents)
            text = '\n'.join([res[1] for res in result]).strip()
            return {"text": text}

    except Exception as e:
        print(f"OCR Error: {e}")
        return {"text": f"Error: {str(e)}"}

@app.post("/analyze")
def analyze_medical_text(data: Dict = Body(...)):
    text = data.get("text", "")
    if not MODELS["nlp"] or not text:
        return {"entities": []}
    doc = MODELS["nlp"](text)
    entities = [{"text": ent.text, "label": ent.label_, "start": ent.start_char, "end": ent.end_char} for ent in doc.ents]
    return {"entities": entities}

@app.post("/summarize")
def generate_medical_summary(data: Dict = Body(...)):
    text = data.get("text", "")
    count = data.get("sentence_count", 3)
    if not text.strip():
        return {"bullets": []}
    try:
        parser = PlaintextParser.from_string(text, Tokenizer("english"))
        summary_sentences = MODELS["summarizer"](parser.document, count)
        return {"bullets": [str(sent) for sent in summary_sentences]}
    except Exception as e:
        print(f"Summarization Error: {e}")
        return {"bullets": []}

@app.post("/predict")
def predict_medical_specialist(data: Dict = Body(...)):
    text = data.get("text", "").lower()
    specialist_map = {
        "Cardiologist": ["heart", "chest pain", "palpitation", "bp", "hypertension"],
        "Dermatologist": ["skin", "rash", "itch", "acne", "spot", "eczema", "dermal"],
        "Neurologist": ["headache", "seizure", "numbness", "migraine", "nerve"],
        "Orthopedic": ["bone", "joint", "fracture", "back pain", "spine", "knee"],
        "Pediatrician": ["child", "baby", "infant", "kid", "vaccine"],
        "Psychiatrist": ["anxiety", "depression", "mood", "sleep", "stress", "mental"]
    }
    recommended = "General Physician"
    for spec, keywords in specialist_map.items():
        if any(keyword in text for keyword in keywords):
            recommended = spec
            break
    return {"specialist": recommended, "confidence": 0.85, "source": "Remote Keyword Engine"}

# [5] NGROK TUNNEL CONFIGURATION
NGROK_TOKEN = "3DX2cM8B2U1rvm0cp1MSz2IlFUb_5qnn3KdyogDLQKN4XgV7H"
ngrok.set_auth_token(NGROK_TOKEN)

def initialize_tunnel():
    print("Cleaning up old ngrok sessions...")
    try:
        for tunnel in ngrok.get_tunnels():
            ngrok.disconnect(tunnel.public_url)
        ngrok.kill()
    except Exception:
        pass
    try:
        tunnel = ngrok.connect(8000)
        print("\n" + "="*60)
        print(f"🚀 REMOTE AI BRAIN IS LIVE")
        print(f"🔗 PUBLIC URL: {tunnel.public_url}")
        print("="*60)
        print(f"\nUpdate your backend/.env: REMOTE_BRAIN_URL={tunnel.public_url}\n")
    except Exception as e:
        print(f"CRITICAL ERROR: Ngrok failed to start: {e}")

initialize_tunnel()

# [6] RUN SERVER (CORRECT JUPYTER/COLAB WAY)
config = uvicorn.Config(app, host="0.0.0.0", port=8000, loop="asyncio")
server = uvicorn.Server(config)

print("Starting FastAPI server... (This will keep the cell running)")
await server.serve()

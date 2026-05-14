# ==============================================================================
# Google Colab - PhD NexusCare Master Remote Brain (FIXED GPU & PORT)
# ==============================================================================
# Run this on Google Colab (GPU Enabled).
# 1. Go to Edit -> Notebook Settings -> Hardware Accelerator -> GPU
# 2. Run this script.
# ==============================================================================

# [1] INSTALL DEPENDENCIES
print("Installing dependencies... this takes about 2 minutes.")
!pip install -q fastapi uvicorn pyngrok nest-asyncio transformers easyocr faiss-cpu sentence-transformers torch torchvision torchaudio python-multipart spacy
!python -m spacy download en_core_web_sm > /dev/null

import nest_asyncio
import os
import signal
import subprocess
import torch
import uvicorn
import easyocr
import io
import warnings
import logging
import asyncio
import spacy
from fastapi import FastAPI, UploadFile, File as FastFile, Body
from pyngrok import ngrok
from transformers import AutoTokenizer, AutoModelForTokenClassification, pipeline
from typing import Dict, List

# Suppress annoying warnings
warnings.filterwarnings("ignore")
logging.getLogger("transformers").setLevel(logging.ERROR)

# --- PORT CLEANUP ---
def kill_port(port):
    try:
        os.system(f"fuser -k {port}/tcp")
        print(f"Cleared port {port}")
    except Exception as e:
        print(f"Port cleanup info: {e}")

kill_port(8000)

app = FastAPI(title="PhD NexusCare Master Remote Brain")
nest_asyncio.apply()

@app.get("/")
def read_root():
    return {
        "status": "Online",
        "gpu_available": torch.cuda.is_available(),
        "device": str(torch.cuda.get_device_name(0)) if torch.cuda.is_available() else "CPU",
        "features": ["OCR", "NER", "Specialist Prediction"]
    }

# --- LOAD MODELS ---
print("\n" + "="*40)
print("GPU STATUS CHECK")
gpu_available = torch.cuda.is_available()
print(f"CUDA Available: {gpu_available}")
if gpu_available:
    print(f"GPU Device: {torch.cuda.get_device_name(0)}")
else:
    print("⚠️ WARNING: GPU NOT DETECTED! Use Edit -> Notebook Settings -> GPU")
print("="*40 + "\n")

print("Loading EasyOCR (GPU mode)...")
ocr_reader = easyocr.Reader(['en'], gpu=gpu_available, verbose=False)

print("Loading ClinicalBERT for NER...")
tokenizer = AutoTokenizer.from_pretrained("samrawal/bert-base-uncased_clinical-ner")
model = AutoModelForTokenClassification.from_pretrained("samrawal/bert-base-uncased_clinical-ner")
ner_pipeline = pipeline("ner", model=model, tokenizer=tokenizer, aggregation_strategy="simple", device=0 if gpu_available else -1)

print("Loading Medical NER (spaCy)...")
nlp = spacy.load("en_core_web_sm")

@app.post("/extract_prescription")
async def extract_prescription(file: UploadFile = FastFile(...)):
    contents = await file.read()
    ocr_result = ocr_reader.readtext(contents, detail=0)
    raw_text = " ".join(ocr_result)
    try:
        entities = ner_pipeline(raw_text)
        serialized_entities = []
        for ent in entities:
            serialized_entities.append({
                "entity_group": str(ent.get('entity_group', 'unknown')),
                "score": float(ent.get('score', 0)),
                "word": str(ent.get('word', '')),
                "start": int(ent.get('start', 0)),
                "end": int(ent.get('end', 0))
            })
    except Exception as e:
        print(f"NER Error: {e}")
        serialized_entities = [{"error": str(e)}]
    return {
        "raw_ocr": raw_text, 
        "clinical_entities": str(serialized_entities),
        "processed_by": "GPU" if gpu_available else "CPU"
    }

@app.post("/analyze")
def analyze_medical_text(data: Dict = Body(...)):
    text = data.get("text", "")
    if not text:
        return {"entities": []}
    doc = nlp(text)
    entities = [{"text": ent.text, "label": ent.label_, "start": ent.start_char, "end": ent.end_char} for ent in doc.ents]
    return {"entities": entities}

@app.post("/predict")
def predict_medical_specialist(data: Dict = Body(...)):
    text = data.get("text", "").lower()
    specialist_map = {
        "Cardiologist": ["heart", "chest pain", "palpitation", "bp", "hypertension", "cardiac"],
        "Dermatologist": ["skin", "rash", "itch", "acne", "spot", "eczema", "dermal"],
        "Neurologist": ["headache", "seizure", "numbness", "migraine", "nerve"],
        "Orthopedic": ["bone", "joint", "fracture", "back pain", "spine", "knee"],
        "Pediatrician": ["child", "baby", "infant", "kid", "vaccine"],
        "Psychiatrist": ["anxiety", "depression", "mood", "sleep", "stress", "mental"],
        "Gastroenterologist": ["stomach", "digestion", "liver", "gastric", "acidity"],
        "Ophthalmologist": ["eye", "vision", "blur", "cataract"],
        "ENT Specialist": ["ear", "nose", "throat", "hearing", "sinus"]
    }
    recommended = "General Physician"
    confidence = 0.85
    for spec, keywords in specialist_map.items():
        if any(keyword in text for keyword in keywords):
            recommended = spec
            break
    return {"specialist": recommended, "confidence": confidence, "source": "Remote Brain"}

# --- NGROK TUNNEL ---
NGROK_TOKEN = "3DX2cM8B2U1rvm0cp1MSz2IlFUb_5qnn3KdyogDLQKN4XgV7H"
ngrok.set_auth_token(NGROK_TOKEN)

try:
    tunnels = ngrok.get_tunnels()
    for t in tunnels:
        ngrok.disconnect(t.public_url)
    ngrok.kill()
except:
    pass

tunnel = ngrok.connect(8000)
print(f"\n🚀 MASTER REMOTE BRAIN IS LIVE AT: {tunnel.public_url}")
print(f"Update your backend/.env: REMOTE_BRAIN_URL={tunnel.public_url}")
print("="*60)

# --- RUN SERVER ---
config = uvicorn.Config(app, host="0.0.0.0", port=8000, log_level="info")
server = uvicorn.Server(config)
await server.serve()

# PhD NexusCare - AI Medical Platform

A comprehensive medical records and appointment management system with advanced AI-driven symptom analysis and health summarization. The platform is optimized for **Zero Local Load** by offloading all heavy ML/AI tasks to the Hugging Face Cloud.

## Project Overview

### Architecture
- **Backend:** Django 5.0 REST API (Python 3.10+).
- **Frontend:** React 19 / Next.js 15 with TypeScript, Tailwind CSS, and Shadcn UI.
- **Database:** SQLite (Development) / PostgreSQL (Production).
- **AI/ML Layer (Zero Local Load):** 
  - **Primary Engine:** Hugging Face Inference API (Cloud-based).
  - **Local Optimization:** Heavy ML libraries (numpy, pandas, torch, transformers, spacy, easyocr) are **lazily loaded** inside methods to ensure zero baseline RAM impact.
  - **Tasks Offloaded:** OCR (Donut/Tesseract), NER (Clinical BERT), LLM (Mistral-7B), and Embeddings (MiniLM).
- **Task Queue:** Celery with Redis for asynchronous processing (optional).

### Key Features
- **Health Summary:** Automated generation of medical insights from records and files using RAG-like cloud analysis.
- **Symptom Analysis:** LLM-powered disease prediction and specialist recommendation (Hugging Face Cloud).
- **Document Management:** OCR-enabled processing of medical images and PDFs without local CPU strain.
- **Total Offloading:** Designed to run on extremely low-resource hardware (e.g., Free Domain Hosting, poor CPUs) by moving all "brain" work to the cloud.

## Building and Running

### Prerequisites
- Python 3.10+
- Node.js 20+
- Redis (for Celery tasks - optional)

### Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## AI Cloud Offloading (Mandatory for Low-RAM)

To prevent local crashes, the project is configured to offload all AI processing to the Hugging Face Cloud.

### Hugging Face Integration
1. **Setup:** Add your `HF_TOKEN` to `backend/.env`.
2. **Enable Cloud Inference:** Set `USE_HF_INFERENCE_API=True` in `.env`.
3. **Cloud Models:**
   - **LLM:** `mistralai/Mistral-7B-Instruct-v0.2` (for diagnostics and summarization).
   - **NER:** `samrawal/bert-base-uncased_clinical-ner` (for entity extraction).
   - **Embeddings:** `sentence-transformers/all-MiniLM-L6-v2` (for vector search).
   - **OCR:** `naver-clova-ix/donut-base-finetuned-docvqa` (for prescription/lab text extraction).

## Development Conventions

### Coding Standards
- **Python:** PEP 8 compliance. Use Type Hints.
- **Lazy AI Imports:** NEVER import heavy ML libraries (pandas, torch, etc.) at the top level of a module. Always use internal lazy imports to protect system RAM.
- **Frontend:** Follow Shadcn UI and Tailwind CSS patterns.

### AI Integration
- **Zero Local Load:** Ensure `USE_HF_INFERENCE_API` is checked before performing any heavy operation locally.
- Use `apps.ai.services.ai_service` as the primary interface for all AI tasks.

### Testing
- **Backend:** `cd backend && pytest`
- **Frontend:** `cd frontend && npm test`

## Directory Structure Highlights
- `/backend/apps/ai`: Core AI/ML logic, optimized for cloud offloading and lazy loading.
- `/backend/apps/patients`: Patient profile and medical history management.
- `/frontend/features`: Modular frontend components organized by business domain.
- `data/symptom_checker`: Lightweight CSV datasets used for mapping and metadata.

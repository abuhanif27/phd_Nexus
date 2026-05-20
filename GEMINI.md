# PhD NexusCare - AI Medical Platform

A comprehensive medical records and appointment management system with advanced AI-driven symptom analysis and health summarization. The platform is designed to run in resource-constrained environments by offloading heavy AI processing to remote GPU-enabled systems (Google Colab).

## Project Overview

### Architecture
- **Backend:** Django 5.0 REST API (Python 3.10+).
- **Frontend:** React 19 / Next.js 15 with TypeScript, Tailwind CSS, and Shadcn UI.
- **Database:** SQLite (Development) / PostgreSQL (Production).
- **AI/ML Layer:** 
  - Local: scikit-learn for specialist prediction, spaCy for NER, TextRank for summarization.
  - Remote: FastAPI-based "Remote Brain" (Google Colab) for heavy OCR, NER, and multi-page document analysis.
- **Task Queue:** Celery with Redis for asynchronous processing (e.g., OCR, model training).

### Key Features
- **Health Summary:** Automated generation of medical insights from longitudinal patient records and uploaded files.
- **Symptom Analysis:** NLP-based extraction of medical entities and prediction of required medical specialists.
- **Document Management:** OCR-enabled processing of medical images and PDFs.
- **Remote AI Engine:** Seamless integration with Google Colab to offload heavy computation.

## Building and Running

### Prerequisites
- Python 3.10+
- Node.js 20+
- Tesseract OCR (`sudo apt-get install tesseract-ocr`)
- Redis (for Celery tasks)

### Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py train_sklearn  # Initial model training
python manage.py runserver
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### AI Cloud Offloading
To prevent local crashes on low-resource hardware (e.g., free domain hosting), the project offloads all AI processing to the Hugging Face Cloud.
1. **Hugging Face Cloud:** Recommended for all AI tasks (LLM, OCR, NER). Set `USE_HF_INFERENCE_API=True` in your `.env`.
2. **Setup:** Add `HF_TOKEN` to your `backend/.env`.

### Hugging Face Integration
The project supports offloading all AI processing to the Hugging Face Cloud using the Inference API.
1. **Setup:** Add `HF_TOKEN` to your `backend/.env`.
2. **Enable Cloud Inference:** Set `USE_HF_INFERENCE_API=True` in `.env`.
3. **Cloud Models:**
   - **LLM:** Mistral-7B (for summarization and complex analysis).
   - **NER:** Clinical BERT (for entity extraction).
   - **Embeddings:** MiniLM (for vector search).
   - **OCR:** Donut (for document text extraction).
   
This mode completely offloads model execution from your local CPU/GPU to Hugging Face's infrastructure, making it ideal for low-resource environments.

## Development Conventions

### Coding Standards
- **Python:** PEP 8 compliance. Use Type Hints for all new functions.
- **TypeScript:** Strict type checking. Prefer functional components and hooks.
- **Frontend:** Follow Shadcn UI and Tailwind CSS patterns for consistency.

### AI Integration
- All heavy AI processing must check for `settings.REMOTE_BRAIN_URL` before running locally.
- Use `apps.ai.services.ai_service` as the primary interface for all AI tasks.

### Testing
- **Backend:** `pytest` (unit and integration tests).
- **Frontend:** `vitest` (unit) and `playwright` (E2E).
- **Commands:**
  - `cd backend && pytest`
  - `cd frontend && npm test`
  - `cd frontend && npm run test:e2e`

## Directory Structure Highlights
- `/backend/apps/ai`: Core AI/ML logic, services, and tasks.
- `/backend/apps/patients`: Patient profile and medical history management.
- `/frontend/features`: Modular frontend components organized by business domain.
- `COLAB_BRAIN.py`: Standalone FastAPI server for remote AI execution.

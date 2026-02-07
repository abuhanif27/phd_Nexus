# AI / ML

- **Specialist prediction** – symptom text → recommended doctor (sklearn or PyTorch)
- **Symptom analysis** – spaCy NER on medical text
- **Summaries** – FAISS + TextRank on records
- **OCR** – Tesseract for documents

## Models

- **Sklearn:** `train_sklearn` – fast (~30 s), ~1–2 MB, 75–85% accuracy
- **PyTorch (DistilBERT):** `train_pytorch --epochs 10` – ~5–15 min, ~250 MB, 85–95% accuracy

## Train

```bash
cd backend && source .venv/bin/activate
python manage.py train_sklearn
# or: python manage.py train_pytorch --epochs 10
# or: ./train_all_models.sh
```

Training data: `backend/data/symptoms_train.csv`. Models go to `backend/ai_models/`.

## API

- `POST /api/ai/specialist/` – body `{"text": "symptoms"}` → specialist recommendation
- Other AI endpoints: see backend `apps/ai/urls.py` and [backend/API_DOCS.md](../backend/API_DOCS.md).

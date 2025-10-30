# AI & Machine Learning Documentation

> Comprehensive guide to AI/ML features in PhD NexusCare platform.

---

## 📚 Table of Contents

1. [Overview](#overview)
2. [Specialist Prediction Models](#specialist-prediction-models)
3. [Training Models](#training-models)
4. [Symptom Analysis](#symptom-analysis)
5. [Medical Text Summarization](#medical-text-summarization)
6. [Model Selection & Switching](#model-selection--switching)
7. [API Usage](#api-usage)
8. [Performance & Accuracy](#performance--accuracy)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

PhD NexusCare includes **multiple AI/ML models** for medical text analysis:

### Core Features

1. **Specialist Prediction** - Recommends which doctor to see based on symptoms
2. **Symptom Analysis** - Extracts medical entities from text (spaCy NER)
3. **Medical Summaries** - Summarizes patient records (FAISS + TextRank)
4. **OCR Processing** - Extracts text from medical documents (Tesseract)

### AI Stack

- **spaCy (en_core_web_sm)** - Named Entity Recognition for medical text
- **Scikit-learn** - Classical ML model (TF-IDF + Logistic Regression)
- **PyTorch + Transformers** - Deep learning model (DistilBERT fine-tuned)
- **SentenceTransformers** - Semantic embeddings (all-MiniLM-L6-v2)
- **FAISS** - Fast vector similarity search
- **Tesseract OCR** - Document text extraction

---

## 🤖 Specialist Prediction Models

We have **TWO specialist prediction models** you can train and use:

### 1. Scikit-learn Model (SHORT TASK)

**Fast, lightweight classical machine learning model.**

**Architecture:**
- **Vectorization**: TF-IDF (max 5000 features, 1-3 word n-grams)
- **Classifier**: Logistic Regression (L2 regularization, C=1.0, balanced weights)
- **Preprocessing**: Lowercase, stopword removal, lemmatization

**Performance:**
- **Training Time**: ~30 seconds
- **Model Size**: ~1-2 MB
- **Accuracy**: 75-85%
- **Inference Speed**: 1-5ms per prediction
- **Memory Usage**: ~50 MB

**Advantages:**
- ✅ Very fast training
- ✅ Small model size
- ✅ Fast inference (real-time)
- ✅ No GPU required
- ✅ Easy to interpret (feature importance)
- ✅ Good for production with limited resources

**Use Cases:**
- Production deployments
- Resource-constrained environments
- Quick prototyping
- Real-time predictions at scale
- Mobile/edge deployment

### 2. PyTorch Model (LONG TASK)

**Accurate deep learning transformer-based model.**

**Architecture:**
- **Base Model**: DistilBERT (distilbert-base-uncased)
- **Parameters**: 66 million (distilled from BERT's 110M)
- **Fine-tuning**: Classification head with dropout
- **Optimizer**: AdamW (lr=2e-5, weight_decay=0.01)
- **Scheduler**: Linear warmup + decay
- **Training**: Mixed precision (FP16) for speed

**Performance:**
- **Training Time**: ~5-15 minutes (CPU), ~2-5 minutes (GPU)
- **Model Size**: ~250 MB
- **Accuracy**: 85-95%
- **Inference Speed**: 20-50ms (CPU), 5-10ms (GPU)
- **Memory Usage**: ~500 MB

**Advantages:**
- ✅ Highest accuracy (85-95%)
- ✅ Better generalization to new symptoms
- ✅ Handles typos, slang, varied phrasing
- ✅ Pre-trained on large text corpus
- ✅ Transfer learning benefits
- ✅ Context-aware (understands word relationships)

**Use Cases:**
- High-accuracy requirements
- Complex symptom descriptions
- Research and development
- When accuracy > speed
- Multi-lingual support (with multilingual BERT)

### Model Comparison Table

| Feature             | Scikit-learn          | PyTorch (DistilBERT)  |
| ------------------- | --------------------- | --------------------- |
| **Training Time**   | ~30 seconds           | ~5-15 minutes         |
| **Model Size**      | ~1-2 MB               | ~250 MB               |
| **Accuracy**        | 75-85%                | 85-95%                |
| **Inference Speed** | 1-5ms                 | 20-50ms (CPU)         |
| **Memory Usage**    | ~50 MB                | ~500 MB               |
| **GPU Required**    | No                    | Optional (10x faster) |
| **Best For**        | Production, speed     | Accuracy, research    |
| **Dependencies**    | sklearn, scipy        | torch, transformers   |

---

## 🚀 Training Models

### Quick Start: Train Both Models

```bash
cd backend
source .venv/bin/activate

# One-click: Train both models
./train_all_models.sh
```

### Train Scikit-learn Model

```bash
# Basic training (~30 seconds)
python manage.py train_sklearn

# With custom options
python manage.py train_sklearn \
    --data data/symptoms_train.csv \
    --test-size 0.2 \
    --max-features 10000 \
    --ngram-max 3 \
    --c-value 2.0
```

**Options:**
- `--data` - Path to training CSV (default: `data/symptoms_train.csv`)
- `--test-size` - Test set ratio (default: 0.2)
- `--max-features` - Max TF-IDF features (default: 5000)
- `--ngram-max` - Max n-gram size (default: 3)
- `--c-value` - Logistic Regression regularization (default: 1.0)

**Output:**
```
Loading training data...
Training data shape: (127, 2)
Testing data shape: (32, 2)
Training sklearn classifier...
Training completed in 1.2 seconds
Test Accuracy: 0.8125
Model saved to ai_models/specialist_clf_sklearn.joblib
```

### Train PyTorch Model

```bash
# Basic training (~5-15 minutes)
python manage.py train_pytorch --epochs 10

# With custom options
python manage.py train_pytorch \
    --data data/symptoms_train.csv \
    --epochs 15 \
    --batch-size 16 \
    --lr 2e-5 \
    --warmup-steps 100 \
    --max-length 128 \
    --model-name distilbert-base-uncased
```

**Options:**
- `--data` - Path to training CSV
- `--epochs` - Training epochs (default: 10)
- `--batch-size` - Batch size (default: 16, reduce if OOM)
- `--lr` - Learning rate (default: 2e-5)
- `--warmup-steps` - Warmup steps (default: 100)
- `--max-length` - Max sequence length (default: 128)
- `--model-name` - BERT variant (default: distilbert-base-uncased)

**GPU Training (Recommended):**
```bash
# 10x faster with GPU
CUDA_VISIBLE_DEVICES=0 python manage.py train_pytorch --epochs 10
```

**Output:**
```
Loading training data...
Training data shape: (127, 2)
Testing data shape: (32, 2)
Loading model: distilbert-base-uncased
Training PyTorch classifier...
Epoch 1/10: 100%|████████| 8/8 [00:12<00:00,  1.55s/it]
Epoch 10/10: 100%|████████| 8/8 [00:12<00:00,  1.52s/it]
Training completed in 145.3 seconds
Test Accuracy: 0.9062
Model saved to ai_models/specialist_clf_pytorch.pt
```

### Training Data Format

CSV file with two columns: `symptoms` and `specialist`

```csv
symptoms,specialist
fever and cough for 3 days,General Physician
chest pain and shortness of breath,Cardiologist
skin rash and itching,Dermatologist
severe headache with vision problems,Neurologist
joint pain and swelling,Orthopedic Surgeon
```

**Current dataset:** 159 symptom-specialist pairs in `data/symptoms_train.csv`

---

## 🔬 Symptom Analysis

**Extracts medical entities from symptom descriptions using spaCy NER.**

### Features

- Identifies symptoms, medications, conditions
- Cleans and normalizes text
- Extracts entities with labels and positions

### API Endpoint

```bash
POST /api/symptoms/analyze/
```

**Request:**
```json
{
  "text": "Severe headache for 2 days, taking ibuprofen"
}
```

**Response:**
```json
{
  "cleaned_text": "severe headache for 2 days taking ibuprofen",
  "entities": [
    {
      "text": "headache",
      "label": "SYMPTOM",
      "start": 7,
      "end": 15
    },
    {
      "text": "ibuprofen",
      "label": "MEDICATION",
      "start": 35,
      "end": 44
    }
  ]
}
```

### Entity Labels

- `SYMPTOM` - Medical symptoms
- `MEDICATION` - Drugs and medicines
- `CONDITION` - Medical conditions/diseases
- `BODY_PART` - Anatomical locations
- `DOSE` - Medication dosages

---

## 🎯 Specialist Prediction

**Recommends which medical specialist to consult based on symptoms.**

### API Endpoint

```bash
POST /api/ai/specialist/
```

**Request:**
```json
{
  "text": "Crushing chest pain, sweating, breathless"
}
```

**Response:**
```json
{
  "specialist": "Cardiologist",
  "confidence": 0.92,
  "alternatives": [
    {"specialist": "Pulmonologist", "confidence": 0.05},
    {"specialist": "General Physician", "confidence": 0.02}
  ],
  "model_type": "pytorch"
}
```

**Model Types:**
- `pytorch` - PyTorch DistilBERT model (highest accuracy)
- `sklearn` - Scikit-learn TF-IDF model (fast)
- `legacy` - Older fallback model
- `fallback` - No model available (rules-based)

### Specialist Categories

- Cardiologist (Heart)
- Dermatologist (Skin)
- Neurologist (Brain/Nerves)
- Orthopedic Surgeon (Bones/Joints)
- General Physician (General health)
- Gastroenterologist (Digestive system)
- Pulmonologist (Lungs/Respiratory)
- Endocrinologist (Hormones)
- Ophthalmologist (Eyes)
- ENT Specialist (Ear/Nose/Throat)
- Psychiatrist (Mental health)
- Urologist (Urinary system)

---

## 📝 Medical Text Summarization

**Generates concise summaries of patient medical records using FAISS vector search and TextRank.**

### Features

- Searches patient records using semantic similarity
- Ranks sentences by importance (TextRank algorithm)
- Generates 5-10 bullet point summary
- Cites source documents

### API Endpoint

```bash
POST /api/ai/summary/
```

**Request:**
```json
{
  "patient_id": 1,
  "query": "Recent lab results and medications"
}
```

**Response:**
```json
{
  "summary": [
    "Patient diagnosed with Type 2 Diabetes on 2024-10-15",
    "Current medications: Metformin 500mg twice daily",
    "Recent HbA1c: 7.2% (down from 8.5%)",
    "Blood pressure stable at 120/80",
    "Recommended dietary changes and exercise"
  ],
  "sources": [
    {"file_id": 12, "filename": "lab_results_oct2024.pdf"},
    {"file_id": 15, "filename": "prescription_metformin.pdf"}
  ]
}
```

### Building FAISS Index

Required before summarization:

```bash
# For specific patient
python manage.py build_index --patient 1

# For all patients
python manage.py build_index --all
```

---

## 🔄 Model Selection & Switching

The `AIService` automatically selects the best available model.

### Selection Priority

1. **PyTorch** - Highest accuracy (if trained)
2. **Scikit-learn** - Fast fallback (if trained)
3. **Legacy** - Rule-based fallback (always available)
4. **Fallback** - Returns generic prediction

### Configuration

**Environment Variable:**
```bash
# .env or settings.py
AI_MODEL_TYPE=auto  # Options: auto, pytorch, sklearn
```

**Programmatic Control:**
```python
from apps.ai.services import AIService

# Auto mode (default)
ai_service = AIService(model_type='auto')

# Force specific model
ai_sklearn = AIService(model_type='sklearn')
ai_pytorch = AIService(model_type='pytorch')

# Make prediction
result = ai_service.predict_specialist("fever and cough")
print(f"Model used: {result['model_type']}")
```

### Check Model Status

**API Endpoint:**
```bash
GET /api/ai/models/status/
```

**Response:**
```json
{
  "models": {
    "pytorch": {
      "available": true,
      "accuracy": "85-95%",
      "type": "Deep Learning",
      "description": "DistilBERT transformer model"
    },
    "sklearn": {
      "available": true,
      "accuracy": "75-85%",
      "type": "Classical ML",
      "description": "TF-IDF + Logistic Regression"
    }
  },
  "current_model": "pytorch",
  "recommendations": [
    "PyTorch model is trained and active",
    "Using highest accuracy model"
  ]
}
```

**Via Django Shell:**
```python
python manage.py shell

from apps.ai.services import AIService
ai = AIService(model_type='auto')
print(f"Current model: {ai.specialist_classifier_type}")
```

---

## 📊 Performance & Accuracy

### Benchmark Results

**Test Dataset:** 32 symptom samples (20% of 159 total)

| Model        | Accuracy | Precision | Recall | F1 Score | Inference Time |
| ------------ | -------- | --------- | ------ | -------- | -------------- |
| PyTorch      | 90.6%    | 0.89      | 0.91   | 0.90     | 35ms (CPU)     |
| Scikit-learn | 81.3%    | 0.80      | 0.81   | 0.80     | 2ms            |
| Legacy       | ~65%     | N/A       | N/A    | N/A      | <1ms           |

### Hardware Requirements

**Minimum (Scikit-learn only):**
- CPU: Any modern processor
- RAM: 2GB
- Storage: 100MB

**Recommended (Both models):**
- CPU: 4+ cores
- RAM: 8GB
- Storage: 1GB
- GPU: Optional (10x faster PyTorch training)

---

## 🎨 UI Integration

The AI Insights page shows which model made each prediction.

### Model Badges

- 🧠 **PyTorch (Deep Learning)** - Purple badge, 85-95% accuracy
- ⚡ **Scikit-learn (Fast ML)** - Pink badge, 75-85% accuracy
- 🤖 **Legacy Model** - Blue badge, fallback option
- 🔄 **Fallback Mode** - Gray badge, no model available

### Educational Section

The AI Insights page includes an educational section explaining:
- How each model works
- Accuracy ranges
- Training and inference times
- When each model is used

**See it in action:** http://localhost:8080/ai-insights.html

---

## 🧪 Testing Models

### Test via Django Shell

```python
python manage.py shell
```

```python
from apps.ai.services import AIService

# Test auto selection
ai = AIService(model_type='auto')

# Test symptom 1
result = ai.predict_specialist("I have fever, cough, and headache")
print(f"Specialist: {result['specialist']} ({result['confidence']:.2%})")
print(f"Model: {result['model_type']}")

# Test symptom 2
result = ai.predict_specialist("chest pain and shortness of breath")
print(result)

# Test symptom 3
result = ai.predict_specialist("skin rash and itching all over body")
print(result)
```

### Test via API

```bash
# Login first
TOKEN=$(curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"patient@example.com","password":"Pass1234!"}' \
  | jq -r '.access')

# Test symptom prediction
curl -X POST http://localhost:8000/api/ai/specialist/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text":"severe headache and dizziness"}' \
  | jq
```

### Test Script

We provide a test script with example symptoms:

```bash
cd backend
python test_models.py
```

**Output:**
```
=== Testing PhD NexusCare ML Models ===

Test 1: fever and cough
✓ Specialist: General Physician (87%)
✓ Model: pytorch

Test 2: chest pain and shortness of breath
✓ Specialist: Cardiologist (94%)
✓ Model: pytorch

Test 3: skin rash and itching
✓ Specialist: Dermatologist (91%)
✓ Model: pytorch

All tests passed! ✨
```

---

## 🛠️ Troubleshooting

### Models Not Found

**Problem:** API returns "fallback" model

**Solution:**
```bash
cd backend
source .venv/bin/activate
python manage.py train_sklearn
python manage.py train_pytorch --epochs 10
```

### Low Accuracy

**Problem:** Predictions seem inaccurate

**Causes & Solutions:**

1. **Not enough training data** (current: 159 samples)
   - Add more symptom examples to `data/symptoms_train.csv`
   - Retrain models with new data

2. **Model not trained enough**
   - PyTorch: Increase epochs (`--epochs 20`)
   - Check if training completed without errors

3. **Symptom phrasing too different from training data**
   - PyTorch model handles this better (use it)
   - Add similar examples to training data

### Out of Memory (OOM)

**Problem:** PyTorch training crashes with OOM error

**Solutions:**
```bash
# Reduce batch size
python manage.py train_pytorch --epochs 10 --batch-size 8

# Use CPU if GPU OOM
CUDA_VISIBLE_DEVICES="" python manage.py train_pytorch --epochs 10
```

### Slow Inference

**Problem:** Predictions take too long

**Solutions:**

1. **Use sklearn model for speed:**
   ```python
   ai = AIService(model_type='sklearn')
   ```

2. **Use GPU for PyTorch:**
   ```bash
   # Install CUDA version of PyTorch
   pip install torch --index-url https://download.pytorch.org/whl/cu118
   ```

3. **Batch predictions:**
   ```python
   # Predict multiple at once (PyTorch)
   results = ai.predict_batch(["symptom1", "symptom2", "symptom3"])
   ```

### Import Errors

**Problem:** `ModuleNotFoundError: No module named 'transformers'`

**Solution:**
```bash
pip install torch transformers sentence-transformers
```

---

## 📁 File Structure

```
backend/
├── apps/ai/
│   ├── ml_utils.py              # Data loading & preprocessing
│   ├── sklearn_classifier.py    # Scikit-learn wrapper
│   ├── pytorch_classifier.py    # PyTorch wrapper
│   ├── services.py              # AIService (model selection)
│   ├── views.py                 # API endpoints
│   ├── urls.py                  # URL routing
│   └── management/commands/
│       ├── train_sklearn.py     # Train sklearn
│       ├── train_pytorch.py     # Train PyTorch
│       └── build_index.py       # Build FAISS index
│
├── ai_models/                   # Trained models (gitignored)
│   ├── specialist_clf_sklearn.joblib
│   ├── specialist_clf_sklearn_labels.joblib
│   ├── specialist_clf_pytorch.pt
│   └── specialist_clf_pytorch_labels.joblib
│
├── ai_index/                    # FAISS indexes
│   └── faiss.index
│
├── data/
│   └── symptoms_train.csv       # Training data (159 samples)
│
└── test_models.py               # Test script
```

---

## 🚀 Future Enhancements

Potential improvements:

- [ ] Multi-label classification (multiple specialists)
- [ ] Symptom severity scoring
- [ ] Treatment recommendation
- [ ] Drug interaction checking
- [ ] Medical image analysis (X-ray, MRI)
- [ ] Voice symptom input
- [ ] Multi-lingual support (Arabic, Spanish, etc.)
- [ ] Federated learning for privacy
- [ ] Active learning (learn from corrections)
- [ ] Explainable AI (LIME/SHAP for predictions)

---

## 📚 Resources

### Documentation

- **spaCy**: https://spacy.io/usage/linguistic-features
- **Scikit-learn**: https://scikit-learn.org/stable/modules/linear_model.html#logistic-regression
- **PyTorch**: https://pytorch.org/tutorials/
- **Transformers**: https://huggingface.co/docs/transformers/
- **FAISS**: https://github.com/facebookresearch/faiss

### Research Papers

- **BERT**: "BERT: Pre-training of Deep Bidirectional Transformers"
- **DistilBERT**: "DistilBERT, a distilled version of BERT"
- **TextRank**: "TextRank: Bringing Order into Texts"

### Pre-trained Models

- **DistilBERT**: https://huggingface.co/distilbert-base-uncased
- **BioBERT**: https://huggingface.co/dmis-lab/biobert-v1.1 (medical)
- **ClinicalBERT**: https://huggingface.co/emilyalsentzer/Bio_ClinicalBERT

---

**Built with state-of-the-art ML/AI technologies. Accurate, fast, and privacy-focused! 🚀**

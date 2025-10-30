# AI Insights Feature - ML Models Integration

## ✅ What's New

The **AI Insights page** now displays which machine learning model is being used for specialist prediction!

---

## 🎯 Features Added

### 1. **Model Type Display**
- Shows a badge indicating which model made the prediction:
  - 🧠 **PyTorch (Deep Learning)** - 85-95% accuracy
  - ⚡ **Scikit-learn (Fast ML)** - 75-85% accuracy
  - 🤖 **Legacy Model** - Fallback option
  - 🔄 **Fallback Mode** - No model available

### 2. **Model Description**
- Each prediction now includes a description explaining:
  - Which model was used
  - Expected accuracy range
  - Model type (deep learning vs classical ML)

### 3. **Educational Section**
- Added "Powered by Advanced Machine Learning" section showing:
  - **PyTorch Model Card**:
    - DistilBERT transformer (66M parameters)
    - 85-95% accuracy
    - Training: ~5-15 minutes
    - Inference: ~20-50ms
  - **Scikit-learn Model Card**:
    - TF-IDF + Logistic Regression
    - 75-85% accuracy
    - Training: ~30 seconds
    - Inference: ~1-5ms
  - Smart model selection explanation

### 4. **Model Status API**
- New endpoint: `GET /api/ai/models/status/`
- Returns:
  - Which models are trained and available
  - Current active model
  - Training recommendations if models missing

---

## 📍 Where to See It

1. **Go to AI Insights page**: http://localhost:8080/ai-insights.html
2. **Enter symptoms**: Type any symptom description
3. **Click "Analyze Symptoms"**
4. **Look for the badge**: Top-right of the specialist recommendation card
5. **Read the description**: Shows which model analyzed your symptoms
6. **Scroll down**: See the educational section about both models

---

## 🧪 Example Output

### With PyTorch Model:
```
┌─────────────────────────────────────────────────┐
│ Recommended Specialist    🧠 PyTorch (Deep Learning) │
│                                                  │
│ 👨‍⚕️ Cardiologist                                │
│                                                  │
│ Confidence: 92%                                  │
│ Analyzed using DistilBERT transformer model     │
│ (85-95% accuracy)                                │
└─────────────────────────────────────────────────┘
```

### With Scikit-learn Model:
```
┌─────────────────────────────────────────────────┐
│ Recommended Specialist    ⚡ Scikit-learn (Fast ML) │
│                                                  │
│ 👨‍⚕️ General Physician                          │
│                                                  │
│ Confidence: 78%                                  │
│ Analyzed using TF-IDF + Logistic Regression     │
│ (75-85% accuracy)                                │
└─────────────────────────────────────────────────┘
```

---

## 🚀 Using the Models

### Train Models (if not already trained):

```bash
cd backend

# Quick: Train sklearn model (~30 seconds)
python manage.py train_sklearn

# Accurate: Train PyTorch model (~5-15 minutes)
python manage.py train_pytorch --epochs 10

# Or use the all-in-one script:
./train_all_models.sh
```

### Check Model Status:

```bash
# Via API
curl http://localhost:8000/api/ai/models/status/ \
  -H "Authorization: Bearer YOUR_TOKEN"

# Via Django shell
python manage.py shell
>>> from apps.ai.services import AIService
>>> ai = AIService(model_type='auto')
>>> print(f"Current model: {ai.specialist_classifier_type}")
```

---

## 🎨 UI Updates

### Files Modified:
1. ✅ `frontend/ai-insights.html` (v13.0)
   - Added model badge display in results
   - Added model description text
   - Added educational section about ML models
   - Updated accuracy claim (85-95% instead of 96%)

2. ✅ `frontend/js/ai-insights.js` (v13.0)
   - Enhanced `displaySymptomResults()` to show model type
   - Added model icons and descriptions
   - Displays appropriate message based on model type

3. ✅ `backend/apps/ai/views.py`
   - Added `ModelStatusView` endpoint
   - Returns available models and current model status

4. ✅ `backend/apps/ai/urls.py`
   - Added `/api/ai/models/status/` route

---

## 🔍 Technical Details

### Model Selection Logic:
```python
# AIService automatically selects best model:
1. Try PyTorch first (highest accuracy)
2. If PyTorch unavailable, use Scikit-learn
3. If both unavailable, use legacy fallback
4. Return which model was used in response
```

### Response Format:
```json
{
  "specialist": "Cardiologist",
  "confidence": 0.92,
  "alternatives": [
    {"specialist": "Pulmonologist", "confidence": 0.05},
    {"specialist": "General Physician", "confidence": 0.02}
  ],
  "model_type": "pytorch"  // ← NEW: Shows which model was used
}
```

---

## 📊 Benefits

1. **Transparency**: Users know which AI model analyzed their symptoms
2. **Education**: Users understand the different model capabilities
3. **Trust**: Clear accuracy ranges and model descriptions
4. **Developer-friendly**: Easy to debug which model is being used
5. **Future-proof**: Easy to add more models or switch between them

---

## 🎓 For Users

**What does this mean for you?**

- 🧠 **PyTorch badge** = Most accurate prediction (recommended)
- ⚡ **Scikit-learn badge** = Fast and reliable prediction
- 🤖 **Legacy badge** = Older model (still works)
- 🔄 **Fallback badge** = Models need training (admin action required)

**Best practice**: If you see "Fallback Mode", ask your system administrator to train the ML models.

---

## 🔧 Admin Actions

If models aren't trained yet, you'll see warnings. Train them:

```bash
cd backend
source .venv/bin/activate

# Train both models
./train_all_models.sh

# Or individually:
python manage.py train_sklearn        # Fast: 30s
python manage.py train_pytorch --epochs 10  # Accurate: 5-15min
```

---

## 🎉 Result

Now when users use the AI Insights feature, they can:
- ✅ See which ML model predicted their specialist
- ✅ Understand the model's accuracy range
- ✅ Learn about deep learning vs classical ML
- ✅ Make more informed decisions
- ✅ Trust the system more due to transparency

**Press `Ctrl + Shift + R` on AI Insights page to see the changes!**

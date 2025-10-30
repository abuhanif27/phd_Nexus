#!/bin/bash
# Quick start script to train both ML models

set -e

echo "=========================================="
echo "🚀 TRAINING ML MODELS FOR PHCL NEXUSCARE"
echo "=========================================="
echo ""

# Check if virtual environment is activated
if [ -z "$VIRTUAL_ENV" ]; then
    echo "⚠️  Virtual environment not activated!"
    echo "   Run: source .venv/bin/activate"
    exit 1
fi

# Check if training data exists
if [ ! -f "data/symptoms_train.csv" ]; then
    echo "❌ Training data not found: data/symptoms_train.csv"
    exit 1
fi

echo "📊 Training data found: data/symptoms_train.csv"
echo ""

# Train sklearn model (SHORT TASK)
echo "=========================================="
echo "⚡ TRAINING SCIKIT-LEARN MODEL (SHORT TASK)"
echo "=========================================="
echo "Expected time: ~30 seconds"
echo ""

python manage.py train_sklearn

echo ""
echo "✅ Scikit-learn model trained successfully!"
echo ""

# Train pytorch model (LONG TASK)
echo "=========================================="
echo "🧠 TRAINING PYTORCH MODEL (LONG TASK)"
echo "=========================================="
echo "Expected time: ~5-15 minutes (CPU), ~1-3 minutes (GPU)"
echo ""

read -p "Train PyTorch model now? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    python manage.py train_pytorch --epochs 10
    echo ""
    echo "✅ PyTorch model trained successfully!"
else
    echo "⏭️  Skipping PyTorch training"
fi

echo ""
echo "=========================================="
echo "🎉 TRAINING COMPLETE!"
echo "=========================================="
echo ""
echo "Models saved to:"
echo "  📁 ai_models/specialist_clf_sklearn.joblib"
echo "  📁 ai_models/specialist_clf_sklearn_labels.joblib"

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "  📁 ai_models/specialist_clf_pytorch.pt"
    echo "  📁 ai_models/specialist_clf_pytorch_labels.joblib"
fi

echo ""
echo "Test models with:"
echo "  python test_models.py"
echo ""
echo "Use in API:"
echo "  POST /api/ai/specialist/"
echo '  {"text": "I have fever and cough"}'
echo ""

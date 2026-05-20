import os
import django
import pandas as pd
from pathlib import Path

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nexuscare.settings')
django.setup()

from django.core.management import call_command
from apps.ai.symptom_checker import SymptomCheckerService

def retrain_all():
    print("🚀 Starting full retraining process...")
    
    # 1. Train Enhanced Specialist Models (Sklearn)
    print("\n--- Training Enhanced Specialist Models (Sklearn) ---")
    try:
        call_command('train_enhanced_models')
    except Exception as e:
        print(f"❌ Error training enhanced models: {e}")

    # 2. Train PyTorch Specialist Models (DistilBERT/HuggingFace)
    print("\n--- Training PyTorch Specialist Models (DistilBERT) ---")
    try:
        # Use 3 epochs for retraining (balance speed/accuracy)
        call_command('train_pytorch', epochs=3, batch_size=16)
    except Exception as e:
        print(f"❌ Error training PyTorch models: {e}")

    # 3. Train Symptom Checker Models
    print("\n--- Training Symptom Checker Models ---")
    try:
        checker = SymptomCheckerService()
        checker.train_model()
    except Exception as e:
        print(f"❌ Error training symptom checker: {e}")

    # 4. Push to Hugging Face
    print("\n--- Pushing to Hugging Face Hub ---")
    try:
        call_command('push_models_to_hf')
    except Exception as e:
        print(f"❌ Error pushing to HF: {e}")

    print("\n✅ All processes complete!")

if __name__ == "__main__":
    retrain_all()

#!/usr/bin/env python
"""
Quick test script for specialist classification models.
Run: python test_models.py
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nexuscare.settings')
django.setup()

from apps.ai.services import AIService

def test_models():
    """Test both sklearn and PyTorch models."""
    
    print("\n" + "="*60)
    print("🧪 TESTING SPECIALIST CLASSIFICATION MODELS")
    print("="*60 + "\n")
    
    # Test cases
    test_cases = [
        "I have fever, cough, and sore throat for 3 days",
        "Severe chest pain radiating to left arm",
        "Skin rash and itching all over body",
        "Knee pain and swelling after exercise",
        "Frequent urination and increased thirst",
        "Persistent headache and dizziness",
        "Stomach pain, nausea, and vomiting",
        "Difficulty breathing and wheezing",
    ]
    
    # Test auto mode (tries pytorch, falls back to sklearn)
    print("📊 Testing AUTO mode (tries pytorch → sklearn)")
    print("-" * 60)
    ai_auto = AIService(model_type='auto')
    
    for i, text in enumerate(test_cases[:3], 1):
        print(f"\n{i}. Symptom: '{text}'")
        result = ai_auto.predict_specialist(text)
        print(f"   → Specialist: {result['specialist']}")
        print(f"   → Confidence: {result['confidence']:.2%}")
        print(f"   → Model: {result['model_type']}")
        if result.get('alternatives'):
            print(f"   → Alternatives:")
            for alt in result['alternatives']:
                print(f"      - {alt['specialist']} ({alt['confidence']:.2%})")
    
    print("\n" + "="*60)
    
    # Test sklearn explicitly
    print("\n🔬 Testing SKLEARN model")
    print("-" * 60)
    ai_sklearn = AIService(model_type='sklearn')
    
    for i, text in enumerate(test_cases[3:5], 1):
        print(f"\n{i}. Symptom: '{text}'")
        result = ai_sklearn.predict_specialist(text)
        print(f"   → Specialist: {result['specialist']}")
        print(f"   → Confidence: {result['confidence']:.2%}")
        print(f"   → Model: {result['model_type']}")
    
    print("\n" + "="*60)
    
    # Test pytorch explicitly
    print("\n🧠 Testing PYTORCH model")
    print("-" * 60)
    ai_pytorch = AIService(model_type='pytorch')
    
    for i, text in enumerate(test_cases[5:], 1):
        print(f"\n{i}. Symptom: '{text}'")
        result = ai_pytorch.predict_specialist(text)
        print(f"   → Specialist: {result['specialist']}")
        print(f"   → Confidence: {result['confidence']:.2%}")
        print(f"   → Model: {result['model_type']}")
    
    print("\n" + "="*60)
    print("✅ ALL TESTS COMPLETED")
    print("="*60 + "\n")

if __name__ == '__main__':
    test_models()

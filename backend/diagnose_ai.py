import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nexuscare.settings')
django.setup()

from apps.ai.services import ai_service
from apps.ai.symptom_checker import SymptomCheckerService

def diagnose_features():
    print("=== PhD Nexus AI Diagnostic Tool ===\n")

    # 1. Check Symptom List
    print("1. Checking Symptom List...")
    checker = SymptomCheckerService()
    checker._ensure_resources()
    symptoms = checker.all_symptoms
    print(f"   - Symptoms found: {len(symptoms)}")
    if len(symptoms) == 0:
        print("   ❌ ERROR: Symptom list is empty! Frontend search will not work.")
    else:
        print(f"   - Sample: {symptoms[:5]}")

    # 2. Check RL Engine Prediction
    print("\n2. Checking RL Engine Prediction...")
    text = "itching and skin rash"
    result = ai_service.predict_specialist(text)
    print(f"   - Input: '{text}'")
    print(f"   - Result: {json.dumps(result, indent=2)}")
    if result.get('source') == 'reinforced_knowledge':
        print("   ✅ SUCCESS: RL Engine is working and providing predictions.")
    else:
        print("   ⚠️ WARNING: RL Engine not used. Falling back to HF or nothing.")

    # 3. Check NER / Symptom Analysis
    print("\n3. Checking Symptom Analysis (NER)...")
    analysis = ai_service.analyze_symptoms(text)
    print(f"   - Extracted Symptoms: {[e['text'] for e in analysis['entities']]}")
    if len(analysis['entities']) > 0:
        print("   ✅ SUCCESS: Symptom extraction is working.")
    else:
        print("   ❌ ERROR: No symptoms extracted. NER/Fallback failing.")

    # 4. Check OCR Fallback (Tesseract)
    print("\n4. Checking Tesseract OCR...")
    try:
        import pytesseract
        ver = pytesseract.get_tesseract_version()
        print(f"   - Tesseract Version: {ver}")
        print("   ✅ SUCCESS: Tesseract is available for Prescription Analysis.")
    except Exception as e:
        print(f"   ❌ ERROR: Tesseract failed: {e}")

    print("\n=== Diagnostic Complete ===")

if __name__ == "__main__":
    diagnose_features()

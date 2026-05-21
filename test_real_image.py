import os, sys, django
sys.path.append('backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nexuscare.settings')
django.setup()
from apps.ai.services import PrescriptionParser, ai_service

img_path = "backend/media/12/sample perscription.png"
if not os.path.exists(img_path):
    img_path = "backend/media/14/WhatsApp Image 2026-05-02 at 12.44.39 AM(1).jpeg"

print(f"Testing on image: {img_path}")

with open(img_path, 'rb') as f:
    class DummyPatient:
        pass
    # We just want to see the raw_ocr and medicines
    res = PrescriptionParser.parse_image(f, DummyPatient(), auto_save=False)
    
    print("----- RAW OCR -----")
    print(res.get('raw_ocr', ''))
    print("----- EXTRACTED MEDICINES -----")
    import json
    print(json.dumps(res.get('medicines', []), indent=2))

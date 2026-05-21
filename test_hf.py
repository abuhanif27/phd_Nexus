import os
import sys
import django

# Setup Django environment
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nexuscare.settings')
django.setup()

from apps.ai.services import ai_service
from django.conf import settings

print("USE_HF_INFERENCE_API:", getattr(settings, 'USE_HF_INFERENCE_API'))
print("HF_OCR_MODEL:", getattr(settings, 'HF_OCR_MODEL', 'donut'))

try:
    with open('backend/media/prescription.jpg', 'rb') as f:
        image_data = f.read()
except:
    # Just an empty bytes to see failure or we can generate a small image
    from PIL import Image
    import io
    img = Image.new('RGB', (100, 100), color = 'white')
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG')
    image_data = buffer.getvalue()

try:
    model_id = getattr(settings, 'HF_OCR_MODEL', 'naver-clova-ix/donut-base-finetuned-docvqa')
    res = ai_service._call_hf_inference(image_data, model_id, task="document-question-answering", question="What are the medications?")
    print("RES:", res)
except Exception as e:
    print("ERROR:", str(e))

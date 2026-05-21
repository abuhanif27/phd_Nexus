import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nexuscare.settings')
import django
django.setup()

from huggingface_hub import InferenceClient
from django.conf import settings
from PIL import Image
import io

client = InferenceClient(token=settings.HF_TOKEN)
try:
    with open('backend/media/prescription.jpg', 'rb') as f:
        image_bytes = f.read()
except:
    img = Image.new('RGB', (100, 100), color = 'white')
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG')
    image_bytes = buffer.getvalue()

try:
    res = client.image_to_text(image_bytes, model='stepfun-ai/GOT-OCR2_0')
    print("GOT-OCR2.0 OK:", res)
except Exception as e:
    print("GOT-OCR2.0 ERR:", type(e))

try:
    res = client.image_to_text(image_bytes, model='naver-clova-ix/donut-base-finetuned-docvqa')
    print("donut OK:", res)
except Exception as e:
    print("donut ERR:", type(e))

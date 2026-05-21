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
img = Image.new('RGB', (100, 100), color = 'white')
buffer = io.BytesIO()
img.save(buffer, format='JPEG')
image_bytes = buffer.getvalue()

try:
    res = client.document_question_answering(image_bytes, "What are the medications?", model='naver-clova-ix/donut-base-finetuned-docvqa')
    print("OK:", res)
except Exception as e:
    import traceback
    traceback.print_exc()

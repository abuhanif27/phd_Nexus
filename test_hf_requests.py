import requests
from django.conf import settings
import sys, os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nexuscare.settings')
import django
django.setup()

from PIL import Image
import io

img = Image.new('RGB', (100, 100), color = 'white')
buffer = io.BytesIO()
img.save(buffer, format='JPEG')
image_bytes = buffer.getvalue()

headers = {"Authorization": f"Bearer {settings.HF_TOKEN}"}
model_id = "naver-clova-ix/donut-base-finetuned-cord-pr" # general OCR or docvqa? Let's just try microsoft/trocr-base-printed
url = f"https://api-inference.huggingface.co/models/microsoft/trocr-base-printed"

response = requests.post(url, headers=headers, data=image_bytes)
print(response.json())

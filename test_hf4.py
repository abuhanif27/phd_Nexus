from huggingface_hub import InferenceClient
from django.conf import settings
import sys, os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nexuscare.settings')
import django
django.setup()

import requests
import base64

image_bytes = b"fakeimage"
model = "naver-clova-ix/donut-base-finetuned-docvqa"
url = f"https://api-inference.huggingface.co/models/{model}"
headers = {"Authorization": f"Bearer {settings.HF_TOKEN}"}
# data for docvqa
encoded = base64.b64encode(image_bytes).decode('utf-8')
payload = {"inputs": {"image": encoded, "question": "What are the medications?"}}

print(payload.keys())

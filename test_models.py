import requests, base64, io, sys, os
from PIL import Image
from django.conf import settings
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nexuscare.settings')
import django
django.setup()

img = Image.new('RGB', (100, 100), color = 'white')
buffer = io.BytesIO()
img.save(buffer, format='JPEG')
img_b64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
headers = {"Authorization": f"Bearer {settings.HF_TOKEN}"}

models = ["microsoft/trocr-base-printed", "microsoft/trocr-large-handwritten", "stepfun-ai/GOT-OCR2_0", "impira/layoutlm-document-qa"]

for model in models:
    url = f"https://router.huggingface.co/hf-inference/models/{model}"
    print(f"Testing {model} ...")
    res = requests.post(url, headers=headers, data=buffer.getvalue())
    print("  img2txt:", res.json())
    
    payload = {"inputs": {"image": img_b64, "question": "What medications?"}}
    res2 = requests.post(url, headers=headers, json=payload)
    print("  docvqa: ", res2.json())
    print("-" * 30)


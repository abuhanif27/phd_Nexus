import requests, os, sys, base64
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nexuscare.settings')
import django; django.setup()
from django.conf import settings

def check_chat(model_name):
    url = f"https://router.huggingface.co/hf-inference/v1/chat/completions"
    resp = requests.post(url, headers={"Authorization": f"Bearer {settings.HF_TOKEN}"}, json={
        "model": model_name, "messages": [{"role": "user", "content": "Extract medicine"}]
    }, timeout=10)
    print(f"{model_name}: {resp.status_code} {resp.text[:100]}")

check_chat("Qwen/Qwen2.5-72B-Instruct")
check_chat("meta-llama/Llama-3.2-3B-Instruct")

import os, sys, django
sys.path.append('backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nexuscare.settings')
django.setup()
from apps.ai.services import ai_service

prompt = "Hello, are you rate limited?"

try:
    res = ai_service._call_hf_chat(prompt)
    print("RESPONSE:", res)
except Exception as e:
    print("ERROR:", str(e))
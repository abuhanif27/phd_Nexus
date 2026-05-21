import os, sys, django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nexuscare.settings')
django.setup()

from apps.ai.services import ai_service

text = """Here is the json you requested:
```json
[
  {
    "drug_name": "Paracetamol",
    "dosage": "500mg"
  }
]
```
Let me know if you need anything else!"""

print(ai_service._extract_json(text))

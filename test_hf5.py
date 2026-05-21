import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nexuscare.settings')
import django
django.setup()

from apps.ai.services import ai_service
text = "Patient: John Doe, Rx: Paracetamol 500mg BD for 5 days. Amoxicillin 250mg TDS for 7 days"
model_id = "samrawal/bert-base-uncased_clinical-ner"
entities = ai_service._call_hf_inference(text, model_id, task="token-classification")
print(entities)

import os, sys, django
sys.path.append('backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nexuscare.settings')
django.setup()
from apps.ai.services import ai_service

text = """
Hospitol Name
Dr. John Doe
Date: 21 May 2026

Rx
1. Amocicilin 500 mg 1-0-1 x 5 d
2. Paracetmol 650 1 SOS
3. Cough Syrp 2 spoons TDS

Advise:
Rest.

Signature
"""

prompt = f"""Extract every single medication, drug, or tablet mentioned in this prescription text.
For each medication found, provide:
- drug_name (e.g., Amoxicillin, Paracetamol)
- dosage (e.g., 500mg, 1 tab)
- frequency (e.g., BD, TDS, daily)
- duration_days (number of days to take it)

Text to analyze: {text[:2500]}

Return ONLY a JSON list of objects. If no medications are found, return []."""

res = ai_service._call_hf_chat(prompt, system_prompt="You are a precise medical data extraction engine. You specialize in identifying drug names, dosages, and frequencies from noisy OCR text. Only output valid JSON.")
print("QWEN RESULT:")
print(res)

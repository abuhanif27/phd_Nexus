import os, sys, django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nexuscare.settings')
django.setup()

from apps.ai.services import ai_service

prompt = """Extract every single medication, drug, or tablet mentioned in this prescription text.
For each medication found, provide:
- drug_name (e.g., Amoxicillin, Paracetamol)
- dosage (e.g., 500mg, 1 tab)
- frequency (e.g., BD, TDS, daily)
- duration_days (number of days to take it)

Text to analyze: Rx: Paracetamol 500mg 1 tablet daily for 5 days.

Return ONLY a JSON list of objects. If no medications are found, return []."""

res = ai_service._call_hf_chat(prompt, system_prompt="You are a precise medical data extraction engine. You specialize in identifying drug names, dosages, and frequencies from noisy OCR text. Only output valid JSON.")
print("RAW LLM OUTPUT:")
print(repr(res))
print("JSON PARSED OUTPUT:")
print(ai_service._extract_json(res))

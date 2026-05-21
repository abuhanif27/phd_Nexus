import os, sys, django
sys.path.append('backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nexuscare.settings')
django.setup()
from apps.ai.services import ai_service

text = """
1) TAB, DEMO MEDICINE 1 1 Morning, 1 Night 40 Days
(Before Food) (Tot:20 Tob)
2) CAP, DEMO MEDICINE 2 4 Moming, 1 Night 40 Days
(Before Food} ‘Tot:20 cap)
3) TAB, DEMO MEDICINE 3 Moming, 1 Af 1 Eve, 1 Night 10 Days
(Biter Food) (Tots40 Tob)
4) TAB, DEMO MEDICINE 4 4/2 Moming, 1/2 Night 40 Days
(Biter Food) {Tot:10 Tob)
"""

prompt = f"""Extract every single medication, drug, or tablet mentioned in this prescription text.
For each medication found, provide:
- drug_name (e.g., Amoxicillin, Paracetamol)
- dosage (e.g., 500mg, 1 tab)
- frequency (e.g., BD, TDS, daily)
- duration_days (number of days to take it)

Text to analyze: {text}

Return ONLY a JSON list of objects. If no medications are found, return []."""

res = ai_service._call_hf_chat(prompt, system_prompt="You are a precise medical data extraction engine. You specialize in identifying drug names, dosages, and frequencies from noisy OCR text. Only output valid JSON.")
print("RAW LLM OUTPUT:")
print(repr(res))
print("JSON PARSED OUTPUT:")
print(ai_service._extract_json(res))

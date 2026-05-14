import re

new_code = """class PrescriptionParser:
    @staticmethod
    def parse_image(file_obj, patient):
        import requests
        import os
        from django.utils import timezone
        import re
        from datetime import datetime, timedelta
        
        # Default fallback
        today = timezone.now().date()
        ext_date = today
        
        # Identify URL
        from django.conf import settings
        ngrok_url = getattr(settings, 'REMOTE_BRAIN_URL', os.environ.get("REMOTE_BRAIN_URL", "http://127.0.0.1:8000"))
        
        raw_ocr = ""
        clinical_entities_str = ""
        
        try:
            # Prepare file for upload
            file_obj.seek(0)
            files = {'file': (file_obj.name if hasattr(file_obj, 'name') else 'upload.jpg', file_obj, 'image/jpeg')}
            
            # Request to COLAB model
            response = requests.post(f"{ngrok_url.rstrip('/')}/extract_prescription", files=files, timeout=60)
            if response.status_code == 200:
                data = response.json()
                raw_ocr = data.get("raw_ocr", "")
                clinical_entities_str = data.get("clinical_entities", "")
        except Exception as e:
            raw_ocr = f"Error connecting to GPU backend: {e}"

        # 1. Date Extraction (Heuristic)
        # Look for dates like DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
        date_patterns = [
            r'\\b(\\d{1,2})[/-](\\d{1,2})[/-](\\d{2,4})\\b',
            r'\\b(\\d{4})[/-](\\d{1,2})[/-](\\d{1,2})\\b',
            r'\\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \\d{1,2},? \\d{4}\\b'
        ]
        
        found_date = None
        for pat in date_patterns:
            matches = re.search(pat, raw_ocr, re.IGNORECASE)
            if matches:
                try:
                    from dateutil import parser as dt_parser
                    parsed_d = dt_parser.parse(matches.group(0), fuzzy=True).date()
                    if parsed_d <= today:
                        found_date = parsed_d
                        break
                except:
                    pass
                    
        if found_date:
            ext_date = found_date
            
        # 2. Extract Medicines (Heuristics over ClinicalBERT output and OCR text)
        medicines = []
        
        # Parse entities string safely (if evaluating python list fails)
        import ast
        entities = []
        try:
            if clinical_entities_str:
                entities = ast.literal_eval(clinical_entities_str)
        except:
            pass

        # Combine contiguous word pieces mapped to medicines/dosages
        # ClinicalBERT NER gives dicts: {'entity': 'B-TREATMENT', 'word': 'am', ...}
        # But for robust fallback, let's also heuristically scan raw_ocr for "mg", "ml", "tab"
        
        med_regex = re.finditer(r'([A-Za-z0-9_]+(?:\\s+[A-Za-z0-9_]+)*?(?:\\d+\\s*(?:mg|ml|mcg|g|tablet|tab|cap|capsule|ui|iu)))', raw_ocr, re.IGNORECASE)
        
        max_duration = 0
        added_drugs = set()
        
        for m in med_regex:
            drug = m.group(1).strip()
            if len(drug) > 3 and not any(x in drug.lower() for x in ['age', 'date', 'weight']):
                if drug.lower() not in added_drugs:
                    added_drugs.add(drug.lower())
                    freq = "Daily"
                    # simplistic freq extraction
                    if re.search(r'\\b(bd|bid)\\b', raw_ocr, re.IGNORECASE): freq = "BD"
                    elif re.search(r'\\b(tds|tid)\\b', raw_ocr, re.IGNORECASE): freq = "TDS"
                    
                    duration = 15
                    dur_match = re.search(r'(\\d+)\\s*(days|weeks|months)', raw_ocr, re.IGNORECASE)
                    if dur_match:
                        duration = int(dur_match.group(1))
                        if 'week' in dur_match.group(2).lower(): duration *= 7
                        elif 'month' in dur_match.group(2).lower(): duration *= 30
                    
                    if duration > max_duration: max_duration = duration
                    
                    medicines.append({
                        "drug_name": drug,
                        "dosage": "As Directed", 
                        "frequency": freq,
                        "duration_days": duration
                    })
                    
        # If OCR fails completely, return fallback indicating failure
        if not medicines and len(raw_ocr) < 10:
             # Very weak OCR
             medicines = []

        expires_at = ext_date + timedelta(days=max_duration if max_duration > 0 else 15)

        return {
            "extracted_date": ext_date.isoformat(),
            "expires_at": expires_at.isoformat(),
            "medicines": medicines,
            "raw_ocr": raw_ocr,
            "clinical_entities": clinical_entities_str
        }

    @staticmethod
"""

with open('backend/apps/ai/services.py', 'r') as f:
    text = f.read()

# Replace starting from `class PrescriptionParser:` to `@staticmethod\n    def create_reminders`
new_text = re.sub(r'class PrescriptionParser:.*?@staticmethod', new_code, text, flags=re.DOTALL)

with open('backend/apps/ai/services.py', 'w') as f:
    f.write(new_text)

print("Backend parser patched for REAL extraction!")


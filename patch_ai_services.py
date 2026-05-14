with open('backend/apps/ai/services.py', 'r') as f:
    content = f.read()

new_parser = """class PrescriptionParser:
    @staticmethod
    def parse_image(file_obj, patient):
        import requests
        import os
        import ast
        import re
        from datetime import timedelta
        from django.utils import timezone
        import dateutil.parser
        
        ngrok_url = os.environ.get("REMOTE_BRAIN_URL", "").rstrip('/')
        
        remote_data = None
        if ngrok_url:
            try:
                file_obj.seek(0)
                files = {'file': ('prescription.jpg', file_obj, 'application/octet-stream')}
                response = requests.post(f"{ngrok_url}/extract_prescription", files=files, timeout=60)
                if response.status_code == 200:
                    remote_data = response.json()
                else:
                    print("Colab Errored: ", response.text)
            except Exception as e:
                print("Failed to reach Colab:", str(e))
                pass

        raw_ocr = remote_data.get('raw_ocr', '') if remote_data else ""
        entities_str = remote_data.get('clinical_entities', '[]') if remote_data else "[]"
        
        try:
            entities = ast.literal_eval(entities_str)
        except:
            entities = []
            
        extracted_date = None
        date_pattern = r'\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b'
        date_matches = re.findall(date_pattern, raw_ocr)
        if date_matches:
            try:
                extracted_date = dateutil.parser.parse(date_matches[0], fuzzy=True).date()
            except:
                pass
                
        if not extracted_date:
            text_date_pattern = r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b'
            text_matches = re.findall(text_date_pattern, raw_ocr, re.IGNORECASE)
            if text_matches:
                try:
                    extracted_date = dateutil.parser.parse(text_matches[0], fuzzy=True).date()
                except:
                    pass
                    
        if not extracted_date:
            extracted_date = timezone.now().date()
            
        medicines = []
        current_med = {}
        
        for ent in entities:
            if isinstance(ent, dict):
                entity_group = ent.get('entity_group', '')
                word = ent.get('word', '').replace('##', '')
                
                if 'treatment' in entity_group.lower() or 'problem' in entity_group.lower():
                    if current_med.get('drug_name'):
                        medicines.append(current_med)
                    current_med = {"drug_name": word, "dosage": "?", "frequency": "?", "duration_days": 15}
                elif 'test' in entity_group.lower() and current_med.get('drug_name'):
                    current_med['dosage'] = current_med.get('dosage', '') + ' ' + word

        if current_med.get('drug_name'):
            medicines.append(current_med)
            
        if not medicines and raw_ocr:
            words = raw_ocr.split()
            for i, w in enumerate(words):
                if w.lower() in ['tab', 'cap', 'syp', 'inj', 'mg', 'tablet']:
                    drug = words[i-1] if i > 0 else "Unknown"
                    if len(drug) > 2:
                        medicines.append({
                            "drug_name": f"{drug} {w}", 
                            "dosage": "1 unit", 
                            "frequency": "BD", 
                            "duration_days": 15
                        })

        expires_at = extracted_date + timedelta(days=15)
        
        return {
            "extracted_date": extracted_date.isoformat(),
            "expires_at": expires_at.isoformat(),
            "medicines": medicines,
            "raw_ocr": raw_ocr,
            "clinical_entities": entities_str
        }

    @staticmethod"""

import re
# Use a replacement function to avoid sub replacement interpolation parsing (no \d issues inside repl)
def repl_func(match):
    return new_parser

new_content = re.sub(r'class PrescriptionParser:.*?@staticmethod', repl_func, content, flags=re.DOTALL)

with open('backend/apps/ai/services.py', 'w') as f:
    f.write(new_content)
print("Updated successfully")

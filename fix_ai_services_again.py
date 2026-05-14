import re

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
        
        # ... (File sending and Colab execution)
        file_name = getattr(file_obj, 'name', 'prescription.jpg').lower()
        upload_file_obj = file_obj
        filename_to_send = 'prescription.jpg'

        remote_data = None
        if ngrok_url:
            if file_name.endswith('.pdf'):
                try:
                    import pypdfium2 as pdfium
                    import io
                    file_obj.seek(0)
                    pdf = pdfium.PdfDocument(file_obj)
                    page = pdf.get_page(0)  # Get first page
                    pil_image = page.render(scale=2).to_pil()
                    img_byte_arr = io.BytesIO()
                    pil_image.save(img_byte_arr, format='JPEG')
                    img_byte_arr.seek(0)
                    upload_file_obj = img_byte_arr
                except Exception as e:
                    print("PDF conversion failed:", str(e))
            else:
                file_obj.seek(0)

            try:
                files = {'file': (filename_to_send, upload_file_obj, 'application/octet-stream')}
                response = requests.post(f"{ngrok_url}/extract_prescription", files=files, timeout=60)
                if response.status_code == 200:
                    remote_data = response.json()
            except Exception as e:
                print("Failed to reach Colab:", str(e))
                pass

        raw_ocr = remote_data.get('raw_ocr', '') if remote_data else ""
        entities_str = remote_data.get('clinical_entities', '[]') if remote_data else "[]"
        
        try:
            entities = ast.literal_eval(entities_str)
        except:
            entities = []
            
        # VERY AGGRESSIVE DATE EXTRACTION
        extracted_date = None
        # Try finding standard numerical dates: DD-MM-YYYY, YYYY/MM/DD, DD.MM.YY etc
        date_pattern = r'\b(\d{1,2}[\./-]\d{1,2}[\./-]\d{2,4})\b'
        date_matches = re.findall(date_pattern, raw_ocr)
        if date_matches:
            for d in date_matches:
                try:
                    extracted_date = dateutil.parser.parse(d, fuzzy=True).date()
                    if extracted_date.year > 2000 and extracted_date.year < 2030:
                        break # Found a valid real date
                except:
                    pass
                
        # Try explicit worded dates 
        if not extracted_date:
            text_date_pattern = r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th|,)?[ \t]+\d{4}\b'
            text_matches = re.findall(text_date_pattern, raw_ocr, re.IGNORECASE)
            if text_matches:
                try:
                    extracted_date = dateutil.parser.parse(text_matches[0], fuzzy=True).date()
                except:
                    pass

        # If everything failed, only then use fallback
        if not extracted_date:
            extracted_date = timezone.now().date()
            
        # DOCTOR'S ADVICE EXTRACTION
        doctor_advice = None
        advice_match = re.search(r'(?:advise|advice|instruction(?:s)?|note|rx|c/o)\s*[:\-]*\s*(.+?)(?=(?:\n\n|\d+\.|\Z))', raw_ocr, re.IGNORECASE | re.DOTALL)
        if advice_match:
            doctor_advice = advice_match.group(1).strip()
            if len(doctor_advice) < 5 or len(doctor_advice) > 200:
                doctor_advice = None # Filtering noise

        # MEDICINES AND PURPOSES Dictionary
        med_dict = {
            "amoxicillin": "Antibiotic used to treat a wide variety of bacterial infections.",
            "ibuprofen": "NSAID used for reducing pain, swelling, and fever.",
            "paracetamol": "Used to treat mild to moderate pain and reduce fever.",
            "napa": "Used to treat mild to moderate pain and reduce fever.",
            "azithromycin": "Macrolide antibiotic used to treat bacterial infections.",
            "omeprazole": "Proton pump inhibitor that decreases stomach acid (GERD, Ulcers).",
            "pantoprazole": "Proton pump inhibitor used to treat stomach and esophagus problems.",
            "metformin": "Improves blood sugar levels in people with Type 2 diabetes.",
            "cetirizine": "Antihistamine used to relieve allergy symptoms.",
            "fexofenadine": "Antihistamine used to relieve allergy symptoms without causing sleepiness."
        }

        medicines = []
        current_med = {}
        
        for ent in entities:
            if isinstance(ent, dict):
                entity_group = ent.get('entity_group', '')
                word = ent.get('word', '').replace('##', '')
                
                if 'treatment' in entity_group.lower() or 'problem' in entity_group.lower():
                    if current_med.get('drug_name'):
                        medicines.append(current_med)
                    
                    found_purpose = "Prescribed for symptomatic relief and treatment as per doctor's clinical assessment."
                    for key, val in med_dict.items():
                        if key.lower() in word.lower():
                            found_purpose = val
                            break

                    current_med = {"drug_name": word, "dosage": "?", "frequency": "?", "duration_days": 15, "purpose": found_purpose}
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
                        found_purpose = "Prescribed for symptomatic relief and treatment as per doctor's clinical assessment."
                        for key, val in med_dict.items():
                            if key.lower() in drug.lower():
                                found_purpose = val
                                break

                        medicines.append({
                            "drug_name": f"{drug} {w}", 
                            "dosage": "1 unit", 
                            "frequency": "BD", 
                            "duration_days": 15,
                            "purpose": found_purpose
                        })

        expires_at = extracted_date + timedelta(days=15)
        
        return {
            "extracted_date": extracted_date.isoformat(),
            "expires_at": expires_at.isoformat(),
            "medicines": medicines,
            "raw_ocr": raw_ocr,
            "clinical_entities": entities_str,
            "doctor_advice": doctor_advice
        }

    @staticmethod"""

def repl_func(match):
    return new_parser

new_content = re.sub(r'class PrescriptionParser:.*?@staticmethod', repl_func, content, flags=re.DOTALL)

with open('backend/apps/ai/services.py', 'w') as f:
    f.write(new_content)

print("Backend upgraded.")

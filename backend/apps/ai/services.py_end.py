    def extract_prescription_items(self, text: str) -> List[Dict]:
        """
        Extract structured prescription items from raw text.
        Returns a list of {drug, dosage, duration, instructions}.
        """
        items = []
        if not text:
            return items

        # Pattern for common medicine lines
        # Example: "Tab. Dolo 650mg BD for 5 days"
        # Groups: 1=DrugName, 2=Dosage, 3=Frequency, 4=Duration
        # Improved regex to be more flexible with medicine names (including numbers like 'Dolo 650')
        med_pattern = r'(?i)(?:Tab|Cap|Syr|Inj|T\.|C\.)?[\.\s]*([A-Z][a-z0-9\s\-]{2,})\s+(\d+(?:\.\d+)?\s*(?:mg|mcg|ml|gm|g|IU))\b.*?(\b(?:BD|TDS|QD|QID|OD|HS|twice daily|once daily|three times a day|at bedtime|every \d+ hours)\b)?.*?(?:for\s+(\d+)\s+(?:days|day|weeks|week))?'

        # Simple fallback pattern for just drug and dosage
        simple_pattern = r'(?i)([A-Z][a-z0-9\s\-]{2,})\s+(\d+(?:\.\d+)?\s*(?:mg|mcg|ml|gm|g|IU))\b'
        
        # Pattern for frequency if separated
        freq_pattern = r'\b(BD|TDS|QD|QID|OD|HS|twice daily|once daily|three times a day|at bedtime|every \d+ hours)\b'
        
        # Pattern for duration if separated
        dur_pattern = r'\bfor\s+(\d+)\s+(?:days|day|weeks|week)\b'

        lines = text.split('\n')
        seen_drugs = set()

        for line in lines:
            line = line.strip()
            if not line or len(line) < 5: continue

            # Try the main pattern
            match = re.search(med_pattern, line)
            if match:
                drug = match.group(1).strip()
                dosage = match.group(2).strip()
                frequency = match.group(3).strip().upper() if match.group(3) else ""
                duration = match.group(4).strip() if match.group(4) else ""
            else:
                # Try simple pattern
                match_simple = re.search(simple_pattern, line)
                if match_simple:
                    drug = match_simple.group(1).strip()
                    dosage = match_simple.group(2).strip()
                    
                    # Look for frequency and duration in the same line
                    freq_match = re.search(freq_pattern, line, re.I)
                    frequency = freq_match.group(1).upper() if freq_match else ""
                    
                    dur_match = re.search(dur_pattern, line, re.I)
                    duration = dur_match.group(1) if dur_match else ""
                else:
                    continue

            # Clean drug name (remove trailing noise)
            drug = re.sub(r'[\s\-,.]{2,}.*$', '', drug).strip()
            if len(drug) < 3: continue

            # Dedupe
            if drug.lower() in seen_drugs: continue
            seen_drugs.add(drug.lower())

            # Normalized frequency
            if not frequency:
                l_lower = line.lower()
                if 'bd' in l_lower or 'twice daily' in l_lower or 'b.i.d' in l_lower: frequency = 'BD'
                elif 'tds' in l_lower or 'three times' in l_lower or 't.i.d' in l_lower: frequency = 'TDS'
                elif 'qd' in l_lower or 'od' in l_lower or 'once daily' in l_lower or 'q.d' in l_lower: frequency = 'QD'
                elif 'qid' in l_lower or 'four times' in l_lower or 'q.i.d' in l_lower: frequency = 'QID'
                elif 'hs' in l_lower or 'at bedtime' in l_lower: frequency = 'HS'

            items.append({
                'drug': drug.capitalize(),
                'dosage': dosage,
                'duration': f"{duration} days" if duration else "30 days", # Default to 30 if not specified
                'instructions': frequency or 'As directed'
            })

        return items

    def get_medication_info(self, drug_name: str) -> Dict:
        """
        Provide detailed information about a medication.
        In a real app, this would query a drug database or an LLM.
        Here we use a robust heuristic with common medical knowledge.
        """
        drug_name = drug_name.lower()
        
        # Common drug classes and their purposes
        drug_info_db = {
            'paracetamol': 'Used to treat pain and fever. Also known as Acetaminophen.',
            'acetaminophen': 'Used to treat pain and fever.',
            'ibuprofen': 'Nonsteroidal anti-inflammatory drug (NSAID) used for pain and inflammation.',
            'aspirin': 'Used to reduce pain, fever, or inflammation.',
            'amoxicillin': 'Penicillin-type antibiotic used to treat bacterial infections.',
            'azithromycin': 'Antibiotic used for various bacterial infections.',
            'ciprofloxacin': 'Fluoroquinolone antibiotic used for bacterial infections.',
            'metformin': 'Medication used to treat type 2 diabetes.',
            'atorvastatin': 'Statin medication used to lower cholesterol.',
            'amlodipine': 'Calcium channel blocker used to treat high blood pressure.',
            'losartan': 'Angiotensin II receptor antagonist used for high blood pressure.',
            'omeprazole': 'Proton pump inhibitor (PPI) used for acid reflux and ulcers.',
            'pantoprazole': 'Proton pump inhibitor (PPI) used for acid reflux and ulcers.',
            'cetirizine': 'Antihistamine used to treat allergy symptoms.',
            'loratadine': 'Antihistamine used for allergies.',
            'salbutamol': 'Bronchodilator used for asthma and COPD.',
            'albuterol': 'Bronchodilator used for asthma and COPD.',
            'metoprolol': 'Beta-blocker used for high blood pressure and chest pain.',
            'levothyroxine': 'Hormone replacement for underactive thyroid (hypothyroidism).',
            'lisinopril': 'ACE inhibitor used for high blood pressure and heart failure.',
            'furosemide': 'Diuretic (water pill) used to treat fluid retention and high blood pressure.',
            'prednisone': 'Corticosteroid used to treat inflammation and allergic reactions.',
            'warfarin': 'Blood thinner (anticoagulant) used to prevent blood clots.',
            'clopidogrel': 'Antiplatelet medication used to prevent heart attacks and strokes.',
            'insulin': 'Hormone used to manage blood sugar in diabetes.',
            'gabapentin': 'Used to treat nerve pain and seizures.',
            'sertraline': 'Antidepressant (SSRI) used for depression and anxiety.',
            'alprazolam': 'Benzodiazepine used for anxiety and panic disorders.',
        }

        # Check for direct matches
        for key, info in drug_info_db.items():
            if key in drug_name:
                return {
                    'name': drug_name.capitalize(),
                    'purpose': info,
                    'category': 'Prescription' if 'antibiotic' in info or 'blood pressure' in info else 'General'
                }

        # Heuristic search
        if 'stat' in drug_name: return {'name': drug_name.capitalize(), 'purpose': 'Likely a statin for cholesterol.', 'category': 'Chronic'}
        if 'pril' in drug_name: return {'name': drug_name.capitalize(), 'purpose': 'Likely an ACE inhibitor for blood pressure.', 'category': 'Chronic'}
        if 'sartan' in drug_name: return {'name': drug_name.capitalize(), 'purpose': 'Likely an ARB for blood pressure.', 'category': 'Chronic'}
        if 'cillin' in drug_name or 'mycin' in drug_name or 'flox' in drug_name: 
            return {'name': drug_name.capitalize(), 'purpose': 'Likely an antibiotic for bacterial infections.', 'category': 'Acute'}
        if 'prazole' in drug_name: return {'name': drug_name.capitalize(), 'purpose': 'Likely for acid reflux or ulcers.', 'category': 'General'}
        if 'lol' in drug_name and len(drug_name) > 5: return {'name': drug_name.capitalize(), 'purpose': 'Likely a beta-blocker for heart/BP.', 'category': 'Chronic'}
        
        return {
            'name': drug_name.capitalize(),
            'purpose': 'Medical prescription as advised by your physician.',
            'category': 'Unknown'
        }


# Global service instance
ai_service = AIService()

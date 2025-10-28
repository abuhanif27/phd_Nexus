"""
OCR and document processing tasks.
"""
import re
from typing import Dict, List

try:
    import pytesseract
    from PIL import Image
    import spacy
except ImportError:
    pass

from django.conf import settings
from apps.records.models import File, LabResult, Prescription


def process_file_ocr(file_id: int) -> Dict:
    """
    Process uploaded file with OCR and extract structured data.
    """
    try:
        file_obj = File.objects.get(id=file_id)
        
        # Perform OCR
        image = Image.open(file_obj.storage_path)
        raw_text = pytesseract.image_to_string(image)
        
        # Determine type and extract structured data
        if file_obj.kind == 'lab':
            return _extract_lab_data(file_obj, raw_text)
        elif file_obj.kind == 'prescription':
            return _extract_prescription_data(file_obj, raw_text)
        else:
            return {'status': 'success', 'text': raw_text}
    
    except Exception as e:
        return {'status': 'error', 'error': str(e)}


def _extract_lab_data(file_obj: File, text: str) -> Dict:
    """Extract structured lab result data."""
    try:
        # Simple pattern matching for common lab values
        patterns = {
            'hemoglobin': r'hemoglobin[:\s]+(\d+\.?\d*)',
            'glucose': r'glucose[:\s]+(\d+\.?\d*)',
            'cholesterol': r'cholesterol[:\s]+(\d+\.?\d*)',
            'hba1c': r'hba1c[:\s]+(\d+\.?\d*)',
        }
        
        data = {}
        for key, pattern in patterns.items():
            match = re.search(pattern, text.lower())
            if match:
                data[key] = float(match.group(1))
        
        # Create lab result
        lab = LabResult.objects.create(
            patient=file_obj.patient,
            title=f"Lab Result from {file_obj.filename}",
            summary=text[:500],
            data=data,
            file=file_obj
        )
        
        return {'status': 'success', 'lab_id': lab.id, 'data': data}
    
    except Exception as e:
        return {'status': 'error', 'error': str(e)}


def _extract_prescription_data(file_obj: File, text: str) -> Dict:
    """Extract prescription medication data using spaCy patterns."""
    try:
        nlp = spacy.load(settings.SPACY_MODEL)
        doc = nlp(text)
        
        # Extract medications (simple pattern)
        items = []
        lines = text.split('\n')
        
        for line in lines:
            # Look for drug-like patterns
            if any(keyword in line.lower() for keyword in ['mg', 'tablet', 'capsule', 'ml']):
                items.append({
                    'drug': line.strip(),
                    'dosage': '',
                    'duration': '',
                    'instructions': ''
                })
        
        # Create prescription (needs doctor, using None for now)
        rx = Prescription.objects.create(
            patient=file_obj.patient,
            doctor=None,
            items=items,
            notes=text[:500]
        )
        
        return {'status': 'success', 'prescription_id': rx.id, 'items': items}
    
    except Exception as e:
        return {'status': 'error', 'error': str(e)}


# Celery task wrapper (if enabled)
def process_file_task(file_id: int):
    """Task wrapper for OCR processing."""
    from django.conf import settings
    
    if settings.USE_CELERY:
        from nexuscare.celery import app
        return app.send_task('apps.ai.tasks.process_file_ocr', args=[file_id])
    else:
        # Run synchronously
        return process_file_ocr(file_id)

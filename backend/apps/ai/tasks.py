"""
OCR and document processing tasks.
"""
import os
import re
from typing import Dict, List

try:
    import pytesseract
    from PIL import Image
except ImportError:
    pytesseract = None
    Image = None

# spaCy can raise runtime/config errors on unsupported Python versions.
# Keep backend startup resilient by treating it as optional.
try:
    import spacy
except Exception:
    spacy = None

from django.conf import settings
from apps.records.models import File, LabResult, Prescription

# Mime types and extensions we can OCR (PIL can open these)
IMAGE_MIMES = {'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/bmp', 'image/webp'}
IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'}


def _is_image_file(file_obj: File) -> bool:
    mime = (file_obj.mime or '').lower()
    name = (file_obj.filename or '').lower()
    if mime and mime.startswith('image/'):
        return True
    return any(name.endswith(ext) for ext in IMAGE_EXTENSIONS)


def process_file_ocr(file_id: int) -> Dict:
    """
    Process uploaded file with OCR and extract structured data.
    For image files (including kind=other), extracts text and stores in File.extracted_text
    so the health summary can analyze document content.
    """
    try:
        file_obj = File.objects.get(id=file_id)
        if not _is_image_file(file_obj):
            return {'status': 'skipped', 'reason': 'not an image file'}
        if not os.path.exists(file_obj.storage_path):
            return {'status': 'error', 'error': 'File not found on disk'}
        if not Image or not pytesseract:
            return {'status': 'error', 'error': 'OCR dependencies (PIL, pytesseract) not available'}

        image = Image.open(file_obj.storage_path)
        raw_text = (pytesseract.image_to_string(image) or '').strip()
        # Persist OCR text so health summary can use it (for all image files)
        file_obj.extracted_text = raw_text[:10000]
        file_obj.save(update_fields=['extracted_text'])

        if file_obj.kind == 'lab':
            return _extract_lab_data(file_obj, raw_text)
        elif file_obj.kind == 'prescription':
            return _extract_prescription_data(file_obj, raw_text)
        return {'status': 'success', 'text': raw_text[:500]}
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


def get_or_extract_file_text(file_obj: File) -> str:
    """
    Return extracted text for an image file: use stored extracted_text if present,
    otherwise run OCR and save to file. Returns empty string if not an image or OCR fails.
    """
    if not _is_image_file(file_obj):
        return ''
    if getattr(file_obj, 'extracted_text', None) and (file_obj.extracted_text or '').strip():
        return (file_obj.extracted_text or '').strip()
    if not os.path.exists(file_obj.storage_path):
        return ''
    try:
        if not Image or not pytesseract:
            return ''
        image = Image.open(file_obj.storage_path)
        raw_text = (pytesseract.image_to_string(image) or '').strip()
        if raw_text:
            file_obj.extracted_text = raw_text[:10000]
            file_obj.save(update_fields=['extracted_text'])
        return raw_text
    except Exception:
        return ''


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

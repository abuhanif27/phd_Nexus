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

try:
    import easyocr
except ImportError:
    easyocr = None

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
    print(f"[OCR] Starting OCR for file_id={file_id}")
    try:
        file_obj = File.objects.get(id=file_id)
        print(f"[OCR] File found: {file_obj.filename}")
        if not _is_image_file(file_obj):
            print(f"[OCR] Not an image file, skipping")
            return {'status': 'skipped', 'reason': 'not an image file'}
        if not os.path.exists(file_obj.storage_path):
            print(f"[OCR] File not found at path: {file_obj.storage_path}")
            return {'status': 'error', 'error': 'File not found on disk'}
        
        print(f"[OCR] Processing image: {file_obj.storage_path}")
        raw_text = ""
        
        # Try EasyOCR first (Python-only, no external dependencies)
        if easyocr:
            try:
                print(f"[OCR] Attempting EasyOCR...")
                reader = easyocr.Reader(['en'], gpu=False)
                result = reader.readtext(file_obj.storage_path)
                raw_text = '\n'.join([text[1] for text in result]).strip()
                print(f"[OCR] EasyOCR success: extracted {len(raw_text)} chars")
            except Exception as easyocr_error:
                print(f"[OCR] EasyOCR error: {easyocr_error}")
                raw_text = ""
        
        # If EasyOCR failed or unavailable, try Tesseract
        if not raw_text and Image and pytesseract:
            try:
                print(f"[OCR] Attempting Tesseract...")
                image = Image.open(file_obj.storage_path)
                raw_text = (pytesseract.image_to_string(image) or '').strip()
                print(f"[OCR] Tesseract success: extracted {len(raw_text)} chars")
            except Exception as ocr_error:
                print(f"[OCR] Tesseract error: {ocr_error}")
                raw_text = ""
        
        # If all OCR failed, use fallback placeholder
        if not raw_text:
            print(f"[OCR] All OCR methods failed, using fallback...")
            raw_text = _fallback_ocr(file_obj)
        
        # Persist OCR text so health summary can use it (for all image files)
        file_obj.extracted_text = raw_text[:10000]
        file_obj.save(update_fields=['extracted_text'])
        print(f"[OCR] Saved {len(raw_text)} chars to database")

        if file_obj.kind == 'lab':
            return _extract_lab_data(file_obj, raw_text)
        elif file_obj.kind == 'prescription':
            return _extract_prescription_data(file_obj, raw_text)
        return {'status': 'success', 'text': raw_text[:500]}
    except Exception as e:
        print(f"[OCR] Error: {str(e)}")
        return {'status': 'error', 'error': str(e)}


def _fallback_ocr(file_obj: File) -> str:
    """Fallback OCR when Tesseract is not available. Returns empty string to indicate no text extracted."""
    return ''


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
    
    raw_text = ""
    
    # Try EasyOCR first
    if easyocr:
        try:
            print(f"[get_or_extract_file_text] Using EasyOCR for {file_obj.filename}")
            reader = easyocr.Reader(['en'], gpu=False)
            result = reader.readtext(file_obj.storage_path)
            raw_text = '\n'.join([text[1] for text in result]).strip()
            print(f"[get_or_extract_file_text] EasyOCR extracted {len(raw_text)} chars")
        except Exception as e:
            print(f"[get_or_extract_file_text] EasyOCR failed: {e}")
    
    # If EasyOCR failed, try Tesseract
    if not raw_text and Image and pytesseract:
        try:
            print(f"[get_or_extract_file_text] Using Tesseract for {file_obj.filename}")
            image = Image.open(file_obj.storage_path)
            raw_text = (pytesseract.image_to_string(image) or '').strip()
            print(f"[get_or_extract_file_text] Tesseract extracted {len(raw_text)} chars")
        except Exception as e:
            print(f"[get_or_extract_file_text] Tesseract failed: {e}")
    
    # If still empty, use fallback
    if not raw_text:
        print(f"[get_or_extract_file_text] All OCR methods failed for {file_obj.filename}")
        raw_text = _fallback_ocr(file_obj)
    
    if raw_text:
        file_obj.extracted_text = raw_text[:10000]
        file_obj.save(update_fields=['extracted_text'])
    return raw_text


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

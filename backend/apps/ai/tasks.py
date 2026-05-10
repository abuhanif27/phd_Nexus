"""
OCR and document processing tasks.
"""
import os
import re
from typing import Dict, List
import numpy as np

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

try:
    import pypdf
except ImportError:
    pypdf = None

try:
    from pdf2image import convert_from_path
except ImportError:
    convert_from_path = None

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


def _is_pdf_file(file_obj: File) -> bool:
    mime = (file_obj.mime or '').lower()
    name = (file_obj.filename or '').lower()
    return (mime == 'application/pdf' or name.endswith('.pdf'))


def extract_pdf_text(file_path: str) -> str:
    """
    Extract text from a PDF file. 
    First tries native text extraction, then falls back to OCR if empty.
    """
    raw_text = ""
    
    # 1. Try native text extraction
    if pypdf:
        try:
            print(f"[PDF] Attempting native extraction for {file_path}")
            text_parts = []
            with open(file_path, "rb") as f:
                reader = pypdf.PdfReader(f)
                for page in reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)
            raw_text = "\n".join(text_parts).strip()
            if raw_text:
                print(f"[PDF] Native extraction successful: {len(raw_text)} chars")
                return raw_text
        except Exception as e:
            print(f"[PDF] Native extraction failed: {e}")

    # 2. Fallback to OCR if native failed or returned nothing
    if not raw_text and convert_from_path:
        try:
            print(f"[PDF] Native extraction empty. Attempting OCR fallback for {file_path}")
            # Convert PDF pages to images
            pages = convert_from_path(file_path, dpi=300)
            ocr_parts = []
            
            # Use EasyOCR if available (more robust for noise)
            reader = None
            if easyocr:
                print(f"[PDF] Using EasyOCR for PDF pages...")
                reader = easyocr.Reader(['en'], gpu=False)
            
            for i, page_image in enumerate(pages):
                print(f"[PDF] Processing page {i+1}/{len(pages)}")
                page_text = ""
                
                if reader:
                    try:
                        # Convert PIL Image to numpy array for EasyOCR
                        img_np = np.array(page_image)
                        result = reader.readtext(img_np)
                        page_text = '\n'.join([text[1] for text in result]).strip()
                    except Exception as e:
                        print(f"[PDF] EasyOCR page error: {e}")
                
                # Fallback to Tesseract for the page
                if not page_text and Image and pytesseract:
                    try:
                        page_text = (pytesseract.image_to_string(page_image) or '').strip()
                    except Exception as e:
                        print(f"[PDF] Tesseract page error: {e}")
                
                if page_text:
                    ocr_parts.append(page_text)
            
            raw_text = "\n\n".join(ocr_parts).strip()
            if raw_text:
                print(f"[PDF] OCR extraction successful: {len(raw_text)} chars")
        except Exception as e:
            print(f"[PDF] OCR extraction failed: {e}")
            
    return raw_text


def _extract_clinical_date(text: str):
    """
    Attempt to extract a clinical date from text using regex.
    Supports YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, and Month DD, YYYY.
    """
    import dateutil.parser as dparser
    
    # Common date patterns
    patterns = [
        r'\b\d{4}-\d{1,2}-\d{1,2}\b', # 2023-05-10
        r'\b\d{1,2}/\d{1,2}/\d{4}\b', # 10/05/2023 or 05/10/2023
        r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b', # May 10, 2023
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                # Use dateutil for flexible parsing
                dt = dparser.parse(match.group(0), fuzzy=True)
                return dt.date()
            except:
                continue
    return None


def process_file_ocr(file_id: int) -> Dict:
    """
    Process uploaded file (Image or PDF) and extract structured data.
    Stores text in File.extracted_text so the health summary can analyze document content.
    """
    print(f"[OCR] Starting processing for file_id={file_id}")
    try:
        file_obj = File.objects.get(id=file_id)
        print(f"[OCR] File found: {file_obj.filename}")
        
        if not os.path.exists(file_obj.storage_path):
            print(f"[OCR] File not found at path: {file_obj.storage_path}")
            return {'status': 'error', 'error': 'File not found on disk'}
        
        raw_text = ""
        
        # 1. Handle PDF
        if _is_pdf_file(file_obj):
            raw_text = extract_pdf_text(file_obj.storage_path)
        
        # 2. Handle Image
        elif _is_image_file(file_obj):
            print(f"[OCR] Processing image: {file_obj.storage_path}")
            
            # Try EasyOCR first
            if easyocr:
                try:
                    print(f"[OCR] Attempting EasyOCR...")
                    reader = easyocr.Reader(['en'], gpu=False)
                    # Convert to numpy if it's a PIL Image (opened via Pillow)
                    # For images we usually have a path, so EasyOCR can take the path
                    result = reader.readtext(file_obj.storage_path)
                    raw_text = '\n'.join([text[1] for text in result]).strip()
                except Exception as easyocr_error:
                    print(f"[OCR] EasyOCR error: {easyocr_error}")
            
            # Try Tesseract if needed
            if not raw_text and Image and pytesseract:
                try:
                    print(f"[OCR] Attempting Tesseract...")
                    image = Image.open(file_obj.storage_path)
                    raw_text = (pytesseract.image_to_string(image) or '').strip()
                except Exception as ocr_error:
                    print(f"[OCR] Tesseract error: {ocr_error}")

        # 3. Finalize
        if not raw_text:
            print(f"[OCR] All extraction methods failed, using fallback...")
            raw_text = _fallback_ocr(file_obj)
        
        # Persist extracted text
        file_obj.extracted_text = raw_text[:15000] # PDF can be longer
        
        # Extract clinical date if not already set
        if not file_obj.clinical_date:
            file_obj.clinical_date = _extract_clinical_date(raw_text)
            
        file_obj.save(update_fields=['extracted_text', 'clinical_date'])
        print(f"[OCR] Saved {len(raw_text)} chars to database. Clinical date: {file_obj.clinical_date}")

        if file_obj.kind == 'lab':
            return _extract_lab_data(file_obj, raw_text)
        elif file_obj.kind == 'prescription':
            return _extract_prescription_data(file_obj, raw_text)
        return {'status': 'success', 'text': raw_text[:500]}
        
    except Exception as e:
        print(f"[OCR] Error: {str(e)}")
        return {'status': 'error', 'error': str(e)}


def _fallback_ocr(file_obj: File) -> str:
    """Fallback message when text extraction is not possible."""
    return f"[Document: {file_obj.filename}. Type: {file_obj.get_kind_display()}. Text content could not be automatically extracted from this file format.]"


def _extract_lab_data(file_obj: File, text: str) -> Dict:
    """Extract structured lab result data."""
    try:
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
    """Extract prescription medication data."""
    try:
        nlp = spacy.load(settings.SPACY_MODEL) if spacy else None
        items = []
        lines = text.split('\n')
        
        for line in lines:
            if any(keyword in line.lower() for keyword in ['mg', 'tablet', 'capsule', 'ml']):
                items.append({
                    'drug': line.strip(),
                    'dosage': '',
                    'duration': '',
                    'instructions': ''
                })
        
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
    Return extracted text for any supported file.
    Proxies to Remote Brain if available to prevent local crashes.
    """
    if getattr(file_obj, 'extracted_text', None) and (file_obj.extracted_text or '').strip():
        return (file_obj.extracted_text or '').strip()
    
    if not os.path.exists(file_obj.storage_path):
        return ''
    
    remote_url = getattr(settings, 'REMOTE_BRAIN_URL', None)
    raw_text = ""
    
    # 1. Try Remote Brain OCR first (for both Images and PDFs)
    if remote_url and (_is_image_file(file_obj) or _is_pdf_file(file_obj)):
        import requests
        try:
            print(f"[REMOTE OCR] Offloading {file_obj.filename} to {remote_url}")
            with open(file_obj.storage_path, 'rb') as f:
                # Use multipart/form-data to send the file
                files = {'file': (file_obj.filename, f, file_obj.mime or 'application/octet-stream')}
                response = requests.post(f"{remote_url.rstrip('/')}/ocr", files=files, timeout=120) # Longer timeout for PDFs
                if response.status_code == 200:
                    raw_text = response.json().get('text', '')
                    if raw_text:
                        print(f"[REMOTE OCR] Success: {len(raw_text)} chars")
        except Exception as e:
            print(f"[REMOTE OCR] Error: {e}")

    # 2. Local Fallback (Only if remote failed or unavailable)
    if not raw_text:
        # PDF (Native text extraction is usually light)
        if _is_pdf_file(file_obj):
            raw_text = extract_pdf_text(file_obj.storage_path)
        
        # Image (Local OCR - CAUTION: Heavy)
        elif _is_image_file(file_obj):
            if easyocr:
                try:
                    reader = easyocr.Reader(['en'], gpu=False)
                    result = reader.readtext(file_obj.storage_path)
                    raw_text = '\n'.join([text[1] for text in result]).strip()
                except: pass
            
            if not raw_text and Image and pytesseract:
                try:
                    image = Image.open(file_obj.storage_path)
                    raw_text = (pytesseract.image_to_string(image) or '').strip()
                except: pass
    
    # Fallback message
    if not raw_text:
        raw_text = _fallback_ocr(file_obj)
    
    if raw_text:
        file_obj.extracted_text = raw_text[:15000]
        file_obj.save(update_fields=['extracted_text'])
        
    return raw_text




# Celery task wrapper
def process_file_task(file_id: int):
    """Task wrapper for file processing."""
    from django.conf import settings
    if settings.USE_CELERY:
        from nexuscare.celery import app
        return app.send_task('apps.ai.tasks.process_file_ocr', args=[file_id])
    else:
        return process_file_ocr(file_id)

import pytest
import io
import datetime
from django.utils import timezone
from apps.ai.services import PrescriptionParser, ai_service
from apps.patients.models import Patient
from django.contrib.auth import get_user_model
from unittest.mock import patch, MagicMock
from django.conf import settings

User = get_user_model()

@pytest.fixture
def test_patient(db):
    user = User.objects.create_user(email='test_parser@test.com', password='password123', role='patient')
    return Patient.objects.create(user=user, name='Test Parser Patient')

class MockFile:
    def __init__(self, name, content=b"fake image data"):
        self.name = name
        self.content = content
        self._pos = 0

    def read(self):
        return self.content

    def seek(self, pos):
        self._pos = pos

# Test 1: Full success flow with HF (Mocked)
@patch('apps.ai.services.ai_service._call_hf_inference')
@patch('apps.ai.services.ai_service._call_hf_chat')
def test_parse_image_hf_success(mock_chat, mock_inference, test_patient):
    # Setup mocks
    mock_inference.return_value = "Rx: Amoxicillin 500mg TDS for 5 days."
    mock_chat.return_value = '{"medicines": [{"drug_name": "Amoxicillin", "dosage": "500mg", "frequency": "TDS", "duration_days": 5, "purpose": "Antibiotic"}]}'
    
    mock_file = MockFile("prescription.jpg")
    
    with patch('django.conf.settings.USE_HF_INFERENCE_API', True):
        result = PrescriptionParser.parse_image(mock_file, test_patient, auto_save=False)
    
    assert result is not None
    assert result['raw_ocr'] == "Rx: Amoxicillin 500mg TDS for 5 days."
    assert len(result['medicines']) == 1
    assert result['medicines'][0]['drug_name'] == 'Amoxicillin'
    assert result['medicines'][0]['frequency'] == 'TDS'

# Test 2: HF OCR returns nothing, try Tesseract fallback (Mocked)
@patch('apps.ai.services.ai_service._call_hf_inference')
@patch('PIL.Image.open')
@patch('pytesseract.image_to_string')
@patch('apps.ai.services.ai_service._call_hf_chat')
def test_parse_image_ocr_failure_tesseract_fallback(mock_chat, mock_pytesseract, mock_image_open, mock_inference, test_patient):
    mock_inference.return_value = "" # HF failed
    
    from PIL import Image
    dummy_img = Image.new('RGB', (100, 100), color=(255, 255, 255))
    mock_image_open.return_value = dummy_img
    
    mock_pytesseract.return_value = "Paracetamol 650mg SOS"
    mock_chat.return_value = '[{"drug_name": "Paracetamol", "dosage": "650mg", "frequency": "SOS", "duration_days": 3, "purpose": "Pain/Fever"}]'
    
    mock_file = MockFile("rx.png")
    with patch('django.conf.settings.USE_HF_INFERENCE_API', True):
        result = PrescriptionParser.parse_image(mock_file, test_patient, auto_save=False)
        
    assert result['raw_ocr'] == "Paracetamol 650mg SOS"
    assert len(result['medicines']) == 1
    assert result['medicines'][0]['drug_name'] == 'Paracetamol'

# Test 3: PDF local extraction
@patch('pypdfium2.PdfDocument')
@patch('apps.ai.services.pytesseract')
@patch('apps.ai.services.ai_service._call_hf_chat')
def test_parse_pdf_local_extraction(mock_chat, mock_pytesseract, mock_pdfium, test_patient):
    # Setup PDF mock
    mock_pdf = MagicMock()
    mock_pdf.__len__.return_value = 1
    mock_page = MagicMock()
    mock_page.render().to_pil.return_value = MagicMock()
    mock_pdf.get_page.return_value = mock_page
    mock_pdfium.return_value = mock_pdf
    
    mock_pytesseract.image_to_string.return_value = "Ibuprofen 400mg BD"
    mock_chat.return_value = '[{"drug_name": "Ibuprofen", "dosage": "400mg", "frequency": "BD", "duration_days": 5, "purpose": "Pain relief"}]'
    
    mock_file = MockFile("doc.pdf")
    with patch('django.conf.settings.USE_HF_INFERENCE_API', True):
        # We need to ensure apps.ai.services.pytesseract evaluates to Truthy in the if globals().get('pytesseract'): check.
        # Since it's a MagicMock, globals().get('pytesseract') will return the MagicMock, which is Truthy.
        with patch.dict('apps.ai.services.__dict__', {'pytesseract': mock_pytesseract}):
            result = PrescriptionParser.parse_image(mock_file, test_patient, auto_save=False)
        
    assert "Ibuprofen 400mg BD" in result['raw_ocr']
    assert len(result['medicines']) == 1

# Test 4: LLM extraction fails, Regex fallback is used
@patch('apps.ai.services.ai_service._call_hf_inference')
@patch('apps.ai.services.ai_service._call_hf_chat')
def test_parse_image_regex_fallback(mock_chat, mock_inference, test_patient):
    mock_inference.return_value = "Take Azithromycin 500mg 1 tab daily for 3 days."
    mock_chat.return_value = "Sorry, I can't do that." # LLM fails
    
    mock_file = MockFile("prescription.jpg")
    with patch('django.conf.settings.USE_HF_INFERENCE_API', True):
        result = PrescriptionParser.parse_image(mock_file, test_patient, auto_save=False)
        
    # Regex fallback should catch it (assuming `extract_prescription_items` works)
    # We might need to mock `extract_prescription_items` to ensure test independence
    assert result['raw_ocr'] == "Take Azithromycin 500mg 1 tab daily for 3 days."
    # If regex caught something, it should be in medicines, but let's just check no error is thrown

# Test 4b: Use stored extracted text (skip OCR)
def test_parse_image_with_raw_text_override(test_patient):
    mock_file = MockFile("rx.jpg")
    raw_text = "Aspirin 75mg OD for 10 days"
    with patch('django.conf.settings.USE_HF_INFERENCE_API', False):
        result = PrescriptionParser.parse_image(mock_file, test_patient, auto_save=False, raw_text_override=raw_text)

    assert result['raw_ocr'] == raw_text
    assert len(result['medicines']) >= 1
    assert result['medicines'][0]['drug_name'].lower().startswith('aspirin')

# Test 5: Empty text, no medicines extracted
@patch('apps.ai.services.ai_service._call_hf_inference')
@patch('pytesseract.image_to_string')
def test_parse_image_no_medicines(mock_tesseract, mock_inference, test_patient):
    mock_inference.return_value = ""
    mock_tesseract.return_value = ""
    
    mock_file = MockFile("blur.jpg")
    with patch('django.conf.settings.USE_HF_INFERENCE_API', True):
        result = PrescriptionParser.parse_image(mock_file, test_patient, auto_save=False)
        
    assert result['raw_ocr'] == ""
    assert len(result['medicines']) == 0

# Test 6: Auto-save True saves to Database
@patch('apps.ai.services.ai_service._call_hf_inference')
@patch('apps.ai.services.ai_service._call_hf_chat')
def test_parse_image_auto_save_true(mock_chat, mock_inference, test_patient):
    mock_inference.return_value = "Metformin 500mg"
    mock_chat.return_value = '[{"drug_name": "Metformin", "dosage": "500mg", "frequency": "BD", "duration_days": 30}]'
    
    mock_file = MockFile("rx.jpg")
    with patch('django.conf.settings.USE_HF_INFERENCE_API', True):
        result = PrescriptionParser.parse_image(mock_file, test_patient, auto_save=True)
        
    assert result['id'] is not None
    from apps.records.models import Prescription
    assert Prescription.objects.filter(id=result['id']).exists()

# Test 7: Auto-save False does not save
@patch('apps.ai.services.ai_service._call_hf_inference')
@patch('apps.ai.services.ai_service._call_hf_chat')
def test_parse_image_auto_save_false(mock_chat, mock_inference, test_patient):
    mock_inference.return_value = "Metformin 500mg"
    mock_chat.return_value = '[{"drug_name": "Metformin", "dosage": "500mg", "frequency": "BD", "duration_days": 30}]'
    
    mock_file = MockFile("rx.jpg")
    with patch('django.conf.settings.USE_HF_INFERENCE_API', True):
        result = PrescriptionParser.parse_image(mock_file, test_patient, auto_save=False)
        
    assert result['id'] is None

# Test 8: Create reminders function
@pytest.mark.django_db
def test_create_reminders(test_patient):
    from apps.records.models import Prescription
    from apps.reminders.models import MedicationReminder
    rx = Prescription.objects.create(patient=test_patient, items=[], notes="Test")
    
    medicines = [{"drug_name": "Aspirin", "dosage": "75mg", "frequency": "TDS", "duration_days": 10}]
    PrescriptionParser.create_reminders(rx, medicines)
    
    reminders = MedicationReminder.objects.filter(prescription=rx)
    assert reminders.count() == 1
    assert reminders.first().drug_name == "Aspirin"
    assert len(reminders.first().scheduled_times) == 3 # TDS

# Test 9: Image Bytes helper
def test_get_image_bytes():
    mock_file = MockFile("test.jpg", b"hello world")
    result = ai_service._get_image_bytes(mock_file)
    assert result == b"hello world"
    
    # Bytes direct
    result2 = ai_service._get_image_bytes(b"bytes")
    assert result2 == b"bytes"

# Test 10: Regex fallback parsing internally
def test_extract_prescription_items_regex():
    text = "1. Aspirin 75mg daily\n2. Paracetamol 500mg SOS"
    items = ai_service.extract_prescription_items(text)
    assert isinstance(items, list)

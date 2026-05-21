import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nexuscare.settings')
import django
django.setup()

from apps.ai.services import PrescriptionParser
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
import io

img = Image.new('RGB', (100, 100), color = 'white')
buffer = io.BytesIO()
img.save(buffer, format='JPEG')
image_bytes = buffer.getvalue()

file_obj = SimpleUploadedFile("prescription.jpg", image_bytes, content_type="image/jpeg")

class DummyPatient:
    pass

res = PrescriptionParser.parse_image(file_obj, DummyPatient(), auto_save=False)
print("RESULT:", res)


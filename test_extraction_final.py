import sys, os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nexuscare.settings')
import django; django.setup()

from apps.ai.services import PrescriptionParser, ai_service
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
import io

# Create an image that has text on it to be OCR'd
from PIL import ImageDraw, ImageFont
img = Image.new('RGB', (800, 400), color=(255, 255, 255))
d = ImageDraw.Draw(img)
# Just use default font, size usually small, but let's just make it huge
try:
    font = ImageFont.truetype("arial.ttf", 36)
except:
    font = ImageFont.load_default()
d.text((10,10), "Patient: John Doe", fill=(0,0,0), font=font)
d.text((10,50), "Rx: Paracetamol 500mg BD for 5 days.", fill=(0,0,0), font=font)
d.text((10,100), "Amoxicillin 250mg TDS for 7 days", fill=(0,0,0), font=font)

buffer = io.BytesIO()
img.save(buffer, format='JPEG')
image_bytes = buffer.getvalue()

file_obj = SimpleUploadedFile("prescription.jpg", image_bytes, content_type="image/jpeg")

class DummyPatient:
    pass

res = PrescriptionParser.parse_image(file_obj, DummyPatient(), auto_save=False)
print("EXTRACTED:", res)

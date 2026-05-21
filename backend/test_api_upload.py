import os, sys, django, io
from PIL import Image, ImageDraw

sys.path.append('backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nexuscare.settings')
django.setup()

from rest_framework.test import APIClient
from apps.patients.models import Patient
from django.contrib.auth import get_user_model

def test():
    User = get_user_model()
    u, _ = User.objects.get_or_create(email="api_test@test.com")
    u.role = 'patient'
    u.save()
    p, _ = Patient.objects.get_or_create(user=u, name="API Test Patient")
    
    client = APIClient()
    client.force_authenticate(user=u)
    
    img = Image.new('RGB', (400, 200), color=(255, 255, 255))
    d = ImageDraw.Draw(img)
    d.text((10,10), "Rx: Azithromycin 500mg\n1 tablet daily for 5 days.", fill=(0,0,0))
    buf = io.BytesIO()
    img.save(buf, format='JPEG')
    buf.seek(0)
    buf.name = "test_rx.jpg"
    
    print("Sending API Request...")
    res = client.post(
        '/api/records/prescriptions/parse-image/',
        {'file': buf, 'save': 'false'},
        format='multipart'
    )
    
    print("API RESPONSE STATUS:", res.status_code)
    print("API RESPONSE:", res.json())

test()
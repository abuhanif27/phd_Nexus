import os
import django
import sys
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nexuscare.settings')
django.setup()
from rest_framework.test import APIRequestFactory, force_authenticate
from apps.doctors.views import DoctorViewSet
from apps.users.models import User

user = User.objects.filter(role='patient').first()
api_factory = APIRequestFactory()
req = api_factory.get('/api/doctors/')
force_authenticate(req, user=user)
view = DoctorViewSet.as_view({'get': 'list'})
response = view(req)
print(type(response.data))
if isinstance(response.data, list):
    print("Is list")
else:
    print("Keys: ", response.data.keys())

import os
import django
import sys
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nexuscare.settings')
django.setup()
from django.test import RequestFactory
from rest_framework.test import force_authenticate
from apps.scheduling.views import DoctorSlotsView
from apps.users.models import User
factory = RequestFactory()
request = factory.get('/api/scheduling/doctors/12/slots/?date=2026-05-04')
user = User.objects.filter(role='patient').first()
force_authenticate(request, user=user)
# Also apply to the view instance directly or use APIRequestFactory
from rest_framework.test import APIRequestFactory
api_factory = APIRequestFactory()
req = api_factory.get('/api/scheduling/doctors/12/slots/?date=2026-05-04')
force_authenticate(req, user=user)
view = DoctorSlotsView.as_view()
response = view(req, doctor_id=12)
print("Doctor 12:")
print(response.data)
from apps.scheduling.models import DoctorAvailability
avail = DoctorAvailability.objects.all()
for a in avail:
    print(f"Doctor id: {a.doctor_id}, Date: {a.date}, Start: {a.start_time}")

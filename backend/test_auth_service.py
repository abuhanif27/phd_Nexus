import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nexuscare.settings')
django.setup()

from apps.service_providers.views import ProviderServiceViewSet
from rest_framework.test import APIRequestFactory
from django.contrib.auth import get_user_model

User = get_user_model()
user = User.objects.first()

factory = APIRequestFactory()
request = factory.get('/api/service-providers/services/')
request.user = user

view = ProviderServiceViewSet.as_view({'get': 'list'})
response = view(request)
print("Auth User:", user.email, "Role:", user.role)
print(response.data)

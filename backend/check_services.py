import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nexuscare.settings')
django.setup()

from apps.service_providers.models import ProviderService, ServiceProviderOrganization

services = ProviderService.objects.all()
print(f"Total services: {services.count()}")
for s in services:
    print(f"Service: {s.name}, is_available={s.is_available}, approval_status={s.approval_status}")
    print(f"  Org: {s.organization.organization_name}, verification_status={s.organization.verification_status}, is_verified={s.organization.is_verified}")

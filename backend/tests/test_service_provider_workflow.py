import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from apps.service_providers.models import ServiceProviderOrganization, ProviderService
from apps.patients.models import Patient
from apps.consent.models import Consent
from apps.notifications.models import Notification
from apps.service_providers.scheduling_models import ServiceBooking

User = get_user_model()

@pytest.fixture
def provider_user():
    user = User.objects.create_user(email="provider@test.com", password="Password123!", role="provider")
    ServiceProviderOrganization.objects.create(
        user=user, 
        organization_name="Nexus Lab", 
        verification_status='approved',
        is_verified=True
    )
    return user

@pytest.fixture
def patient_user():
    user = User.objects.create_user(email="patient2@test.com", password="Password123!", role="patient")
    Patient.objects.create(user=user, name="Jane Doe", patient_code="PT-67890")
    return user

@pytest.fixture
def provider_client(provider_user):
    client = APIClient()
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(provider_user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return client

@pytest.fixture
def patient_client(patient_user):
    client = APIClient()
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(patient_user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return client

@pytest.mark.django_db
class TestServiceProviderBookingFlow:

    def test_provider_booking_full_flow(self, provider_client, patient_client, provider_user, patient_user):
        """Test SP request -> Patient approve -> SP book."""
        provider_profile = provider_user.service_provider_profile
        patient_profile = patient_user.patient_profile

        # 1. Provider requests permission
        resp = provider_client.post('/api/consent/request-booking/', {'patient_id': patient_profile.id})
        assert resp.status_code == 200
        
        notification = Notification.objects.get(user=patient_user, payload__type='booking_permission_request')
        assert notification.payload['sender_type'] == 'service_provider'

        # 2. Patient approves
        resp = patient_client.post('/api/consent/approve-booking/', {
            'service_provider_id': provider_profile.id,
            'notification_id': notification.id
        })
        assert resp.status_code == 200
        assert Consent.objects.filter(patient=patient_profile, service_provider=provider_profile, status='active').exists()

        # 3. Create a service to book
        service = ProviderService.objects.create(
            organization=provider_profile,
            name="Blood Test",
            price=50.00,
            approval_status='approved',
            is_available=True
        )

        # 4. Provider books for patient
        booking_data = {
            'patient': patient_profile.id,
            'service': service.id,
            'date': (timezone.now() + timedelta(days=1)).date().isoformat(),
            'preferred_time': '10:00:00'
        }
        resp = provider_client.post('/api/service-providers/bookings/', booking_data)
        assert resp.status_code == 201
        assert ServiceBooking.objects.filter(patient=patient_profile, service=service).exists()

    def test_provider_booking_unauthorized(self, provider_client, provider_user, patient_user):
        """Provider cannot book without consent."""
        provider_profile = provider_user.service_provider_profile
        patient_profile = patient_user.patient_profile
        
        service = ProviderService.objects.create(
            organization=provider_profile,
            name="X-Ray",
            price=100.00,
            approval_status='approved'
        )

        booking_data = {
            'patient': patient_profile.id,
            'service': service.id,
            'date': (timezone.now() + timedelta(days=1)).date().isoformat()
        }
        resp = provider_client.post('/api/service-providers/bookings/', booking_data)
        assert resp.status_code == 403
        assert 'No active consent' in resp.data['error']

    def test_patient_can_still_book_normally(self, patient_client, provider_user, patient_user):
        """Patient should be able to book service without needing provider-held consent."""
        provider_profile = provider_user.service_provider_profile
        service = ProviderService.objects.create(
            organization=provider_profile,
            name="Consultation",
            price=30.00,
            approval_status='approved'
        )

        booking_data = {
            'service': service.id,
            'date': (timezone.now() + timedelta(days=2)).date().isoformat()
        }
        resp = patient_client.post('/api/service-providers/bookings/', booking_data)
        assert resp.status_code == 201

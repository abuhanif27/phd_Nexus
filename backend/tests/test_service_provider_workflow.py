import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from apps.users.models import User
from apps.service_providers.models import ServiceProviderOrganization, ProviderService
from apps.service_providers.scheduling_models import ServiceAvailability, ServiceBooking

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def provider_user(db):
    user = User.objects.create_user(
        email='provider_test@example.com',
        password='password123',
        role='provider'
    )
    # Create approved organization
    ServiceProviderOrganization.objects.create(
        user=user,
        organization_name='Test Hospital',
        district='Dhaka',
        address='Test Address',
        latitude=23.8103,
        longitude=90.4125,
        verification_status='approved',
        is_verified=True
    )
    return user

@pytest.fixture
def patient_user(db):
    user = User.objects.create_user(
        email='patient_test@example.com',
        password='password123',
        role='patient'
    )
    from apps.patients.models import Patient
    Patient.objects.create(user=user, name='Test Patient')
    return user

@pytest.mark.django_db
class TestServiceProviderWorkflow:
    def test_complete_service_flow(self, api_client, provider_user, patient_user):
        """Test standard creation, approval, availability, booking, and confirmation."""
        # 1. Provider creates a service
        api_client.force_authenticate(user=provider_user)
        service_data = {
            'name': 'Test CBC',
            'category': 'lab_test',
            'price': '1000.00',
            'is_available': True
        }
        url = reverse('provider-service-list')
        response = api_client.post(url, service_data)
        assert response.status_code == status.HTTP_201_CREATED
        service_id = response.data['id']
        assert response.data['approval_status'] == 'pending'

        # 2. Public marketplace should NOT show it yet
        api_client.force_authenticate(user=None)
        response = api_client.get(url)
        services = response.data if isinstance(response.data, list) else response.data.get('results', [])
        assert not any(s['id'] == service_id for s in services)

        # 3. Admin approves service
        service = ProviderService.objects.get(id=service_id)
        service.approval_status = 'approved'
        service.save()

        # 4. Now marketplace should show it
        response = api_client.get(url)
        services = response.data if isinstance(response.data, list) else response.data.get('results', [])
        assert any(s['id'] == service_id for s in services)

        # 5. Provider sets availability (service is optional now)
        api_client.force_authenticate(user=provider_user)
        avail_url = reverse('service-availability-list')
        avail_data = {
            'date': '2026-06-01',
            'start_time': '10:00:00',
            'end_time': '12:00:00',
            'slots_per_session': 5
        }
        response = api_client.post(avail_url, avail_data)
        assert response.status_code == status.HTTP_201_CREATED
        avail_id = response.data['id']

        # 6. Patient books the service
        api_client.force_authenticate(user=patient_user)
        booking_url = reverse('service-booking-list')
        booking_data = {
            'service': service_id,
            'availability': avail_id,
            'date': '2026-06-01',
            'preferred_time': '10:30:00',
            'notes': 'I need this test'
        }
        response = api_client.post(booking_url, booking_data)
        assert response.status_code == status.HTTP_201_CREATED
        booking_id = response.data['id']
        assert response.data['status'] == 'pending'

        # 7. Provider sees and confirms the booking
        api_client.force_authenticate(user=provider_user)
        booking_detail_url = reverse('service-booking-detail', kwargs={'pk': booking_id})
        response = api_client.patch(booking_detail_url, {'status': 'confirmed'})
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'confirmed'

    def test_rejection_and_correction_flow(self, api_client, provider_user):
        """Test service rejection, feedback, and provider correction."""
        api_client.force_authenticate(user=provider_user)
        
        # 1. Create service
        url = reverse('provider-service-list')
        response = api_client.post(url, {'name': 'To Be Rejected', 'category': 'imaging', 'price': '5000'})
        print(f"\nDEBUG: Create service response: {response.data}")
        service_id = response.data['id']
        
        # 2. Admin rejects with feedback
        service = ProviderService.objects.get(id=service_id)
        service.approval_status = 'rejected'
        service.admin_feedback = 'Please provide more details in description.'
        service.save()
        
        # 3. Provider views rejection
        response = api_client.get(reverse('provider-service-detail', kwargs={'pk': service_id}))
        assert response.data['approval_status'] == 'rejected'
        assert response.data['admin_feedback'] == 'Please provide more details in description.'
        
        # 4. Provider corrects and updates
        response = api_client.patch(
            reverse('provider-service-detail', kwargs={'pk': service_id}),
            {'description': 'Updated with detail'}
        )
        assert response.status_code == status.HTTP_200_OK
        # 5. Status MUST revert to pending after provider edit
        assert response.data['approval_status'] == 'pending'

    def test_location_sorting(self, api_client):
        """Test that services are sorted by distance when coordinates are provided."""
        # Setup: Two organizations at different distances
        # Org 1: Dhaka (Far from user at 22.0, 90.0)
        # Org 2: User-local (Near user at 22.01, 90.01)
        
        user_lat, user_lng = 22.0, 90.0
        
        u1 = User.objects.create_user(email='far@ex.com', password='p', role='provider')
        o1 = ServiceProviderOrganization.objects.create(
            user=u1, organization_name='Far Hospital', latitude=24.0, longitude=91.0, 
            verification_status='approved', is_verified=True
        )
        s1 = ProviderService.objects.create(organization=o1, name='Far CBC', price=1000, approval_status='approved')
        
        u2 = User.objects.create_user(email='near@ex.com', password='p', role='provider')
        o2 = ServiceProviderOrganization.objects.create(
            user=u2, organization_name='Near Hospital', latitude=22.1, longitude=90.1, 
            verification_status='approved', is_verified=True
        )
        s2 = ProviderService.objects.create(organization=o2, name='Near CBC', price=1000, approval_status='approved')
        
        # Query marketplace with user coordinates
        url = reverse('provider-service-list')
        response = api_client.get(url, {'user_lat': user_lat, 'user_lng': user_lng})
        services = response.data if isinstance(response.data, list) else response.data.get('results', [])
        
        # 'Near Hospital' (Near CBC) should be first
        assert services[0]['name'] == 'Near CBC'
        assert services[1]['name'] == 'Far CBC'

    def test_unauthenticated_access(self, api_client):
        """Test guest access doesn't crash and shows only approved content."""
        url = reverse('provider-service-list')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        # Should be an empty list as we haven't approved anything in this clean DB setup yet,
        # but the important part is it doesn't return a 500 error.
        assert isinstance(response.data, (list, dict))

import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.doctors.models import Doctor
from apps.service_providers.models import ServiceProviderOrganization
from apps.reviews.models import Review

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def users(db):
    patient = User.objects.create_user(email='patient@test.com', password='SecurePass!2026', role='patient')
    doctor_user = User.objects.create_user(email='doctor@test.com', password='SecurePass!2026', role='doctor')
    provider_user = User.objects.create_user(email='provider@test.com', password='SecurePass!2026', role='provider')
    return patient, doctor_user, provider_user

@pytest.fixture
def profiles(db, users):
    p_user, d_user, pr_user = users
    doctor = Doctor.objects.create(user=d_user, name='Test Doctor', specialty='General')
    org = ServiceProviderOrganization.objects.create(
        user=pr_user, 
        organization_name='Test Org', 
        contact_person='Manager',
        phone='123456',
        address='Dhaka',
        district='Dhaka',
        verification_status='approved',
        is_verified=True
    )
    return doctor, org

@pytest.mark.django_db
class TestLocationAndReviewAPI:
    def test_patient_registration_with_location(self, api_client):
        data = {
            'email': 'reg_patient@test.com',
            'password': 'SecurePass!2026',
            'password_confirm': 'SecurePass!2026',
            'role': 'patient',
            'patient_profile': {
                'name': 'Reg Patient',
                'address': 'Dhaka, Bangladesh',
                'latitude': 23.8103,
                'longitude': 90.4125,
                'google_place_id': 'osm-1'
            }
        }
        response = api_client.post('/api/auth/register/', data, format='json')
        assert response.status_code == 201
        user = User.objects.get(email='reg_patient@test.com')
        assert float(user.patient_profile.latitude) == pytest.approx(23.8103)
        assert user.patient_profile.google_place_id == 'osm-1'

    def test_doctor_registration_with_location(self, api_client):
        data = {
            'email': 'reg_doctor@test.com',
            'password': 'SecurePass!2026',
            'password_confirm': 'SecurePass!2026',
            'role': 'doctor',
            'doctor_profile': {
                'name': 'Reg Doctor',
                'specialty': 'Cardiology',
                'location': 'Dhaka Clinic',
                'latitude': 23.8103,
                'longitude': 90.4125,
                'google_place_id': 'osm-1'
            }
        }
        response = api_client.post('/api/auth/register/', data, format='json')
        assert response.status_code == 201
        user = User.objects.get(email='reg_doctor@test.com')
        assert float(user.doctor_profile.latitude) == pytest.approx(23.8103)

    def test_provider_registration_with_location(self, api_client):
        data = {
            'email': 'reg_provider@test.com',
            'password': 'SecurePass!2026',
            'password_confirm': 'SecurePass!2026',
            'role': 'provider',
            'provider_profile': {
                'organization_name': 'Reg Org',
                'contact_person': 'Owner',
                'phone': '999888',
                'address': 'North Dhaka',
                'district': 'Dhaka',
                'latitude': 23.8103,
                'longitude': 90.4125,
                'google_place_id': 'osm-1'
            }
        }
        response = api_client.post('/api/auth/register/', data, format='json')
        assert response.status_code == 201
        user = User.objects.get(email='reg_provider@test.com')
        assert float(user.service_provider_profile.latitude) == pytest.approx(23.8103)

    def test_submit_review_api(self, api_client, users, profiles):
        patient, _, _ = users
        doctor, _ = profiles
        api_client.force_authenticate(user=patient)
        
        data = {
            'doctor': doctor.id,
            'rating': 5,
            'comment': 'Excellent service'
        }
        response = api_client.post('/api/reviews/', data, format='json')
        assert response.status_code == 201
        doctor.refresh_from_db()
        assert doctor.rating == 5.0

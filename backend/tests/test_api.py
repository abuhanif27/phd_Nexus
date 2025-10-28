"""
Sample tests for the backend.
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.patients.models import Patient
from apps.doctors.models import Doctor

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def patient_user(db):
    user = User.objects.create_user(
        email='test_patient@example.com',
        password='testpass123',
        role='patient'
    )
    Patient.objects.create(
        user=user,
        name='Test Patient',
        gender='M'
    )
    return user


@pytest.fixture
def doctor_user(db):
    user = User.objects.create_user(
        email='test_doctor@example.com',
        password='testpass123',
        role='doctor'
    )
    Doctor.objects.create(
        user=user,
        name='Dr. Test',
        specialty='General Physician'
    )
    return user


@pytest.mark.django_db
def test_user_registration(api_client):
    """Test user registration endpoint."""
    data = {
        'email': 'newuser@example.com',
        'password': 'NewPass123!',
        'password_confirm': 'NewPass123!',
        'role': 'patient'
    }
    response = api_client.post('/api/auth/register/', data)
    assert response.status_code == 201
    assert 'access' in response.data
    assert 'refresh' in response.data


@pytest.mark.django_db
def test_user_login(api_client, patient_user):
    """Test user login endpoint."""
    data = {
        'email': 'test_patient@example.com',
        'password': 'testpass123'
    }
    response = api_client.post('/api/auth/login/', data)
    assert response.status_code == 200
    assert 'access' in response.data


@pytest.mark.django_db
def test_protected_endpoint_requires_auth(api_client):
    """Test that protected endpoints require authentication."""
    response = api_client.get('/api/auth/me/')
    assert response.status_code == 401


@pytest.mark.django_db
def test_authenticated_access(api_client, patient_user):
    """Test authenticated access to protected endpoint."""
    # Login
    data = {
        'email': 'test_patient@example.com',
        'password': 'testpass123'
    }
    login_response = api_client.post('/api/auth/login/', data)
    access_token = login_response.data['access']
    
    # Access protected endpoint
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
    response = api_client.get('/api/auth/me/')
    assert response.status_code == 200
    assert response.data['email'] == 'test_patient@example.com'

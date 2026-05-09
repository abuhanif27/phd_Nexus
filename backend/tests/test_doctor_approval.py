import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.doctors.models import Doctor

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def admin_user():
    return User.objects.create_superuser(email="admin@example.com", password="AdminPassword123!")

@pytest.fixture
def admin_client(api_client, admin_user):
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(admin_user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return api_client

@pytest.mark.django_db
def test_doctor_registration_pending_flow(api_client, admin_client):
    # 1. Register a doctor
    payload = {
        "email": "doctor@example.com",
        "password": "Password123!",
        "password_confirm": "Password123!",
        "role": "doctor",
        "name": "Dr. Smith",
        "phone": "1234567890",
        "doctor_profile": {
            "name": "Dr. Smith",
            "specialty": "Cardiology",
            "qualifications": "MD"
        }
    }
    resp = api_client.post('/api/auth/register/', payload, format='json')
    assert resp.status_code == 201
    assert resp.data['pending_approval'] == True
    
    # 2. Try to login (should fail)
    login_resp = api_client.post('/api/auth/login/', {
        "email": "doctor@example.com",
        "password": "Password123!"
    })
    assert login_resp.status_code == 403
    assert "pending admin approval" in login_resp.data['error']
    
    # 3. Admin lists pending doctors
    pending_resp = admin_client.get('/api/doctors/approvals/')
    assert pending_resp.status_code == 200
    assert len(pending_resp.data) >= 1
    doctor_id = pending_resp.data[0]['id']
    
    # 4. Admin approves doctor
    approve_resp = admin_client.post(f'/api/doctors/approvals/{doctor_id}/', {
        "action": "approve",
        "notes": "Verified credentials"
    })
    assert approve_resp.status_code == 200
    
    # 5. Doctor can now login
    login_resp_2 = api_client.post('/api/auth/login/', {
        "email": "doctor@example.com",
        "password": "Password123!"
    })
    assert login_resp_2.status_code == 200
    assert 'access' in login_resp_2.data

@pytest.mark.django_db
def test_doctor_registration_missing_field_error(api_client):
    # Test "hidden error" clearing - ensure details are returned
    payload = {
        "email": "fail@example.com",
        "password": "Password123!",
        "password_confirm": "Password123!",
        "role": "doctor",
        "name": "Dr. Fail",
        # Missing specialty in doctor_profile
        "doctor_profile": {
            "name": "Dr. Fail"
        }
    }
    resp = api_client.post('/api/auth/register/', payload, format='json')
    assert resp.status_code == 400
    assert 'details' in resp.data
    assert 'specialty' in str(resp.data['details'])

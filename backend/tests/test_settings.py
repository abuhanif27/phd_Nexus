import pytest
import pyotp
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.users.models import UserSettings

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def user():
    return User.objects.create_user(email="test@example.com", password="password123", role="patient")

@pytest.fixture
def auth_client(api_client, user):
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return api_client

@pytest.mark.django_db
def test_get_settings(auth_client, user):
    response = auth_client.get('/api/auth/settings/')
    assert response.status_code == 200
    assert response.data['theme'] == 'system'

@pytest.mark.django_db
def test_update_settings(auth_client, user):
    response = auth_client.put('/api/auth/settings/', {'theme': 'dark', 'email_notifications': False}, format='json')
    assert response.status_code == 200
    assert response.data['theme'] == 'dark'
    assert response.data['email_notifications'] == False

@pytest.mark.django_db
def test_update_profile(auth_client, user):
    response = auth_client.put('/api/auth/profile/', {'phone': '1234567890'}, format='json')
    assert response.status_code == 200
    user.refresh_from_db()
    assert user.phone == '1234567890'

@pytest.mark.django_db
def test_change_password(auth_client, user):
    response = auth_client.post('/api/auth/password/change/', {
        'current_password': 'password123',
        'new_password': 'NewPassword123!',
        'confirm_password': 'NewPassword123!'
    }, format='json')
    assert response.status_code == 200
    user.refresh_from_db()
    assert user.check_password('NewPassword123!')

@pytest.mark.django_db
def test_toggle_2fa(auth_client, user):
    # New flow: Setup -> Toggle with valid code
    setup_resp = auth_client.get('/api/auth/2fa/setup/')
    assert setup_resp.status_code == 200
    secret = setup_resp.data['secret']
    
    totp = pyotp.TOTP(secret)
    code = totp.now()
    
    # Enable
    response = auth_client.post('/api/auth/2fa/toggle/', {
        'action': 'enable',
        'method': 'totp',
        'code': code
    }, format='json')
    assert response.status_code == 200
    
    user.refresh_from_db()
    assert user.twofa_enabled == True

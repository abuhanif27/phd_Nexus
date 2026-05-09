import pytest
import pyotp
from django.core import mail
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.users.models import OTPToken

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def user():
    return User.objects.create_user(email="real@example.com", password="Password123!", role="patient")

@pytest.fixture
def auth_client(api_client, user):
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return api_client

@pytest.mark.django_db
def test_email_change_flow(auth_client, user):
    # 1. Request email change
    new_email = "new@example.com"
    response = auth_client.post('/api/auth/email/change-request/', {'new_email': new_email})
    assert response.status_code == 200
    assert len(mail.outbox) == 1
    assert new_email in mail.outbox[0].to
    
    # 2. Get OTP from DB (simulating reading email)
    otp = OTPToken.objects.get(user=user, purpose='email_change')
    
    # 3. Verify OTP
    response = auth_client.post('/api/auth/email/change-verify/', {'code': otp.code})
    assert response.status_code == 200
    
    # 4. Check if email updated
    user.refresh_from_db()
    assert user.email == new_email
    assert user.email_verified == True

@pytest.mark.django_db
def test_2fa_totp_flow(auth_client, user, api_client):
    # 1. Setup TOTP
    response = auth_client.get('/api/auth/2fa/setup/')
    assert response.status_code == 200
    secret = response.data['secret']
    
    # 2. Enable TOTP (requires valid code)
    totp = pyotp.TOTP(secret)
    code = totp.now()
    response = auth_client.post('/api/auth/2fa/toggle/', {
        'action': 'enable',
        'method': 'totp',
        'code': code
    })
    assert response.status_code == 200
    
    user.refresh_from_db()
    assert user.twofa_enabled == True
    assert user.twofa_method == 'totp'
    
    # 3. Test Login with 2FA
    # First login attempt
    login_resp = api_client.post('/api/auth/login/', {
        'email': 'real@example.com',
        'password': 'Password123!'
    })
    assert login_resp.status_code == 200
    assert login_resp.data['requires_2fa'] == True
    user_id = login_resp.data['user_id']
    
    # 4. Verify 2FA to get tokens
    verify_resp = api_client.post('/api/auth/2fa/verify/', {
        'user_id': user_id,
        'code': totp.now()
    })
    assert verify_resp.status_code == 200
    assert 'access' in verify_resp.data

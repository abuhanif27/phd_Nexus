"""
URL routing for user authentication.
"""
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, VerifyRegistrationOTPView, LoginView, TwoFASendView, TwoFAVerifyView, MeView,
    UserSettingsView, ProfileUpdateView, ChangePasswordView, TwoFAToggleView,
    EmailChangeRequestView, EmailChangeVerifyView, TwoFASetupView,
    PasswordResetRequestView, PasswordResetVerifyView
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('verify-registration/', VerifyRegistrationOTPView.as_view(), name='verify_registration'),
    path('login/', LoginView.as_view(), name='login'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # 2FA
    path('2fa/send/', TwoFASendView.as_view(), name='2fa_send'),
    path('2fa/verify/', TwoFAVerifyView.as_view(), name='2fa_verify'),
    path('2fa/setup/', TwoFASetupView.as_view(), name='2fa_setup'),
    path('2fa/toggle/', TwoFAToggleView.as_view(), name='2fa_toggle'),
    
    # Profile & Settings
    path('me/', MeView.as_view(), name='me'),
    path('settings/', UserSettingsView.as_view(), name='user_settings'),
    path('profile/', ProfileUpdateView.as_view(), name='profile_update'),
    path('password/change/', ChangePasswordView.as_view(), name='password_change'),
    
    # Email Change
    path('email/change-request/', EmailChangeRequestView.as_view(), name='email_change_request'),
    path('email/change-verify/', EmailChangeVerifyView.as_view(), name='email_change_verify'),

    # Password Reset
    path('password/reset-request/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('password/reset-verify/', PasswordResetVerifyView.as_view(), name='password_reset_verify'),
]

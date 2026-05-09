"""
URL routing for user authentication.
"""
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, LoginView, TwoFASendView, TwoFAVerifyView, MeView,
    UserSettingsView, ProfileUpdateView, ChangePasswordView, TwoFAToggleView
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('2fa/send/', TwoFASendView.as_view(), name='2fa_send'),
    path('2fa/verify/', TwoFAVerifyView.as_view(), name='2fa_verify'),
    path('me/', MeView.as_view(), name='me'),
    path('settings/', UserSettingsView.as_view(), name='user_settings'),
    path('profile/', ProfileUpdateView.as_view(), name='profile_update'),
    path('password/change/', ChangePasswordView.as_view(), name='password_change'),
    path('2fa/toggle/', TwoFAToggleView.as_view(), name='2fa_toggle'),
]

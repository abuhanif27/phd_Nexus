"""
URL routing for user authentication.
"""
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import RegisterView, LoginView, TwoFASendView, TwoFAVerifyView, MeView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('2fa/send/', TwoFASendView.as_view(), name='2fa_send'),
    path('2fa/verify/', TwoFAVerifyView.as_view(), name='2fa_verify'),
    path('me/', MeView.as_view(), name='me'),
]

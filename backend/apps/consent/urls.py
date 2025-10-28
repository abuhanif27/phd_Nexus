"""
URL routing for consent management.
"""
from django.urls import path
from .views import GrantConsentView, ClaimConsentView, RevokeConsentView, AuditLogListView

urlpatterns = [
    path('grant/', GrantConsentView.as_view(), name='grant_consent'),
    path('claim/', ClaimConsentView.as_view(), name='claim_consent'),
    path('revoke/<int:consent_id>/', RevokeConsentView.as_view(), name='revoke_consent'),
    path('audits/', AuditLogListView.as_view(), name='audit_logs'),
]

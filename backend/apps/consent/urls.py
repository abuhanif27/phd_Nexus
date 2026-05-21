"""
URL routing for consent management.
"""
from django.urls import path
from .views import (
    GrantConsentView, ClaimConsentView, RevokeConsentView, 
    ConsentListView, AuditLogListView, RequestBookingPermissionView,
    ApproveBookingPermissionView
)

urlpatterns = [
    path('list/', ConsentListView.as_view(), name='list_consents'),
    path('grant/', GrantConsentView.as_view(), name='grant_consent'),
    path('claim/', ClaimConsentView.as_view(), name='claim_consent'),
    path('revoke/<int:consent_id>/', RevokeConsentView.as_view(), name='revoke_consent'),
    path('request-booking/', RequestBookingPermissionView.as_view(), name='request_booking_permission'),
    path('approve-booking/', ApproveBookingPermissionView.as_view(), name='approve_booking_permission'),
    path('audits/', AuditLogListView.as_view(), name='audit_logs'),
]

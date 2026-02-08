"""
URL routing for notifications.
"""
from django.urls import path
from .views import NotificationListView, RequestAccessNotificationView, AcceptAccessRequestView

urlpatterns = [
    path('', NotificationListView.as_view(), name='notifications_list'),
    path('request-access/', RequestAccessNotificationView.as_view(), name='request_access_notification'),
    path('accept-request/', AcceptAccessRequestView.as_view(), name='accept_access_request'),
]

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ProviderServiceViewSet,
    ServiceProviderApprovalView,
    ServiceProviderOrganizationViewSet,
)

router = DefaultRouter()
router.register('organizations', ServiceProviderOrganizationViewSet, basename='service-provider-organization')
router.register('services', ProviderServiceViewSet, basename='provider-service')

urlpatterns = [
    path('approvals/', ServiceProviderApprovalView.as_view(), name='service-provider-approvals'),
    path('approvals/<int:pk>/', ServiceProviderApprovalView.as_view(), name='service-provider-approval-detail'),
    path('', include(router.urls)),
]


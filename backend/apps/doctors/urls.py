"""
URL routing for doctors.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DoctorViewSet
from apps.scheduling.views import (
    DoctorAvailabilityViewSet,
    DoctorProfileView,
    DoctorDashboardStatsView,
    DoctorAppointmentsView,
    DoctorPatientsView,
)

# Single router — avoids two DefaultRouters competing at the same '' prefix.
# Two DefaultRouters both at '' cause the availability router's API-root view
# to intercept GET /api/doctors/ before the DoctorViewSet list can respond.
router = DefaultRouter()
router.register('', DoctorViewSet, basename='doctor')
router.register('availability', DoctorAvailabilityViewSet, basename='doctor-availability')

urlpatterns = [
    # Doctor-specific endpoints (must come before the router to avoid
    # being swallowed by the '' registration's detail pattern)
    path('me/', DoctorProfileView.as_view(), name='doctor-me'),
    path('dashboard/stats/', DoctorDashboardStatsView.as_view(), name='doctor-stats'),
    path('appointments/', DoctorAppointmentsView.as_view(), name='doctor-appointments'),
    path('patients/', DoctorPatientsView.as_view(), name='doctor-patients'),
    # All remaining CRUD routes (doctors list/detail + availability CRUD)
    path('', include(router.urls)),
]

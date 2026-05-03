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

# Public doctor list/detail (for patients to browse)
doctor_router = DefaultRouter()
doctor_router.register('', DoctorViewSet, basename='doctor')

# Doctor-owned availability CRUD
availability_router = DefaultRouter()
availability_router.register('availability', DoctorAvailabilityViewSet, basename='doctor-availability')

urlpatterns = [
    # Doctor-specific endpoints (must come before the catch-all router)
    path('me/', DoctorProfileView.as_view(), name='doctor-me'),
    path('dashboard/stats/', DoctorDashboardStatsView.as_view(), name='doctor-stats'),
    path('appointments/', DoctorAppointmentsView.as_view(), name='doctor-appointments'),
    path('patients/', DoctorPatientsView.as_view(), name='doctor-patients'),
    # Availability CRUD: /api/doctors/availability/ and /api/doctors/availability/{id}/
    path('', include(availability_router.urls)),
    # Public doctor browse: /api/doctors/ and /api/doctors/{id}/
    path('', include(doctor_router.urls)),
]

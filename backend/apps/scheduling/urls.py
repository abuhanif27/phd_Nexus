"""
URL routing for scheduling.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DoctorSlotsView, AppointmentViewSet, DoctorAvailabilityByIdView

router = DefaultRouter()
router.register('appointments', AppointmentViewSet, basename='appointment')

urlpatterns = [
    # Available time slots for a doctor on a date (used by patient booking)
    path('doctors/<int:doctor_id>/slots/', DoctorSlotsView.as_view(), name='doctor_slots'),
    # Full availability schedule for a doctor (used by patient to preview a doctor's week)
    path('doctor-availability/<int:doctor_id>/', DoctorAvailabilityByIdView.as_view(), name='doctor_availability_by_id'),
    path('', include(router.urls)),
]

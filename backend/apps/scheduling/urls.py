"""
URL routing for scheduling.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DoctorSlotsView, AppointmentViewSet

router = DefaultRouter()
router.register('appointments', AppointmentViewSet, basename='appointment')

urlpatterns = [
    path('doctors/<int:doctor_id>/slots/', DoctorSlotsView.as_view(), name='doctor_slots'),
    path('', include(router.urls)),
]

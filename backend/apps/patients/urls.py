"""
URL routing for patients.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PatientViewSet
from apps.scheduling.views import PatientAppointmentsView

router = DefaultRouter()
router.register('', PatientViewSet, basename='patient')

urlpatterns = [
    path('appointments/', PatientAppointmentsView.as_view(), name='patient-appointments'),
    path('', include(router.urls)),
]

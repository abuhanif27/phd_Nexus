"""
URL routing for medical records.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    FileUploadView, FileSignedLinkView, LabResultViewSet,
    PrescriptionViewSet, EncounterViewSet, RecordsSummaryView
)

router = DefaultRouter()
router.register('labs', LabResultViewSet, basename='lab')
router.register('prescriptions', PrescriptionViewSet, basename='prescription')
router.register('encounters', EncounterViewSet, basename='encounter')

urlpatterns = [
    path('files/upload/', FileUploadView.as_view(), name='file_upload'),
    path('files/<int:file_id>/link/', FileSignedLinkView.as_view(), name='file_link'),
    path('summary/', RecordsSummaryView.as_view(), name='records_summary'),
    path('', include(router.urls)),
]

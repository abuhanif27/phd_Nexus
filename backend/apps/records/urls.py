"""
URL routing for medical records.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    FileUploadView, FileSignedLinkView, FileServeView, FileViewSet, LabResultViewSet,
    PrescriptionViewSet, EncounterViewSet, RecordsSummaryView,
    DoctorPatientDocumentsByCodeView, DoctorPatientDocumentSummaryByCodeView
)

router = DefaultRouter()
router.register('files', FileViewSet, basename='file')
router.register('labs', LabResultViewSet, basename='lab')
router.register('prescriptions', PrescriptionViewSet, basename='prescription')
router.register('encounters', EncounterViewSet, basename='encounter')

urlpatterns = [
    path('files/upload/', FileUploadView.as_view(), name='file_upload'),
    path('files/<int:file_id>/link/', FileSignedLinkView.as_view(), name='file_link'),
    path('files/<int:file_id>/serve/', FileServeView.as_view(), name='file_serve'),
    path('doctor/patient-documents/', DoctorPatientDocumentsByCodeView.as_view(), name='doctor_patient_documents_by_code'),
    path('doctor/patient-documents/summary/', DoctorPatientDocumentSummaryByCodeView.as_view(), name='doctor_patient_documents_summary_by_code'),
    path('summary/', RecordsSummaryView.as_view(), name='records_summary'),
    path('', include(router.urls)),
]

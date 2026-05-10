"""
Views for medical records management.
"""
import os
from django.conf import settings
from django.db import models
from django.http import FileResponse, Http404
from django.utils import timezone
from rest_framework import viewsets, views, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from apps.consent.permissions import IsPatient, IsDoctor
from apps.consent.models import Consent
from apps.patients.models import Patient
from .models import File, LabResult, Prescription, Encounter, SymptomLog
from .serializers import (
    FileSerializer, LabResultSerializer, PrescriptionSerializer,
    EncounterSerializer, SymptomLogSerializer
)
from .utils import sign_file_path, verify_file_signature
from apps.ai.tasks import process_file_task
from apps.ai.services import ai_service


def get_patients_with_consent(doctor_user):
    """Helper: Get patient IDs that have granted active consent to this doctor."""
    consents = Consent.objects.filter(
        doctor__user=doctor_user,
        status='active',
        expires_at__gt=timezone.now()
    ).values_list('patient_id', flat=True)
    return list(consents)


def doctor_has_active_consent_for_patient(doctor_user, patient):
    return Consent.objects.filter(
        patient=patient,
        doctor__user=doctor_user,
        status='active',
        expires_at__gt=timezone.now()
    ).exists()


class FileUploadView(views.APIView):
    """Upload medical files."""
    permission_classes = [IsAuthenticated, IsPatient]
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request):
        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return Response(
                {'error': 'No file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        kind = request.data.get('kind', 'other')
        patient = request.user.patient_profile
        
        # Create directory for patient
        patient_dir = os.path.join(settings.MEDIA_ROOT, str(patient.id))
        os.makedirs(patient_dir, exist_ok=True)
        
        # Save file
        file_path = os.path.join(patient_dir, uploaded_file.name)
        with open(file_path, 'wb+') as destination:
            for chunk in uploaded_file.chunks():
                destination.write(chunk)
        
        # Create file record
        file_obj = File.objects.create(
            patient=patient,
            kind=kind,
            filename=uploaded_file.name,
            storage_path=file_path,
            mime=uploaded_file.content_type,
            size=uploaded_file.size
        )
        
        # Trigger OCR for image files (any kind) so health summary can analyze document content
        mime = (uploaded_file.content_type or '').lower()
        name = (uploaded_file.name or '').lower()
        is_image = mime.startswith('image/') or any(name.endswith(ext) for ext in ('.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'))
        print(f"[FileUpload] File: {uploaded_file.name}, mime: {mime}, is_image: {is_image}, kind: {kind}")
        if is_image or kind in ['lab', 'prescription']:
            print(f"[FileUpload] Triggering OCR for file {file_obj.id}")
            try:
                process_file_task(file_obj.id)
                print(f"[FileUpload] OCR task triggered successfully")
            except Exception as e:
                print(f"[FileUpload] Error triggering OCR: {e}")
        
        return Response(
            FileSerializer(file_obj).data,
            status=status.HTTP_201_CREATED
        )


class FileSignedLinkView(views.APIView):
    """Generate signed download link for a file."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, file_id):
        try:
            file_obj = File.objects.get(id=file_id)
            
            # Check ownership or consent
            if request.user.role == 'patient':
                if file_obj.patient.user != request.user:
                    return Response(
                        {'error': 'Access denied'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            elif request.user.role == 'doctor':
                # Check if doctor has active consent to view this patient's files
                from apps.consent.models import Consent
                
                has_consent = Consent.objects.filter(
                    patient=file_obj.patient,
                    doctor__user=request.user,
                    status='active',
                    expires_at__gt=timezone.now()
                ).exists()
                
                if not has_consent:
                    return Response(
                        {'error': 'No active consent to access this patient\'s records'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            # Generate signed URL
            relative_path = os.path.relpath(file_obj.storage_path, settings.MEDIA_ROOT)
            query_string = sign_file_path(relative_path)
            signed_url = f"{settings.MEDIA_URL}{relative_path}?{query_string}"
            
            return Response({
                'url': request.build_absolute_uri(signed_url),
                'expires_in': settings.FILE_LINK_EXPIRY_SECONDS
            })
        
        except File.DoesNotExist:
            return Response(
                {'error': 'File not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class FileServeView(views.APIView):
    """Serve file content with authentication (for in-app viewing)."""
    permission_classes = [IsAuthenticated]

    def get(self, request, file_id):
        try:
            file_obj = File.objects.get(id=file_id)
            
            # Check ownership or consent
            is_owner = file_obj.patient.user_id == request.user.id
            
            if not is_owner:
                # Check if doctor has consent
                if request.user.role == 'doctor':
                    has_consent = Consent.objects.filter(
                        patient=file_obj.patient,
                        doctor__user=request.user,
                        status='active',
                        expires_at__gt=timezone.now()
                    ).exists()
                    if not has_consent:
                        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
                else:
                    return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
            
            # Resolve path: handle Windows-style absolute paths stored in DB when running on Linux
            path = file_obj.storage_path
            
            # If path looks like a Windows absolute path (e.g., F:\CODE\...), extract the relative part
            if ':\\' in path or path.startswith('\\\\'):
                # Extract parts after 'media' or use patient_id/filename as fallback
                if 'media' in path.lower():
                    relative_part = path.lower().split('media')[-1].lstrip('\\/')
                    path = os.path.join(settings.MEDIA_ROOT, relative_part.replace('\\', '/'))
                else:
                    path = os.path.join(settings.MEDIA_ROOT, str(file_obj.patient_id), file_obj.filename)
            
            if not os.path.isabs(path):
                path = os.path.join(settings.MEDIA_ROOT, path)

            if not os.path.isfile(path):
                # Fallback to standard patient_id/filename structure
                path = os.path.join(settings.MEDIA_ROOT, str(file_obj.patient_id), file_obj.filename)

            if not os.path.isfile(path):
                return Response({'error': 'File not found on disk'}, status=status.HTTP_404_NOT_FOUND)

            response = FileResponse(
                open(path, 'rb'),
                content_type=file_obj.mime or 'application/octet-stream',
                as_attachment=False,
            )
            response['Content-Disposition'] = f'inline; filename="{file_obj.filename}"'
            return response
        except File.DoesNotExist:
            return Response({'error': 'File not found'}, status=status.HTTP_404_NOT_FOUND)


class FileViewSet(viewsets.ModelViewSet):
    """CRUD operations for medical files."""
    queryset = File.objects.all()
    serializer_class = FileSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'delete']  # No PUT/PATCH for files
    
    def get_queryset(self):
        if self.request.user.role == 'patient':
            return self.queryset.filter(patient__user=self.request.user).order_by('-created_at')
        elif self.request.user.role == 'doctor':
            # Doctors can only see files from patients with active consent
            patient_ids = get_patients_with_consent(self.request.user)
            queryset = self.queryset.filter(patient_id__in=patient_ids)
            patient_id = self.request.query_params.get('patient')
            if patient_id:
                queryset = queryset.filter(patient_id=patient_id)
            return queryset.order_by('-created_at')
        return self.queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        """Set patient automatically."""
        if self.request.user.role == 'patient':
            serializer.save(patient=self.request.user.patient_profile)
        else:
            serializer.save()


class LabResultViewSet(viewsets.ModelViewSet):
    """CRUD operations for lab results."""
    queryset = LabResult.objects.all()
    serializer_class = LabResultSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        if self.request.user.role == 'patient':
            return self.queryset.filter(patient__user=self.request.user).order_by('-ts')
        elif self.request.user.role == 'doctor':
            # Doctors can only see lab results from patients with active consent
            patient_ids = get_patients_with_consent(self.request.user)
            return self.queryset.filter(patient_id__in=patient_ids).order_by('-ts')
        return self.queryset.order_by('-ts')


class PrescriptionViewSet(viewsets.ModelViewSet):
    """CRUD operations for prescriptions."""
    queryset = Prescription.objects.all()
    serializer_class = PrescriptionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        if self.request.user.role == 'patient':
            return self.queryset.filter(patient__user=self.request.user).order_by('-ts')
        elif self.request.user.role == 'doctor':
            # Doctors see prescriptions they wrote OR from patients with active consent
            patient_ids = get_patients_with_consent(self.request.user)
            return self.queryset.filter(
                models.Q(doctor__user=self.request.user) | models.Q(patient_id__in=patient_ids)
            ).order_by('-ts')
        return self.queryset.order_by('-ts')


class EncounterViewSet(viewsets.ModelViewSet):
    """CRUD operations for encounters."""
    queryset = Encounter.objects.all()
    serializer_class = EncounterSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        if self.request.user.role == 'patient':
            return self.queryset.filter(patient__user=self.request.user).order_by('-ts')
        elif self.request.user.role == 'doctor':
            # Doctors see encounters they created OR from patients with active consent
            patient_ids = get_patients_with_consent(self.request.user)
            return self.queryset.filter(
                models.Q(doctor__user=self.request.user) | models.Q(patient_id__in=patient_ids)
            ).order_by('-ts')
        return self.queryset.order_by('-ts')


class RecordsSummaryView(views.APIView):
    """Get summary of patient's recent records."""
    permission_classes = [IsAuthenticated, IsPatient]
    
    def get(self, request):
        patient = request.user.patient_profile
        
        return Response({
            'labs': LabResultSerializer(
                patient.lab_results.all().order_by('-ts')[:5], 
                many=True
            ).data,
            'prescriptions': PrescriptionSerializer(
                patient.prescriptions.all().order_by('-ts')[:5],
                many=True
            ).data,
            'encounters': EncounterSerializer(
                patient.encounters.all().order_by('-ts')[:5],
                many=True
            ).data
        })


class DoctorPatientDocumentsByCodeView(views.APIView):
    """Doctor-only: get all uploaded documents for a patient by unique patient code."""
    permission_classes = [IsAuthenticated, IsDoctor]

    def get(self, request):
        patient_code = (request.query_params.get('patient_code') or '').strip().upper()
        if not patient_code:
            return Response(
                {'error': 'patient_code is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            patient = Patient.objects.get(patient_code=patient_code, user__role='patient')
        except Patient.DoesNotExist:
            return Response(
                {'error': 'Patient not found for this code'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not doctor_has_active_consent_for_patient(request.user, patient):
            return Response(
                {'error': 'No active consent to access this patient records'},
                status=status.HTTP_403_FORBIDDEN
            )

        files = File.objects.filter(patient=patient).order_by('-created_at')

        return Response({
            'patient': {
                'id': patient.id,
                'patient_code': patient.patient_code,
                'name': patient.name,
                'email': patient.user.email,
            },
            'results': FileSerializer(files, many=True).data,
        })


class DoctorPatientDocumentSummaryByCodeView(views.APIView):
    """Doctor-only: summarize a patient's uploaded documents by patient code."""
    permission_classes = [IsAuthenticated, IsDoctor]

    def post(self, request):
        patient_code = (request.data.get('patient_code') or '').strip().upper()
        if not patient_code:
            return Response(
                {'error': 'patient_code is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            patient = Patient.objects.get(patient_code=patient_code, user__role='patient')
        except Patient.DoesNotExist:
            return Response(
                {'error': 'Patient not found for this code'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not doctor_has_active_consent_for_patient(request.user, patient):
            return Response(
                {'error': 'No active consent to access this patient records'},
                status=status.HTTP_403_FORBIDDEN
            )

        files = File.objects.filter(patient=patient).order_by('-created_at')
        if not files.exists():
            return Response({
                'patient': {
                    'id': patient.id,
                    'patient_code': patient.patient_code,
                    'name': patient.name,
                },
                'summary': '',
                'key_points': [],
                'entities': {},
                'conditions': [],
                'medications': [],
                'document_count': 0,
            })

        text_parts = []
        for file_obj in files:
            header = f"[{file_obj.created_at.date()}] {file_obj.filename} ({file_obj.kind})"
            body = (file_obj.extracted_text or '').strip()
            if not body:
                body = 'No extracted text available for this document.'
            text_parts.append(f"{header}\n{body}")

        combined_text = '\n\n'.join(text_parts)
        summary_payload = ai_service.summarize_text(combined_text)

        return Response({
            'patient': {
                'id': patient.id,
                'patient_code': patient.patient_code,
                'name': patient.name,
            },
            'document_count': files.count(),
            **summary_payload,
        })

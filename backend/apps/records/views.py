from django.utils.decorators import method_decorator
from django.views.decorators.clickjacking import xframe_options_exempt
"""
Views for medical records management.
"""
import os
from datetime import timedelta
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



from rest_framework_simplejwt.authentication import JWTAuthentication

class QueryParameterJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        token = request.query_params.get('token')
        if token:
            validated_token = self.get_validated_token(token)
            return self.get_user(validated_token), validated_token
        return super().authenticate(request)

@method_decorator(xframe_options_exempt, name='dispatch')
class FileServeView(views.APIView):
    authentication_classes = [QueryParameterJWTAuthentication]
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
        queryset = self.queryset
        if self.request.user.role == 'patient':
            queryset = queryset.filter(patient__user=self.request.user)
        elif self.request.user.role == 'doctor':
            patient_ids = get_patients_with_consent(self.request.user)
            queryset = queryset.filter(patient_id__in=patient_ids)
            patient_id = self.request.query_params.get('patient')
            if patient_id:
                queryset = queryset.filter(patient_id=patient_id)
        
        # Filtering optimizations
        kind = self.request.query_params.get('kind')
        if kind:
            queryset = queryset.filter(kind=kind)
            
        return queryset.order_by('-created_at')

    def list(self, request, *args, **kwargs):
        """Override list to support a custom limit parameter."""
        queryset = self.filter_queryset(self.get_queryset())
        
        limit = request.query_params.get('limit')
        if limit and limit.isdigit():
            queryset = queryset[:int(limit)]
            # If limited, we often want to skip standard pagination to return a clean list
            # or just return the limited results.
            serializer = self.get_serializer(queryset, many=True)
            return Response({'results': serializer.data})

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response({'results': serializer.data})
    
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


class NamedFileWrapper:
    """Wrapper to provide a 'name' attribute for file-like objects without one (or read-only)."""
    def __init__(self, file_obj, name):
        self.file_obj = file_obj
        self.name = name
    def __getattr__(self, name):
        return getattr(self.file_obj, name)
    def seek(self, *args, **kwargs):
        return self.file_obj.seek(*args, **kwargs)
    def read(self, *args, **kwargs):
        return self.file_obj.read(*args, **kwargs)
    def close(self):
        return self.file_obj.close()


class PrescriptionViewSet(viewsets.ModelViewSet):
    """CRUD operations for prescriptions."""
    queryset = Prescription.objects.all()
    serializer_class = PrescriptionSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        """Set doctor automatically and trigger AI reinforcement learning."""
        prescription = None
        if self.request.user.role == 'doctor':
            try:
                doctor = self.request.user.doctor_profile
                prescription = serializer.save(doctor=doctor)
            except Exception:
                prescription = serializer.save()
        else:
            prescription = serializer.save()

        # Reinforcement Learning: Reward the AI for this diagnosis
        if prescription and prescription.doctor and prescription.patient:
            try:
                from apps.ai.services import AIService
                from apps.records.models import SymptomLog
                
                # Find most recent symptoms for this patient (last 7 days)
                recent_symptoms = SymptomLog.objects.filter(
                    patient=prescription.patient,
                    ts__gte=timezone.now() - timedelta(days=7)
                ).order_by('-ts').first()

                if recent_symptoms:
                    # We assume the doctor's prescription notes or status contains the diagnosis
                    # or we can use the 'disease_prediction' if it was recently logged.
                    # For now, we'll use the notes as the diagnosis source
                    diagnosis = prescription.notes or prescription.status
                    if diagnosis and len(diagnosis) > 3:
                        ai_service = AIService()
                        ai_service.reinforce_knowledge(recent_symptoms.text, diagnosis, is_reward=True)
                        print(f"[AI-Reinforcement] Rewarded knowledge for patient {prescription.patient.id}")
            except Exception as e:
                print(f"[AI-Reinforcement] Error during reward: {e}")

    @action(detail=False, methods=['post'], url_path='parse-image', parser_classes=[MultiPartParser, FormParser])
    def parse_image(self, request):
        """Parse prescription image using AI service."""
        user = request.user
        if user.role == 'patient':
            patient = user.patient_profile
        else:
            return Response({"error": "Only patients can parse their records currently"}, status=status.HTTP_403_FORBIDDEN)
            
        file_id = request.data.get('file_id') or request.data.get('fileId')
        file_obj = request.FILES.get('file')
        
        target_file = None
        opened_file = None
        raw_text_override = None
        
        try:
            if file_id and str(file_id) != 'undefined':
                try:
                    db_file = File.objects.get(id=int(file_id), patient=patient)
                except File.DoesNotExist:
                    return Response({"error": f"Medical record with ID {file_id} not found for this patient."}, status=status.HTTP_404_NOT_FOUND)
                
                raw_text_override = (db_file.extracted_text or '').strip() or None

                path = db_file.storage_path
                # Handle path compatibility
                if ':\\' in path or path.startswith('\\\\'):
                    if 'media' in path.lower():
                        relative_part = path.lower().split('media')[-1].lstrip('\\/')
                        path = os.path.join(settings.MEDIA_ROOT, relative_part.replace('\\', '/'))
                    else:
                        path = os.path.join(settings.MEDIA_ROOT, str(db_file.patient_id), db_file.filename)
                
                if not os.path.isabs(path):
                    path = os.path.join(settings.MEDIA_ROOT, path)
                
                if not os.path.exists(path):
                    fallback = os.path.join(settings.MEDIA_ROOT, str(db_file.patient_id), db_file.filename)
                    if os.path.exists(fallback):
                        path = fallback
                    else:
                        return Response({"error": f"File content not found on server disk for record {file_id}."}, status=status.HTTP_404_NOT_FOUND)
                    
                opened_file = open(path, 'rb')
                # Wrap it to avoid read-only 'name' attribute error
                target_file = NamedFileWrapper(opened_file, db_file.filename)
                
            elif file_obj:
                target_file = file_obj
            else:
                return Response({"error": "Please provide a file to upload or select an existing record ID."}, status=status.HTTP_400_BAD_REQUEST)
                
            from apps.ai.services import PrescriptionParser
            auto_save = request.data.get('save', 'false').lower() == 'true' or request.data.get('auto_save', 'false').lower() == 'true'
            results = PrescriptionParser.parse_image(
                target_file,
                patient,
                auto_save=auto_save,
                raw_text_override=raw_text_override,
                clinical_date_override=getattr(db_file, 'clinical_date', None) if file_id else None,
            )
            return Response(results, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"[PrescriptionViewSet] ERROR: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({"error": f"AI Parsing failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            if opened_file:
                opened_file.close()

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

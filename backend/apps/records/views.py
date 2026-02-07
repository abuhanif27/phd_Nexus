"""
Views for medical records management.
"""
import os
from django.conf import settings
from django.http import FileResponse, Http404
from rest_framework import viewsets, views, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from apps.consent.permissions import IsPatient, IsDoctor
from .models import File, LabResult, Prescription, Encounter, SymptomLog
from .serializers import (
    FileSerializer, LabResultSerializer, PrescriptionSerializer,
    EncounterSerializer, SymptomLogSerializer
)
from .utils import sign_file_path, verify_file_signature
from apps.ai.tasks import process_file_task


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
        if is_image or kind in ['lab', 'prescription']:
            process_file_task(file_obj.id)
        
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
                # TODO: Check consent scope
                pass
            
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
            # Allow if user owns the file (patient's user)
            is_owner = file_obj.patient.user_id == request.user.id
            if not is_owner:
                return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
            # Resolve path: stored path, or MEDIA_ROOT/patient_id/filename
            path = file_obj.storage_path
            if not os.path.isfile(path):
                path = os.path.join(settings.MEDIA_ROOT, str(file_obj.patient_id), file_obj.filename)
            if not os.path.isfile(path):
                alt = os.path.join(settings.MEDIA_ROOT, path) if not os.path.isabs(path) else path
                if os.path.isfile(alt):
                    path = alt
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
            # Doctors can see files from patients with consent
            # TODO: Filter by consent
            return self.queryset.order_by('-created_at')
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
            return self.queryset.filter(doctor__user=self.request.user).order_by('-ts')
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
            return self.queryset.filter(doctor__user=self.request.user).order_by('-ts')
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

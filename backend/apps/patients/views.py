"""
Views for patient profiles.
"""
from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from apps.consent.permissions import IsPatient, IsDoctor
from .models import Patient
from .serializers import PatientSerializer


class PatientViewSet(viewsets.ModelViewSet):
    """Patient profile CRUD (self only)."""
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    
    def get_queryset(self):
        # Return patient profile for current user
        return self.queryset.filter(user=self.request.user)
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def create(self, request, *args, **kwargs):
        # Check if patient profile already exists
        existing = Patient.objects.filter(user=request.user).first()
        if existing:
            # Update existing profile instead
            serializer = self.get_serializer(existing, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        
        # Create new profile
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['post'], url_path='upload-photo')
    def upload_photo(self, request):
        """Upload profile photo"""
        patient = Patient.objects.filter(user=request.user).first()
        
        if not patient:
            return Response(
                {'error': 'Patient profile not found. Please create profile first.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if 'profile_photo' not in request.FILES:
            return Response(
                {'error': 'No photo file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        patient.profile_photo = request.FILES['profile_photo']
        patient.save()
        
        serializer = self.get_serializer(patient)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='me')
    def get_my_profile(self, request):
        """Get current user's patient profile"""
        patient = Patient.objects.filter(user=request.user).first()
        
        if not patient:
            return Response(
                {'error': 'Patient profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = self.get_serializer(patient)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='search', permission_classes=[IsAuthenticated, IsDoctor])
    def search_patients(self, request):
        """Search patients by code, name, email, or phone (doctors only)."""
        query = (request.query_params.get('q') or '').strip()
        if not query:
            return Response({'results': []})

        patients = Patient.objects.filter(
            user__role='patient'
        ).filter(
            Q(patient_code__icontains=query) |
            Q(name__icontains=query) |
            Q(user__email__icontains=query) |
            Q(phone__icontains=query)
        ).order_by('name')[:20]

        serializer = self.get_serializer(patients, many=True)
        return Response({'results': serializer.data})

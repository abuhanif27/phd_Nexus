"""
Views for AI/ML services.
"""
from rest_framework import views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.patients.models import Patient
from apps.records.models import SymptomLog
from .serializers import (
    SymptomAnalyzeSerializer, SpecialistPredictSerializer,
    SummaryRequestSerializer, AISummarySerializer
)
from .services import ai_service


class SymptomAnalyzeView(views.APIView):
    """Analyze symptoms using NLP."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = SymptomAnalyzeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        text = serializer.validated_data['text']
        
        # Analyze with AI service
        result = ai_service.analyze_symptoms(text)
        
        # Save symptom log if user is a patient
        if request.user.role == 'patient':
            SymptomLog.objects.create(
                patient=request.user.patient_profile,
                text=text,
                cleaned_text=result['cleaned_text'],
                entities=result['entities']
            )
        
        return Response(result)


class SpecialistPredictView(views.APIView):
    """Predict specialist from symptom text."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = SpecialistPredictSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        text = serializer.validated_data['text']
        
        # Predict specialist
        result = ai_service.predict_specialist(text)
        
        return Response(result)


class PatientSummaryView(views.APIView):
    """Generate extractive summary of patient records."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = SummaryRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        patient_id = serializer.validated_data['patient_id']
        
        try:
            patient = Patient.objects.get(id=patient_id)
            
            # Check access: either own patient or doctor with consent
            if request.user.role == 'patient':
                if patient.user != request.user:
                    return Response(
                        {'error': 'Access denied'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            elif request.user.role == 'doctor':
                # TODO: Check consent scope
                pass
            
            # Generate summary
            result = ai_service.summarize_patient(patient_id)
            
            return Response(result)
        
        except Patient.DoesNotExist:
            return Response(
                {'error': 'Patient not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class BuildIndexView(views.APIView):
    """Build FAISS index for a patient (admin/dev only)."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        patient_id = request.data.get('patient_id')
        
        if not patient_id:
            return Response(
                {'error': 'patient_id required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            ai_service.build_patient_index(patient_id)
            return Response({'message': 'Index built successfully'})
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

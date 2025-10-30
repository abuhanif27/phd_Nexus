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
    SummaryRequestSerializer, TextSummarySerializer, AISummarySerializer
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


class TextSummaryView(views.APIView):
    """Generate summary from arbitrary medical text."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = TextSummarySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        text = serializer.validated_data['text']
        
        # Generate summary
        result = ai_service.summarize_text(text)
        
        return Response(result)


class HealthAnalysisView(views.APIView):
    """Generate comprehensive health analysis for patient."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            # Get patient profile
            if not hasattr(request.user, 'patient_profile'):
                return Response(
                    {'error': 'Patient profile not found. Please complete your profile first.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            patient = request.user.patient_profile
            
            # Get patient's health data
            from apps.records.models import MedicalRecord, Prescription
            from apps.scheduling.models import Appointment
            
            records_count = MedicalRecord.objects.filter(patient=patient).count()
            prescriptions_count = Prescription.objects.filter(patient=patient).count()
            appointments_count = Appointment.objects.filter(patient=patient).count()
            symptoms_count = SymptomLog.objects.filter(patient=patient).count()
            
            # Generate analysis
            analysis = {
                'health_score': 85,  # Default score
                'summary': f"Based on your profile, you have {records_count} medical records, {prescriptions_count} prescriptions, and {appointments_count} appointments on file.",
                'recommendations': [],
                'risk_factors': [],
                'statistics': {
                    'total_records': records_count,
                    'total_prescriptions': prescriptions_count,
                    'total_appointments': appointments_count,
                    'total_symptom_logs': symptoms_count,
                }
            }
            
            # Add recommendations based on data
            if records_count == 0:
                analysis['recommendations'].append({
                    'title': 'Upload Medical Records',
                    'description': 'Start by uploading your medical records to get personalized health insights.',
                    'priority': 'high'
                })
            
            if appointments_count == 0:
                analysis['recommendations'].append({
                    'title': 'Schedule Regular Checkups',
                    'description': 'Regular health checkups are important for preventive care.',
                    'priority': 'medium'
                })
            
            if patient.medical_conditions:
                analysis['risk_factors'].append({
                    'condition': 'Pre-existing Conditions',
                    'description': patient.medical_conditions,
                    'level': 'monitor'
                })
            
            # Add general health tips
            analysis['recommendations'].append({
                'title': 'Stay Hydrated',
                'description': 'Drink at least 8 glasses of water daily for optimal health.',
                'priority': 'low'
            })
            
            analysis['recommendations'].append({
                'title': 'Regular Exercise',
                'description': 'Aim for at least 30 minutes of moderate exercise most days of the week.',
                'priority': 'medium'
            })
            
            return Response(analysis)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to generate analysis: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

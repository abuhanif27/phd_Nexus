from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from .models import Review
from .serializers import ReviewSerializer
from apps.scheduling.models import Appointment
from apps.records.models import File, LabResult


class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        # Determine if verified visit based on appointments or records
        is_verified = False
        user = self.request.user
        doctor_id = self.request.data.get('doctor')
        org_id = self.request.data.get('organization')

        if user.role == 'patient' and hasattr(user, 'patient_profile'):
            patient = user.patient_profile
            if doctor_id:
                is_verified = Appointment.objects.filter(
                    patient=patient,
                    doctor_id=doctor_id,
                    status='done'
                ).exists()
            elif org_id:
                # For service providers, verify if patient has any records (labs/files) from them
                # Since records aren't explicitly linked to orgs yet, we'll check for any records
                # in a production system, we'd have a Provider-Record link.
                is_verified = LabResult.objects.filter(patient=patient).exists() or \
                              File.objects.filter(patient=patient).exists()

        serializer.save(user=user, is_verified_purchase=is_verified)

    def create(self, request, *args, **kwargs):
        user = request.user
        if user.role != 'patient':
            return Response(
                {'error': 'Only patients can leave reviews.'},
                status=status.HTTP_403_FORBIDDEN
            )

        doctor_id = request.data.get('doctor')
        org_id = request.data.get('organization')
        
        # Check eligibility
        if not hasattr(user, 'patient_profile'):
            return Response(
                {'error': 'Complete your patient profile to leave reviews.'},
                status=status.HTTP_403_FORBIDDEN
            )

        patient = user.patient_profile
        eligible = False
        
        if doctor_id:
            eligible = Appointment.objects.filter(
                patient=patient,
                doctor_id=doctor_id,
                status='done'
            ).exists()
            error_msg = 'You can only review doctors you have had a completed appointment with.'
        elif org_id:
            # For providers, we check for any lab results or medical files
            # In a more advanced system, these would be explicitly linked to the organization
            eligible = LabResult.objects.filter(patient=patient).exists() or \
                       File.objects.filter(patient=patient).exists()
            error_msg = 'You can only review service providers after receiving medical services or lab reports.'
        else:
            return Response({'error': 'Doctor or Organization ID required.'}, status=400)

        if not eligible:
            return Response({'error': error_msg}, status=status.HTTP_403_FORBIDDEN)

        return super().create(request, *args, **kwargs)

    def get_queryset(self):
        queryset = Review.objects.all()
        doctor_id = self.request.query_params.get('doctor_id')
        org_id = self.request.query_params.get('organization_id')
        
        if doctor_id:
            queryset = queryset.filter(doctor_id=doctor_id)
        if org_id:
            queryset = queryset.filter(organization_id=org_id)
            
        return queryset

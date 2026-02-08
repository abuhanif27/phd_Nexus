"""
Views for notifications.
"""
from datetime import timedelta
from django.utils import timezone
from rest_framework import generics, views, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from apps.consent.models import Consent
from apps.consent.permissions import IsDoctor, IsPatient
from apps.doctors.models import Doctor
from apps.patients.models import Patient
from apps.users.models import User
from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(generics.ListAPIView):
    """List current user's notifications."""
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by('-ts')


class RequestAccessNotificationView(views.APIView):
    """Doctor requests patient consent via in-app notification."""
    permission_classes = [IsAuthenticated, IsDoctor]

    def post(self, request):
        patient_id = request.data.get('patient_id')
        message = (request.data.get('message') or '').strip()

        if not patient_id or not message:
            return Response(
                {'error': 'patient_id and message are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            patient = Patient.objects.get(id=patient_id, user__role='patient')
        except Patient.DoesNotExist:
            return Response({'error': 'Patient not found'}, status=status.HTTP_404_NOT_FOUND)

        # Get doctor profile
        try:
            doctor = Doctor.objects.get(user=request.user)
        except Doctor.DoesNotExist:
            return Response({'error': 'Doctor profile not found'}, status=status.HTTP_404_NOT_FOUND)

        # Check if a recent request from this doctor to this patient already exists (within last 5 minutes)
        recent_request = Notification.objects.filter(
            user=patient.user,
            channel='in_app',
            status='sent',
            ts__gte=timezone.now() - timedelta(minutes=5)
        ).filter(
            payload__contains={'from_doctor_id': doctor.id, 'type': 'access_request'}
        ).first()

        if recent_request:
            return Response(
                {'error': 'An access request was already sent to this patient recently. Please wait before sending another.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        Notification.objects.create(
            user=patient.user,
            channel='in_app',
            payload={
                'type': 'access_request',
                'message': message,
                'from_doctor_id': doctor.id,
                'from_doctor_user_id': request.user.id,
                'from_doctor_email': request.user.email,
                'patient_id': patient.id,
            },
            status='sent'
        )

        return Response({'message': 'Notification sent'}, status=status.HTTP_201_CREATED)


class AcceptAccessRequestView(views.APIView):
    """Patient accepts a doctor's access request."""
    permission_classes = [IsAuthenticated, IsPatient]

    def post(self, request):
        doctor_id = request.data.get('doctor_id')
        doctor_user_id = request.data.get('doctor_user_id')  # Fallback for old notifications
        duration_hours = request.data.get('duration_hours', 24)

        if not doctor_id and not doctor_user_id:
            return Response(
                {'error': 'doctor_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        doctor = None
        
        # Try multiple strategies to find the doctor
        # 1. Try doctor_id as Doctor.id
        if doctor_id:
            try:
                doctor = Doctor.objects.get(id=doctor_id)
            except Doctor.DoesNotExist:
                pass
        
        # 2. If not found, try doctor_id as user_id (old notifications stored user_id)
        if not doctor and doctor_id:
            try:
                doctor = Doctor.objects.get(user_id=doctor_id)
            except Doctor.DoesNotExist:
                pass
        
        # 3. Try doctor_user_id if provided
        if not doctor and doctor_user_id:
            try:
                doctor = Doctor.objects.get(user_id=doctor_user_id)
            except Doctor.DoesNotExist:
                pass

        if not doctor:
            return Response(
                {'error': 'Doctor not found. Please try again or cancel this request.'},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            patient_profile = request.user.patient_profile
        except User.patient_profile.RelatedObjectDoesNotExist:
            return Response(
                {'error': 'Patient profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Create consent record
        consent = Consent.objects.create(
            patient=patient_profile,
            doctor=doctor,
            scope={'read': ['all'], 'write': []},
            expires_at=timezone.now() + timedelta(hours=duration_hours),
            status='active'
        )

        return Response(
            {'consent_id': consent.id, 'message': 'Access granted'},
            status=status.HTTP_201_CREATED
        )


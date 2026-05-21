"""
Consent management views.
"""
import random
import string
from datetime import timedelta
from django.utils import timezone
from rest_framework import views, generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.users.models import OTPToken
from apps.doctors.models import Doctor
from .models import Consent, AuditLog
from .serializers import ConsentSerializer, GrantConsentSerializer, ClaimConsentSerializer, AuditLogSerializer
from .permissions import IsPatient, IsDoctor, IsAdmin
from .utils import generate_scoped_token


class GrantConsentView(views.APIView):
    """Patient grants consent to a doctor."""
    permission_classes = [IsAuthenticated, IsPatient]
    
    def post(self, request):
        serializer = GrantConsentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        doctor_id = serializer.validated_data['doctor_id']
        scope = serializer.validated_data['scope']
        duration_hours = serializer.validated_data['duration_hours']
        
        try:
            doctor = Doctor.objects.get(id=doctor_id)
        except Doctor.DoesNotExist:
            return Response(
                {'error': 'Doctor not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Create consent
        consent = Consent.objects.create(
            patient=request.user.patient_profile,
            doctor=doctor,
            scope=scope,
            expires_at=timezone.now() + timedelta(hours=duration_hours),
            status='active'
        )
        
        # Generate OTP for doctor to claim
        code = ''.join(random.choices(string.digits, k=6))
        otp = OTPToken.objects.create(
            user=doctor.user,
            code=code,
            purpose='consent',
            metadata={'consent_id': consent.id},
            expires_at=timezone.now() + timedelta(minutes=10)
        )
        
        # In dev, print to console
        print(f"[CONSENT OTP] Code for Dr. {doctor.name}: {code}")
        
        return Response({
            'consent_id': consent.id,
            'otp_last4': code[-4:],
            'message': 'Consent created. Share OTP with doctor.'
        }, status=status.HTTP_201_CREATED)


class ClaimConsentView(views.APIView):
    """Doctor claims consent with OTP and receives scoped token."""
    permission_classes = [IsAuthenticated, IsDoctor]
    
    def post(self, request):
        serializer = ClaimConsentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        code = serializer.validated_data['otp']
        
        try:
            otp = OTPToken.objects.get(
                user=request.user,
                code=code,
                purpose='consent',
                used=False,
                expires_at__gt=timezone.now()
            )
            
            # Mark OTP as used
            otp.used = True
            otp.save()
            
            # Get consent
            consent_id = otp.metadata.get('consent_id')
            consent = Consent.objects.get(id=consent_id, status='active')
            
            # Generate scoped JWT
            hours_remaining = (consent.expires_at - timezone.now()).total_seconds() / 3600
            scoped_token = generate_scoped_token(
                request.user,
                consent.scope,
                ttl_hours=int(hours_remaining)
            )
            
            return Response({
                'scoped_token': scoped_token,
                'consent': ConsentSerializer(consent).data
            })
        
        except OTPToken.DoesNotExist:
            return Response(
                {'error': 'Invalid or expired OTP'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Consent.DoesNotExist:
            return Response(
                {'error': 'Consent not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class RevokeConsentView(views.APIView):
    """Patient revokes a consent."""
    permission_classes = [IsAuthenticated, IsPatient]
    
    def post(self, request, consent_id):
        try:
            consent = Consent.objects.get(
                id=consent_id,
                patient=request.user.patient_profile
            )
            consent.status = 'revoked'
            consent.revoked_at = timezone.now()
            consent.save()
            
            return Response({'message': 'Consent revoked'})
        
        except Consent.DoesNotExist:
            return Response(
                {'error': 'Consent not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class ConsentListView(generics.ListAPIView):
    """List user's consents (patient sees granted, doctor sees received)."""
    serializer_class = ConsentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role == 'patient':
            # Patient sees consents they've granted
            return Consent.objects.filter(patient__user=user).order_by('-created_at')
        elif user.role == 'doctor':
            # Doctor sees consents they've received
            return Consent.objects.filter(doctor__user=user, status='active').order_by('-created_at')
        
        return Consent.objects.none()


class RequestBookingPermissionView(views.APIView):
    """Doctor requests permission to book appointments for a patient."""
    permission_classes = [IsAuthenticated, IsDoctor]
    
    def post(self, request):
        from apps.patients.models import Patient
        from apps.notifications.models import Notification
        
        patient_id = request.data.get('patient_id')
        if not patient_id:
            return Response({'error': 'patient_id is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            patient = Patient.objects.get(id=patient_id)
            doctor = request.user.doctor_profile
        except (Patient.DoesNotExist, Exception):
            return Response({'error': 'Patient or Doctor profile not found'}, status=status.HTTP_404_NOT_FOUND)
            
        # Check for recent identical request (5 minute cooldown)
        recent_request = Notification.objects.filter(
            user=patient.user,
            channel='in_app',
            status='sent',
            ts__gte=timezone.now() - timedelta(minutes=5),
            payload__doctor_id=doctor.id,
            payload__type='booking_permission_request'
        ).first()

        if recent_request:
            return Response(
                {'error': 'A booking permission request was already sent to this patient recently. Please wait before sending another.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        # Create notification for patient
        notification = Notification.objects.create(
            user=patient.user,
            channel='in_app',
            status='sent',
            payload={
                'type': 'booking_permission_request',
                'title': 'Appointment Booking Request',
                'body': f'Dr. {doctor.name} is requesting permission to book appointments on your behalf.',
                'doctor_id': doctor.id,
                'doctor_name': doctor.name,
                'actions': [
                    {'label': 'Approve', 'url': '/api/consent/approve-booking/', 'method': 'POST', 'params': {'doctor_id': doctor.id}},
                    {'label': 'Deny', 'url': '/api/consent/deny-booking/', 'method': 'POST', 'params': {'doctor_id': doctor.id}}
                ]
            }
        )
        
        return Response({
            'message': 'Booking permission request sent to patient.',
            'notification_id': notification.id
        })


class ApproveBookingPermissionView(views.APIView):
    """Patient approves a booking permission request."""
    permission_classes = [IsAuthenticated, IsPatient]
    
    def post(self, request):
        from apps.notifications.models import Notification
        
        doctor_id = request.data.get('doctor_id')
        notification_id = request.data.get('notification_id')
        
        if not doctor_id:
            return Response({'error': 'doctor_id is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            doctor = Doctor.objects.get(id=doctor_id)
            patient = request.user.patient_profile
        except (Doctor.DoesNotExist, Exception):
            return Response({'error': 'Doctor or Patient profile not found'}, status=status.HTTP_404_NOT_FOUND)
            
        # Create or update consent
        consent, created = Consent.objects.update_or_create(
            patient=patient,
            doctor=doctor,
            defaults={
                'scope': {"write": ["appointments", "scheduling"], "read": ["records"]},
                'expires_at': timezone.now() + timedelta(days=365), # Long term permission
                'status': 'active'
            }
        )
        
        # Mark notification as read if provided
        if notification_id:
            Notification.objects.filter(id=notification_id, user=request.user).update(read=True)
            
        return Response({
            'message': f'Permission granted to Dr. {doctor.name}.',
            'consent_id': consent.id
        })


class AuditLogListView(generics.ListAPIView):
    """View audit logs (admin only)."""
    queryset = AuditLog.objects.all().order_by('-ts')
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

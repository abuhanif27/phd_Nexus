"""
Views for notifications.
"""
from rest_framework import generics, views, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from apps.consent.permissions import IsDoctor
from apps.patients.models import Patient
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

        Notification.objects.create(
            user=patient.user,
            channel='in_app',
            payload={
                'type': 'access_request',
                'message': message,
                'from_doctor_id': request.user.id,
                'from_doctor_email': request.user.email,
                'patient_id': patient.id,
            },
            status='sent'
        )

        return Response({'message': 'Notification sent'}, status=status.HTTP_201_CREATED)

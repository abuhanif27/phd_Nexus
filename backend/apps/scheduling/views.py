"""
Views for scheduling appointments.
"""
from datetime import datetime, timedelta, time
from django.db.models import Q
from rest_framework import viewsets, views, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.doctors.models import Doctor
from .models import DoctorAvailability, Appointment
from .serializers import DoctorAvailabilitySerializer, AppointmentSerializer


class DoctorSlotsView(views.APIView):
    """Get available slots for a doctor on a specific date."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, doctor_id):
        try:
            doctor = Doctor.objects.get(id=doctor_id)
        except Doctor.DoesNotExist:
            return Response(
                {'error': 'Doctor not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        date_str = request.query_params.get('date')
        if not date_str:
            return Response(
                {'error': 'Date parameter required (YYYY-MM-DD)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Invalid date format. Use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get day of week (0=Monday, 6=Sunday)
        day_of_week = date.weekday()
        
        # Get doctor availability for this day
        availability = DoctorAvailability.objects.filter(
            doctor=doctor,
            day_of_week=day_of_week
        ).first()
        
        if not availability:
            return Response({
                'date': date_str,
                'slots': []
            })
        
        # Generate time slots (30-minute intervals)
        slots = []
        current_time = datetime.combine(date, availability.start_time)
        end_time = datetime.combine(date, availability.end_time)
        
        while current_time < end_time:
            slot_start = current_time.time()
            slot_end = (current_time + timedelta(minutes=30)).time()
            
            # Check if slot is during break
            in_break = False
            for brk in availability.breaks:
                break_start = datetime.strptime(brk['start'], '%H:%M').time()
                break_end = datetime.strptime(brk['end'], '%H:%M').time()
                if break_start <= slot_start < break_end:
                    in_break = True
                    break
            
            # Check if slot is already booked
            booked = Appointment.objects.filter(
                doctor=doctor,
                date=date,
                start_time=slot_start,
                status='scheduled'
            ).exists()
            
            if not in_break and not booked:
                slots.append({
                    'start_time': slot_start.strftime('%H:%M'),
                    'end_time': slot_end.strftime('%H:%M'),
                    'available': True
                })
            
            current_time += timedelta(minutes=30)
        
        return Response({
            'date': date_str,
            'doctor_id': doctor_id,
            'slots': slots
        })


class AppointmentViewSet(viewsets.ModelViewSet):
    """CRUD operations for appointments."""
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role == 'patient':
            return self.queryset.filter(patient__user=user)
        elif user.role == 'doctor':
            return self.queryset.filter(doctor__user=user)
        
        return self.queryset
    
    def create(self, request, *args, **kwargs):
        from datetime import datetime
        from apps.consent.models import Consent
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Check for conflicts
        doctor = serializer.validated_data['doctor']
        date = serializer.validated_data['date']
        start_time = serializer.validated_data['start_time']
        end_time = serializer.validated_data['end_time']
        grant_consent = serializer.validated_data.pop('grant_consent', False)
        
        conflict = Appointment.objects.filter(
            doctor=doctor,
            date=date,
            start_time=start_time,
            status='scheduled'
        ).exists()
        
        if conflict:
            return Response(
                {'error': 'This slot is already booked'},
                status=status.HTTP_409_CONFLICT
            )
        
        # Create appointment
        appointment = serializer.save()
        
        # Auto-create consent if requested
        if grant_consent and request.user.role == 'patient':
            # Calculate appointment duration for consent expiration (appointment time + 1 hour buffer)
            appointment_dt = datetime.combine(date, end_time)
            expires_at = timezone.make_aware(appointment_dt) + timedelta(hours=1)
            
            # Create consent with full medical record access
            consent = Consent.objects.create(
                patient=appointment.patient,
                doctor=doctor,
                scope={"read": ["labs", "prescriptions", "encounters", "files"]},
                expires_at=expires_at,
                status='active'
            )
            
            # Link consent to appointment
            appointment.consent_granted = True
            appointment.consent = consent
            appointment.save()
        
        return Response(AppointmentSerializer(appointment).data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['patch'])
    def cancel(self, request, pk=None):
        """Cancel an appointment."""
        appointment = self.get_object()
        appointment.status = 'canceled'
        appointment.save()
        
        return Response(AppointmentSerializer(appointment).data)

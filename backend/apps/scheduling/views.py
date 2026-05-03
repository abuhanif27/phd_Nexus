"""
Views for scheduling appointments and doctor availability management.
"""
from datetime import datetime, timedelta, date as date_type
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
        
        # Get doctor availability for this specific date
        availability = DoctorAvailability.objects.filter(
            doctor=doctor,
            date=date
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


# ──────────────────────────────────────────────────────────────────────────────
# Doctor-owned endpoints (mounted under /api/doctors/ to avoid circular imports)
# ──────────────────────────────────────────────────────────────────────────────

class DoctorAvailabilityViewSet(viewsets.ModelViewSet):
    """CRUD for the logged-in doctor's date-specific availability slots."""
    serializer_class = DoctorAvailabilitySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        try:
            doctor = self.request.user.doctor_profile
            qs = DoctorAvailability.objects.filter(doctor=doctor).order_by('date', 'start_time')
            # Optional month/year filtering for calendar navigation
            month = self.request.query_params.get('month')
            year = self.request.query_params.get('year')
            if month and year:
                qs = qs.filter(date__month=int(month), date__year=int(year))
            return qs
        except Exception:
            return DoctorAvailability.objects.none()

    def perform_create(self, serializer):
        doctor = self.request.user.doctor_profile
        serializer.save(doctor=doctor)


class DoctorProfileView(views.APIView):
    """GET/PATCH the current doctor's own profile."""
    permission_classes = [IsAuthenticated]

    def _get_doctor(self, request):
        try:
            return request.user.doctor_profile
        except Exception:
            return None

    def get(self, request):
        from apps.doctors.serializers import DoctorSerializer
        doctor = self._get_doctor(request)
        if not doctor:
            return Response({'error': 'Doctor profile not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(DoctorSerializer(doctor).data)

    def patch(self, request):
        from apps.doctors.serializers import DoctorSerializer
        doctor = self._get_doctor(request)
        if not doctor:
            return Response({'error': 'Doctor profile not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = DoctorSerializer(doctor, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class DoctorDashboardStatsView(views.APIView):
    """Aggregate stats for the doctor dashboard."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            doctor = request.user.doctor_profile
        except Exception:
            return Response({'error': 'Doctor profile not found'}, status=status.HTTP_404_NOT_FOUND)

        today = date_type.today()
        week_end = today + timedelta(days=7)

        return Response({
            'today_appointments': Appointment.objects.filter(
                doctor=doctor, date=today, status='scheduled'
            ).count(),
            'total_patients': Appointment.objects.filter(
                doctor=doctor
            ).values('patient').distinct().count(),
            'upcoming_appointments': Appointment.objects.filter(
                doctor=doctor, date__gte=today, date__lte=week_end, status='scheduled'
            ).count(),
            'completed_today': Appointment.objects.filter(
                doctor=doctor, date=today, status='done'
            ).count(),
        })


class DoctorAppointmentsView(views.APIView):
    """List the logged-in doctor's appointments, filterable by date and status."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            doctor = request.user.doctor_profile
        except Exception:
            return Response({'error': 'Doctor profile not found'}, status=status.HTTP_404_NOT_FOUND)

        queryset = Appointment.objects.filter(doctor=doctor).order_by('date', 'start_time')
        date_filter = request.query_params.get('date')
        status_filter = request.query_params.get('status')
        if date_filter:
            queryset = queryset.filter(date=date_filter)
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        serializer = AppointmentSerializer(queryset, many=True)
        return Response({'results': serializer.data, 'count': queryset.count()})


class DoctorPatientsView(views.APIView):
    """Return distinct patients who have (or had) appointments with the doctor."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.patients.models import Patient
        from apps.patients.serializers import PatientSerializer
        try:
            doctor = request.user.doctor_profile
        except Exception:
            return Response({'error': 'Doctor profile not found'}, status=status.HTTP_404_NOT_FOUND)

        patient_ids = (
            Appointment.objects.filter(doctor=doctor)
            .values_list('patient_id', flat=True)
            .distinct()
        )
        patients = Patient.objects.filter(id__in=patient_ids)
        serializer = PatientSerializer(patients, many=True)
        return Response({'results': serializer.data, 'count': patients.count()})


class DoctorAvailabilityByIdView(views.APIView):
    """Read-only availability for a specific doctor (used by patient booking preview)."""
    permission_classes = [IsAuthenticated]

    def get(self, request, doctor_id):
        try:
            doctor = Doctor.objects.get(id=doctor_id)
        except Doctor.DoesNotExist:
            return Response({'error': 'Doctor not found'}, status=status.HTTP_404_NOT_FOUND)

        qs = DoctorAvailability.objects.filter(doctor=doctor).order_by('date', 'start_time')
        month = request.query_params.get('month')
        year = request.query_params.get('year')
        if month and year:
            qs = qs.filter(date__month=int(month), date__year=int(year))
        return Response(DoctorAvailabilitySerializer(qs, many=True).data)

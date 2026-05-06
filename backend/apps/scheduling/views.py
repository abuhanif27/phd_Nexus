"""
Views for scheduling appointments and doctor availability management.
"""
from datetime import datetime, timedelta, date as date_type
from django.db.models import Q
from django.utils import timezone
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
        availabilities = DoctorAvailability.objects.filter(
            doctor=doctor,
            date=date
        ).order_by('start_time')
        
        if not availabilities.exists():
            return Response({
                'date': date_str,
                'doctor_id': doctor_id,
                'slots': [],
                'available_count': 0,
                'total_capacity': 0,
                'is_fully_booked': False,
            })

        # For today, skip slots whose start time has already passed
        is_today = (date == date_type.today())
        now_time = datetime.now().time() if is_today else None

        slots = []
        
        for availability in availabilities:
            slot_mins = availability.minutes_per_patient
            max_patients = availability.max_patients
            session_start = datetime.combine(date, availability.start_time)
            session_end = session_start + timedelta(minutes=availability.session_duration_minutes)
            
            current = session_start
            patient_count = 0

            while current < session_end and patient_count < max_patients:
                slot_start = current.time()
                slot_end = (current + timedelta(minutes=slot_mins)).time()

                # Skip past slots when booking for today
                if is_today and slot_start <= now_time:
                    current += timedelta(minutes=slot_mins)
                    continue

                # Skip break windows
                in_break = False
                for brk in availability.breaks:
                    brk_start = datetime.strptime(brk['start'], '%H:%M').time()
                    brk_end = datetime.strptime(brk['end'], '%H:%M').time()
                    if brk_start <= slot_start < brk_end:
                        in_break = True
                        break

                if not in_break:
                    booked = Appointment.objects.filter(
                        doctor=doctor,
                        date=date,
                        start_time=slot_start,
                        status='scheduled',
                    ).exists()
                    slots.append({
                        'start_time': slot_start.strftime('%H:%M'),
                        'end_time': slot_end.strftime('%H:%M'),
                        'available': not booked,
                    })
                    patient_count += 1

                current += timedelta(minutes=slot_mins)

        # Sort slots if not strictly ordered
        slots = sorted(slots, key=lambda x: x['start_time'])
        
        available_count = sum(1 for s in slots if s['available'])

        return Response({
            'date': date_str,
            'doctor_id': doctor_id,
            'slots': slots,
            'available_count': available_count,
            'total_capacity': len(slots),
            'is_fully_booked': len(slots) > 0 and available_count == 0,
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
        from apps.patients.models import Patient as PatientModel

        # Auto-resolve patient from the logged-in user so the client never
        # needs to look up or send their own patient ID.
        data = request.data.copy()
        if request.user.role == 'patient':
            try:
                patient_obj = request.user.patient_profile
                data['patient'] = patient_obj.id
            except PatientModel.DoesNotExist:
                return Response(
                    {'error': 'Patient profile not found. Please complete your profile first.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)

        # Check for conflicts
        doctor = serializer.validated_data['doctor']
        patient = serializer.validated_data['patient']
        date = serializer.validated_data['date']
        start_time = serializer.validated_data['start_time']
        end_time = serializer.validated_data['end_time']
        grant_consent = serializer.validated_data.pop('grant_consent', False)
        
        # 1. Doctor already has an overlapping appointment
        doctor_conflict = Appointment.objects.filter(
            doctor=doctor,
            date=date,
            status='scheduled',
            start_time__lt=end_time,
            end_time__gt=start_time
        ).exists()
        
        if doctor_conflict:
            return Response(
                {'error': 'This slot is already booked'},
                status=status.HTTP_409_CONFLICT
            )
            
        # 2. Patient already has an overlapping appointment (with any doctor)
        patient_time_conflict = Appointment.objects.filter(
            patient=patient,
            date=date,
            status='scheduled',
            start_time__lt=end_time,
            end_time__gt=start_time
        ).exists()
        
        if patient_time_conflict:
            return Response(
                {'error': 'You already have an appointment scheduled at this time'},
                status=status.HTTP_409_CONFLICT
            )
            
        # 3. Patient already has a scheduled appointment with this exact doctor (prevent double booking)
        patient_doctor_conflict = Appointment.objects.filter(
            patient=patient,
            doctor=doctor,
            status='scheduled'
        ).exists()
        
        if patient_doctor_conflict:
            return Response(
                {'error': 'You already have an upcoming appointment scheduled with this doctor'},
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
    """CRUD for the logged-in doctor's date-specific availability sessions."""
    serializer_class = DoctorAvailabilitySerializer
    permission_classes = [IsAuthenticated]

    def _get_doctor(self):
        try:
            return self.request.user.doctor_profile
        except Exception:
            return None

    def get_queryset(self):
        doctor = self._get_doctor()
        if not doctor:
            return DoctorAvailability.objects.none()
        qs = DoctorAvailability.objects.filter(doctor=doctor).order_by('date', 'start_time')
        month = self.request.query_params.get('month')
        year = self.request.query_params.get('year')
        if month and year:
            qs = qs.filter(date__month=int(month), date__year=int(year))
        return qs

    def perform_create(self, serializer):
        doctor = self._get_doctor()
        if not doctor:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only doctors can set availability.')
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


class PatientAppointmentsView(views.APIView):
    """List the logged-in patient's appointments, filterable by status."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            patient = request.user.patient_profile
        except Exception:
            return Response({'error': 'Patient profile not found'}, status=status.HTTP_404_NOT_FOUND)

        queryset = Appointment.objects.filter(patient=patient).order_by('date', 'start_time')
        status_filter = request.query_params.get('status')
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

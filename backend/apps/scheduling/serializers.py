"""
Serializers for scheduling.
"""
from datetime import datetime, timedelta
from rest_framework import serializers
from .models import DoctorAvailability, Appointment


class DoctorAvailabilitySerializer(serializers.ModelSerializer):
    # Computed from start_time + session_duration_minutes — never stored
    end_time = serializers.SerializerMethodField()
    # How many scheduled appointments fall inside this session window
    booked_count = serializers.SerializerMethodField()

    class Meta:
        model = DoctorAvailability
        fields = [
            'id', 'doctor',
            'date', 'start_time',
            'session_duration_minutes', 'max_patients', 'minutes_per_patient',
            'breaks',
            'end_time', 'booked_count',
        ]
        read_only_fields = ['id', 'doctor', 'end_time', 'booked_count']

    def get_end_time(self, obj):
        dt = datetime.combine(obj.date, obj.start_time)
        end = dt + timedelta(minutes=obj.session_duration_minutes)
        return end.strftime('%H:%M')

    def get_booked_count(self, obj):
        """Count scheduled appointments inside this session's time window."""
        dt = datetime.combine(obj.date, obj.start_time)
        end = dt + timedelta(minutes=obj.session_duration_minutes)
        return Appointment.objects.filter(
            doctor=obj.doctor,
            date=obj.date,
            start_time__gte=obj.start_time,
            start_time__lt=end.time(),
            status='scheduled',
        ).count()

    def validate(self, data):
        """
        1. Prevent duplicate start times on the same date.
        2. Prevent overlapping sessions — a session cannot start or end
           inside an existing session window on the same date.
        3. Ensure max_patients reflects net time after breaks.
        """
        request = self.context.get('request')
        if not request:
            return data

        try:
            doctor = request.user.doctor_profile
        except Exception:
            raise serializers.ValidationError('Doctor profile not found.')

        date = data.get('date')
        start_time = data.get('start_time')
        session_duration = data.get('session_duration_minutes', 120)
        minutes_per_patient = data.get('minutes_per_patient', 15)
        breaks = data.get('breaks', [])

        # Compute this session's end time
        new_start_dt = datetime.combine(date, start_time)
        new_end_dt = new_start_dt + timedelta(minutes=session_duration)
        new_end = new_end_dt.time()

        # All existing sessions for this doctor+date (exclude self on edit)
        existing_qs = DoctorAvailability.objects.filter(doctor=doctor, date=date)
        if self.instance:
            existing_qs = existing_qs.exclude(pk=self.instance.pk)

        for s in existing_qs:
            s_start = s.start_time
            s_end_dt = datetime.combine(date, s.start_time) + timedelta(minutes=s.session_duration_minutes)
            s_end = s_end_dt.time()
            # Overlap: new session starts before existing ends AND ends after existing starts
            if start_time < s_end and new_end > s_start:
                raise serializers.ValidationError(
                    f'This session overlaps with an existing session '
                    f'({s_start.strftime("%I:%M %p")} – {s_end.strftime("%I:%M %p")}). '
                    f'Sessions cannot overlap.'
                )

        # Recalculate max_patients from net available time (session - breaks)
        break_total = sum(
            max(0, (datetime.strptime(b['end'], '%H:%M') -
                    datetime.strptime(b['start'], '%H:%M')).seconds // 60)
            for b in breaks if 'start' in b and 'end' in b
        )
        net_minutes = session_duration - break_total
        auto_max = max(1, net_minutes // minutes_per_patient)
        # Only override if doctor didn't explicitly set max_patients, or
        # if the stored value is inconsistent with net time
        provided_max = data.get('max_patients', auto_max)
        data['max_patients'] = min(provided_max, auto_max)  # never exceed what's physically possible

        return data


class AppointmentSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source='doctor.name', read_only=True)
    specialty = serializers.CharField(source='doctor.specialty', read_only=True)
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    patient_phone = serializers.CharField(source='patient.phone', read_only=True)
    scheduled_at = serializers.SerializerMethodField()
    grant_consent = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model = Appointment
        fields = ['id', 'doctor', 'doctor_name', 'specialty', 'patient', 'patient_name', 'patient_phone',
                  'date', 'start_time', 'end_time', 'scheduled_at', 'status', 'notes',
                  'consent_granted', 'consent', 'grant_consent', 'created_at']
        read_only_fields = ['id', 'created_at', 'doctor_name', 'specialty', 'scheduled_at',
                            'consent_granted', 'consent', 'patient_name', 'patient_phone']

    def get_scheduled_at(self, obj):
        dt = datetime.combine(obj.date, obj.start_time)
        return dt.isoformat()

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
        """Prevent duplicate slots (same doctor + date + start_time) without a 500."""
        request = self.context.get('request')
        if request and not self.instance:  # only on create
            try:
                doctor = request.user.doctor_profile
            except Exception:
                raise serializers.ValidationError('Doctor profile not found.')
            if DoctorAvailability.objects.filter(
                doctor=doctor,
                date=data.get('date'),
                start_time=data.get('start_time'),
            ).exists():
                raise serializers.ValidationError(
                    {'start_time': 'A session starting at this time already exists for this date.'}
                )
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

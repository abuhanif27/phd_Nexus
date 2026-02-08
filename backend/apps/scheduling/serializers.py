"""
Serializers for scheduling.
"""
from rest_framework import serializers
from .models import DoctorAvailability, Appointment


class DoctorAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorAvailability
        fields = ['id', 'doctor', 'day_of_week', 'start_time', 'end_time', 'breaks']


class AppointmentSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source='doctor.name', read_only=True)
    specialty = serializers.CharField(source='doctor.specialty', read_only=True)
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    patient_phone = serializers.CharField(source='patient.phone', read_only=True)
    scheduled_at = serializers.SerializerMethodField()
    grant_consent = serializers.BooleanField(write_only=True, required=False, default=False)  # Use for creation
    
    class Meta:
        model = Appointment
        fields = ['id', 'doctor', 'doctor_name', 'specialty', 'patient', 'patient_name', 'patient_phone',
              'date', 'start_time', 'end_time', 'scheduled_at', 'status', 'notes',
              'consent_granted', 'consent', 'grant_consent', 'created_at']
        read_only_fields = ['id', 'created_at', 'doctor_name', 'specialty', 'scheduled_at',
                    'consent_granted', 'consent', 'patient_name', 'patient_phone']
    
    def get_scheduled_at(self, obj):
        """Combine date and start_time for frontend compatibility."""
        from datetime import datetime
        dt = datetime.combine(obj.date, obj.start_time)
        return dt.isoformat()

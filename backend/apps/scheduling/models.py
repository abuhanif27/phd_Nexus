"""
Scheduling: doctor availability and appointments.
"""
from django.db import models
from django.utils import timezone
from apps.doctors.models import Doctor
from apps.patients.models import Patient


class DoctorAvailability(models.Model):
    """
    Date-specific working session for a doctor.

    session_duration_minutes : total length of the session (e.g. 120 = 2 h)
    max_patients             : how many patients the doctor will see (capacity cap)
    minutes_per_patient      : booking slot size (e.g. 15 min per patient)
    end_time is computed: start_time + session_duration_minutes
    """
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='availability')
    date = models.DateField()
    start_time = models.TimeField()
    session_duration_minutes = models.IntegerField(default=120)  # total session length
    max_patients = models.IntegerField(default=8)                # capacity cap
    minutes_per_patient = models.IntegerField(default=15)        # slot size per booking
    breaks = models.JSONField(default=list)  # [{start: 'HH:MM', end: 'HH:MM'}]

    class Meta:
        db_table = 'doctor_availability'
        unique_together = ['doctor', 'date', 'start_time']

    @property
    def end_time(self):
        from datetime import datetime, timedelta
        dt = datetime.combine(self.date, self.start_time)
        return (dt + timedelta(minutes=self.session_duration_minutes)).time()

    def __str__(self):
        return (
            f"Dr. {self.doctor.name} – {self.date}: "
            f"{self.start_time} ({self.max_patients} pts @ {self.minutes_per_patient} min)"
        )


class Appointment(models.Model):
    """
    Scheduled appointments between doctors and patients.
    """
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('canceled', 'Canceled'),
        ('done', 'Completed'),
        ('hold', 'Hold'),
    ]
    
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='appointments')
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='appointments')
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='scheduled')
    notes = models.TextField(blank=True)
    consent_granted = models.BooleanField(default=False)  # Track if patient granted record access
    consent = models.ForeignKey('consent.Consent', on_delete=models.SET_NULL, null=True, blank=True, related_name='appointments')  # Link to created consent
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'appointments'
        constraints = [
            models.UniqueConstraint(
                fields=['doctor', 'date', 'start_time'],
                condition=models.Q(status='scheduled'),
                name='unique_scheduled_appointment'
            )
        ]
        indexes = [
            models.Index(fields=['doctor', 'date', 'status']),
            models.Index(fields=['patient', 'date', 'status']),
        ]
    
    def __str__(self):
        return f"Appointment: {self.patient.name} with Dr. {self.doctor.name} on {self.date} at {self.start_time}"

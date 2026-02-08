"""
Scheduling: doctor availability and appointments.
"""
from django.db import models
from django.utils import timezone
from apps.doctors.models import Doctor
from apps.patients.models import Patient


class DoctorAvailability(models.Model):
    """
    Weekly availability schedule for doctors.
    """
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='availability')
    day_of_week = models.IntegerField()  # 0=Monday, 6=Sunday
    start_time = models.TimeField()
    end_time = models.TimeField()
    breaks = models.JSONField(default=list)  # [{start, end}]
    
    class Meta:
        db_table = 'doctor_availability'
        unique_together = ['doctor', 'day_of_week', 'start_time']
    
    def __str__(self):
        return f"Dr. {self.doctor.name} - Day {self.day_of_week}: {self.start_time}-{self.end_time}"


class Appointment(models.Model):
    """
    Scheduled appointments between doctors and patients.
    """
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('canceled', 'Canceled'),
        ('done', 'Completed'),
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
        unique_together = ['doctor', 'date', 'start_time']
        indexes = [
            models.Index(fields=['doctor', 'date', 'status']),
            models.Index(fields=['patient', 'date', 'status']),
        ]
    
    def __str__(self):
        return f"Appointment: {self.patient.name} with Dr. {self.doctor.name} on {self.date} at {self.start_time}"

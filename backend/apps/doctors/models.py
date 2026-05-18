"""
Doctor model and related data.
"""
from django.db import models
from django.conf import settings


class Doctor(models.Model):
    """
    Doctor profile with specialty and credentials.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('suspended', 'Suspended'),
    ]

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='doctor_profile')
    name = models.CharField(max_length=200)
    specialty = models.CharField(max_length=100)
    qualifications = models.TextField(blank=True)
    bio = models.TextField(blank=True)
    location = models.CharField(max_length=200, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    google_place_id = models.CharField(max_length=255, blank=True)
    rating = models.FloatField(default=0.0)
    calendar_connected = models.BooleanField(default=False)
    
    # Verification & Approval
    is_verified = models.BooleanField(default=False)
    verification_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    admin_notes = models.TextField(blank=True, help_text="Notes from admin during approval process")
    verified_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'doctors'
    
    def __str__(self):
        return f"Dr. {self.name} - {self.specialty} ({self.verification_status})"

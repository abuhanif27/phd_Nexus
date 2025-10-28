"""
Doctor model and related data.
"""
from django.db import models
from django.conf import settings


class Doctor(models.Model):
    """
    Doctor profile with specialty and credentials.
    """
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='doctor_profile')
    name = models.CharField(max_length=200)
    specialty = models.CharField(max_length=100)
    qualifications = models.TextField(blank=True)
    bio = models.TextField(blank=True)
    location = models.CharField(max_length=200, blank=True)
    rating = models.FloatField(default=0.0)
    calendar_connected = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'doctors'
    
    def __str__(self):
        return f"Dr. {self.name} - {self.specialty}"

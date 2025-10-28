"""
Patient model and related data.
"""
from django.db import models
from django.conf import settings


class Patient(models.Model):
    """
    Patient profile linked to a user account.
    """
    GENDER_CHOICES = [
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other'),
        ('N', 'Prefer not to say'),
    ]
    
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='patient_profile')
    name = models.CharField(max_length=200)
    dob = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, blank=True)
    blood_group = models.CharField(max_length=5, blank=True)
    emergency_contact = models.JSONField(default=dict, blank=True)  # {name, phone, relation}
    
    class Meta:
        db_table = 'patients'
    
    def __str__(self):
        return self.name

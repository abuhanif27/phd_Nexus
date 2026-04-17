"""
Patient model and related data.
"""
import random
import string
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
    
    BLOOD_GROUP_CHOICES = [
        ('A+', 'A+'),
        ('A-', 'A-'),
        ('B+', 'B+'),
        ('B-', 'B-'),
        ('AB+', 'AB+'),
        ('AB-', 'AB-'),
        ('O+', 'O+'),
        ('O-', 'O-'),
    ]
    
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='patient_profile')
    patient_code = models.CharField(max_length=16, unique=True, db_index=True, editable=False)
    name = models.CharField(max_length=200)
    profile_photo = models.ImageField(upload_to='profile_photos/', null=True, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    dob = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, blank=True)
    blood_group = models.CharField(max_length=5, choices=BLOOD_GROUP_CHOICES, blank=True)
    address = models.TextField(blank=True)
    emergency_contact = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'patients'

    @staticmethod
    def _generate_patient_code() -> str:
        prefix = 'PT-'
        alphabet = string.ascii_uppercase + string.digits
        while True:
            code = prefix + ''.join(random.choices(alphabet, k=8))
            if not Patient.objects.filter(patient_code=code).exists():
                return code

    def save(self, *args, **kwargs):
        if not self.patient_code:
            self.patient_code = self._generate_patient_code()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return self.name


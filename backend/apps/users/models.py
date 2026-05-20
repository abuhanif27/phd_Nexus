"""
User model with role-based access control.
"""
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom User model with email as the primary identifier.
    """
    ROLE_CHOICES = [
        ('patient', 'Patient'),
        ('doctor', 'Doctor'),
        ('provider', 'Hospital Service Provider'),
        ('admin', 'Admin'),
    ]
    
    email = models.EmailField(unique=True, db_index=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='patient')
    
    # Verification & Robustness
    email_verified = models.BooleanField(default=False)
    pending_email = models.EmailField(blank=True, null=True)
    
    # 2FA
    twofa_enabled = models.BooleanField(default=False)
    twofa_secret = models.CharField(max_length=32, blank=True, null=True)
    twofa_method = models.CharField(max_length=10, default='email') # 'email', 'totp', 'sms'
    
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    
    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []
    
    class Meta:
        db_table = 'users'
    
    def __str__(self):
        return f"{self.email} ({self.role})"

    def get_full_name(self):
        if self.role == 'doctor' and hasattr(self, 'doctor_profile'):
            return f"Dr. {self.doctor_profile.name}"
        elif self.role == 'patient' and hasattr(self, 'patient_profile'):
            return self.patient_profile.name
        elif self.role == 'provider' and hasattr(self, 'service_provider_profile'):
            return self.service_provider_profile.organization_name
        return self.email.split('@')[0]


class OTPToken(models.Model):
    """
    Temporary OTP tokens for 2FA and consent flows.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otp_tokens')
    code = models.CharField(max_length=6)
    purpose = models.CharField(max_length=50)  # '2fa', 'consent', etc.
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'otp_tokens'
        indexes = [
            models.Index(fields=['code', 'purpose', 'used']),
        ]
    
    def __str__(self):
        return f"OTP {self.code} for {self.user.email}"


class UserSettings(models.Model):
    """
    User settings including notifications, privacy, and preferences.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='settings')
    
    # Notifications
    email_notifications = models.BooleanField(default=True)
    push_notifications = models.BooleanField(default=True)
    sms_notifications = models.BooleanField(default=False)
    appointment_reminders = models.BooleanField(default=True)
    medication_reminders = models.BooleanField(default=True)
    health_alerts = models.BooleanField(default=True)
    newsletters = models.BooleanField(default=False)

    # Privacy
    profile_visibility = models.CharField(max_length=20, default='private')
    share_data_research = models.BooleanField(default=False)
    allow_ai_analysis = models.BooleanField(default=True)
    data_sync_enabled = models.BooleanField(default=True)

    # Preferences
    theme = models.CharField(max_length=20, default='system')
    language = models.CharField(max_length=20, default='en-US')
    timezone = models.CharField(max_length=50, default='UTC')

    class Meta:
        db_table = 'user_settings'

    def __str__(self):
        return f"Settings for {self.user.email}"

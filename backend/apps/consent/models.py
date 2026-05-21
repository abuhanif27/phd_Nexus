"""
Consent and audit logging models.
"""
from django.db import models
from django.utils import timezone
from apps.patients.models import Patient
from apps.doctors.models import Doctor
from apps.service_providers.models import ServiceProviderOrganization


class Consent(models.Model):
    """
    Scoped patient consent for doctor or service provider access.
    """
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('revoked', 'Revoked'),
        ('expired', 'Expired'),
    ]
    
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='consents')
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='consents', null=True, blank=True)
    service_provider = models.ForeignKey(ServiceProviderOrganization, on_delete=models.CASCADE, related_name='consents', null=True, blank=True)
    scope = models.JSONField(default=dict)  # {"read": ["labs", "prescriptions"], "write": [...]}
    expires_at = models.DateTimeField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(default=timezone.now)
    revoked_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'consents'
        indexes = [
            models.Index(fields=['patient', 'doctor', 'status']),
            models.Index(fields=['patient', 'service_provider', 'status']),
        ]
    
    def __str__(self):
        target = self.doctor if self.doctor else self.service_provider
        return f"Consent: {self.patient} → {target} ({self.status})"


class AuditLog(models.Model):
    """
    Audit trail for all data access and modifications.
    """
    actor_id = models.IntegerField()
    actor_role = models.CharField(max_length=10)
    action = models.CharField(max_length=50)
    resource = models.CharField(max_length=100)
    purpose = models.CharField(max_length=200, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    ts = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'audit_logs'
        indexes = [
            models.Index(fields=['actor_id', 'ts']),
            models.Index(fields=['resource', 'ts']),
        ]
    
    def __str__(self):
        return f"{self.actor_role} {self.actor_id}: {self.action} on {self.resource}"

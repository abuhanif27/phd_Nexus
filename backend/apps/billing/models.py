"""
Billing and invoices (stub implementation).
"""
from django.db import models
from django.utils import timezone
from apps.patients.models import Patient
from apps.doctors.models import Doctor


class Invoice(models.Model):
    """
    Payment invoices (stub for local demo).
    """
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('paid', 'Paid'),
        ('void', 'Void'),
    ]
    
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='invoices')
    doctor = models.ForeignKey(Doctor, on_delete=models.SET_NULL, null=True, blank=True, related_name='invoices')
    amount_cents = models.IntegerField()
    currency = models.CharField(max_length=3, default='USD')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft')
    external_ref = models.CharField(max_length=100, blank=True, null=True)
    ts = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'invoices'
        indexes = [
            models.Index(fields=['patient', 'status']),
        ]
    
    def __str__(self):
        return f"Invoice {self.id}: {self.amount_cents/100} {self.currency} ({self.status})"

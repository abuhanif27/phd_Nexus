from django.db import models
from django.utils import timezone
from apps.patients.models import Patient
from apps.records.models import Prescription

class MedicationReminder(models.Model):
    """
    Individual medication reminder/alarm based on a prescription item.
    """
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='medication_reminders')
    prescription = models.ForeignKey(Prescription, on_delete=models.CASCADE, related_name='reminders', null=True, blank=True)
    
    drug_name = models.CharField(max_length=255)
    dosage = models.CharField(max_length=100, blank=True)
    frequency = models.CharField(max_length=100, blank=True)  # e.g., "Twice daily", "QD", "BD"
    
    start_date = models.DateField(default=timezone.now)
    end_date = models.DateField(help_text="The deadline for this medication")
    
    # Scheduled times for notifications (e.g., ["08:00", "20:00"])
    scheduled_times = models.JSONField(default=list)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'medication_reminders'
        indexes = [
            models.Index(fields=['patient', 'is_active']),
            models.Index(fields=['end_date']),
        ]

    def __str__(self):
        return f"Reminder for {self.drug_name} ({self.patient.name})"

    def save(self, *args, **kwargs):
        # Auto-deactivate if past end_date
        if self.end_date and self.end_date < timezone.now().date():
            self.is_active = False
        super().save(*args, **kwargs)

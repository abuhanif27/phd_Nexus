from django.db import models
from django.utils import timezone
# from apps.service_providers.models import ProviderService, ServiceProviderOrganization
from apps.patients.models import Patient

class ServiceAvailability(models.Model):
    """
    Date-specific availability for a specific service or the entire organization.
    """
    organization = models.ForeignKey('service_providers.ServiceProviderOrganization', on_delete=models.CASCADE, related_name='service_availability')
    service = models.ForeignKey('service_providers.ProviderService', on_delete=models.CASCADE, related_name='availability', null=True, blank=True, help_text="If null, apply to all services of this org")
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    slots_per_session = models.IntegerField(default=10, help_text="Maximum number of bookings for this time window")
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'service_availability'
        unique_together = ['organization', 'service', 'date', 'start_time']

    def __str__(self):
        service_name = self.service.name if self.service else "General"
        return f"{self.organization.organization_name} - {service_name} on {self.date}"

class ServiceBooking(models.Model):
    """
    Patient bookings for specific hospital services.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending Approval'),
        ('confirmed', 'Confirmed'),
        ('completed', 'Completed'),
        ('canceled', 'Canceled'),
        ('no_show', 'No Show'),
    ]

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='service_bookings')
    service = models.ForeignKey('service_providers.ProviderService', on_delete=models.CASCADE, related_name='bookings')
    availability = models.ForeignKey(ServiceAvailability, on_delete=models.SET_NULL, null=True, blank=True, related_name='bookings')
    
    date = models.DateField()
    preferred_time = models.TimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    notes = models.TextField(blank=True)
    
    # Tracking
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'service_bookings'
        ordering = ['-date', '-preferred_time']

    def __str__(self):
        return f"Booking: {self.patient.name} for {self.service.name} at {self.service.organization.organization_name}"

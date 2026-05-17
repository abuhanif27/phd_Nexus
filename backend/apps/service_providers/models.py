from django.conf import settings
from django.db import models


class ServiceProviderOrganization(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('suspended', 'Suspended'),
    ]

    TYPE_CHOICES = [
        ('hospital', 'Hospital'),
        ('diagnostic_center', 'Diagnostic Center'),
        ('clinic', 'Clinic'),
        ('lab', 'Laboratory'),
        ('imaging_center', 'Imaging Center'),
        ('other', 'Other'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='service_provider_profile',
    )
    organization_name = models.CharField(max_length=200)
    legal_name = models.CharField(max_length=200, blank=True)
    organization_type = models.CharField(max_length=30, choices=TYPE_CHOICES, default='diagnostic_center')
    registration_number = models.CharField(max_length=100, blank=True)
    contact_person = models.CharField(max_length=150)
    phone = models.CharField(max_length=30)
    website = models.URLField(blank=True)
    address = models.TextField()
    district = models.CharField(max_length=100)
    logo = models.ImageField(upload_to='service_provider_logos/', blank=True, null=True)
    description = models.TextField(blank=True)

    is_verified = models.BooleanField(default=False)
    verification_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    admin_notes = models.TextField(blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'service_provider_organizations'
        ordering = ['organization_name']

    def __str__(self):
        return f"{self.organization_name} ({self.verification_status})"


class ProviderService(models.Model):
    CATEGORY_CHOICES = [
        ('lab_test', 'Lab Test'),
        ('imaging', 'Imaging'),
        ('health_package', 'Health Package'),
        ('consultation', 'Consultation'),
        ('procedure', 'Procedure'),
        ('other', 'Other'),
    ]

    organization = models.ForeignKey(
        ServiceProviderOrganization,
        on_delete=models.CASCADE,
        related_name='services',
    )
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default='lab_test')
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    discounted_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    turnaround_time = models.CharField(max_length=100, blank=True, help_text='Example: Same day, 24 hours')
    sample_required = models.CharField(max_length=120, blank=True, help_text='Example: Blood, urine, fasting')
    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'provider_services'
        ordering = ['category', 'name']
        indexes = [
            models.Index(fields=['category', 'is_available']),
            models.Index(fields=['price']),
        ]

    def __str__(self):
        return f"{self.name} - {self.organization.organization_name}"

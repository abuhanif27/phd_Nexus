from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from apps.doctors.models import Doctor
from apps.service_providers.models import ServiceProviderOrganization


class Review(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reviews')
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, null=True, blank=True, related_name='reviews')
    organization = models.ForeignKey(ServiceProviderOrganization, on_delete=models.CASCADE, null=True, blank=True, related_name='reviews')
    
    rating = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField(blank=True)
    
    is_verified_purchase = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'reviews'
        ordering = ['-created_at']

    def __str__(self):
        target = self.doctor.name if self.doctor else self.organization.organization_name
        return f"Review by {self.user.email} for {target} - {self.rating} stars"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Update average rating of the target
        if self.doctor:
            self.doctor.rating = self.doctor.reviews.aggregate(models.Avg('rating'))['rating__avg'] or 0.0
            self.doctor.save()
        if self.organization:
            self.organization.rating = self.organization.reviews.aggregate(models.Avg('rating'))['rating__avg'] or 0.0
            self.organization.save()

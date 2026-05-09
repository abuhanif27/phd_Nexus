"""
Notification tracking (email/SMS mock).
"""
from django.db import models
from django.utils import timezone
from django.conf import settings


class Notification(models.Model):
    """
    Notification logs for email and SMS.
    """
    CHANNEL_CHOICES = [
        ('email', 'Email'),
        ('sms', 'SMS'),
        ('in_app', 'In-App'),
    ]
    
    STATUS_CHOICES = [
        ('queued', 'Queued'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    channel = models.CharField(max_length=10, choices=CHANNEL_CHOICES)
    payload = models.JSONField(default=dict)  # {subject, body, to, etc.}
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='queued')
    read = models.BooleanField(default=False)
    error = models.TextField(blank=True)
    ts = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'notifications'
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['user', 'read']),
        ]
    
    def __str__(self):
        return f"{self.channel} to {self.user.email} ({self.status})"

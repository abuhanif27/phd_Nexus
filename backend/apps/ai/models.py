"""
AI/ML models for embeddings and summaries.
"""
import uuid
from django.db import models
from django.utils import timezone
from apps.patients.models import Patient


class EmbeddingMeta(models.Model):
    """
    Metadata for FAISS vectors (actual vectors stored in FAISS index file).
    """
    owner_type = models.CharField(max_length=50)  # 'lab_result', 'prescription', etc.
    owner_id = models.IntegerField()
    vector_dim = models.IntegerField(default=384)  # Dimension of embedding vector
    meta = models.JSONField(default=dict)  # Additional metadata
    ts = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'embeddings_meta'
        indexes = [
            models.Index(fields=['owner_type', 'owner_id']),
        ]
    
    def __str__(self):
        return f"Embedding: {self.owner_type}#{self.owner_id}"


class AISummary(models.Model):
    """
    Generated medical summaries for patients.
    """
    METHOD_CHOICES = [
        ('textrank', 'TextRank Extractive'),
        ('other', 'Other'),
    ]
    
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='ai_summaries')
    source_ids = models.JSONField(default=list)  # IDs of source documents
    text = models.TextField()
    method = models.CharField(max_length=20, choices=METHOD_CHOICES, default='textrank')
    citations = models.JSONField(default=list)  # File/record IDs referenced
    ts = models.DateTimeField(default=timezone.now)
    
    # Persistent storage fields
    title = models.CharField(max_length=200, blank=True)
    is_saved = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'ai_summaries'
        indexes = [
            models.Index(fields=['patient', 'ts']),
            models.Index(fields=['patient', 'is_saved']),
        ]
    
    def __str__(self):
        return f"Summary for {self.patient.name} ({self.method})"


class HealthSummaryShare(models.Model):
    """
    Shareable links for patient health summaries.
    Generates unique UUID tokens to allow public/semi-public access to health summaries.
    """
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='health_summary_shares')
    share_token = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)  # Optional expiration date
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'health_summary_shares'
        indexes = [
            models.Index(fields=['share_token']),
            models.Index(fields=['patient', 'is_active']),
        ]
    
    def __str__(self):
        return f"Share link for {self.patient.name} ({self.share_token})"
    
    def is_expired(self):
        """Check if share link has expired."""
        if self.expires_at is None:
            return False
        return timezone.now() > self.expires_at
    
    def is_valid(self):
        """Check if share link is valid and active."""
        return self.is_active and not self.is_expired()

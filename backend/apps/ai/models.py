"""
AI/ML models for embeddings and summaries.
"""
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
    
    class Meta:
        db_table = 'ai_summaries'
        indexes = [
            models.Index(fields=['patient', 'ts']),
        ]
    
    def __str__(self):
        return f"Summary for {self.patient.name} ({self.method})"

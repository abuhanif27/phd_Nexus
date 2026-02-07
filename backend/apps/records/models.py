"""
Medical records: files, labs, prescriptions, encounters.
"""
from django.db import models
from django.utils import timezone
from apps.patients.models import Patient
from apps.doctors.models import Doctor


class File(models.Model):
    """
    Uploaded medical documents.
    """
    KIND_CHOICES = [
        ('lab', 'Lab Result'),
        ('prescription', 'Prescription'),
        ('encounter', 'Encounter Note'),
        ('other', 'Other'),
    ]
    
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='files')
    kind = models.CharField(max_length=20, choices=KIND_CHOICES, default='other')
    filename = models.CharField(max_length=255)
    storage_path = models.CharField(max_length=500)
    mime = models.CharField(max_length=100)
    size = models.IntegerField()
    created_at = models.DateTimeField(default=timezone.now)
    extracted_text = models.TextField(blank=True, default='')  # OCR text for images, used in health summary
    
    class Meta:
        db_table = 'files'
        indexes = [
            models.Index(fields=['patient', 'kind']),
        ]
    
    def __str__(self):
        return f"{self.filename} ({self.kind})"


class LabResult(models.Model):
    """
    Structured lab test results.
    """
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='lab_results')
    title = models.CharField(max_length=200)
    summary = models.TextField(blank=True)
    data = models.JSONField(default=dict)  # Parsed test values
    file = models.ForeignKey(File, on_delete=models.SET_NULL, null=True, blank=True, related_name='lab_results')
    ts = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'lab_results'
        indexes = [
            models.Index(fields=['patient', 'ts']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.patient.name}"


class Prescription(models.Model):
    """
    Medication prescriptions.
    """
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='prescriptions')
    doctor = models.ForeignKey(Doctor, on_delete=models.SET_NULL, null=True, related_name='prescriptions')
    items = models.JSONField(default=list)  # [{drug, dosage, duration, instructions}]
    notes = models.TextField(blank=True)
    ts = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'prescriptions'
        indexes = [
            models.Index(fields=['patient', 'ts']),
        ]
    
    def __str__(self):
        return f"Prescription for {self.patient.name} by Dr. {self.doctor.name if self.doctor else 'Unknown'}"


class Encounter(models.Model):
    """
    Doctor-patient encounter notes.
    """
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='encounters')
    doctor = models.ForeignKey(Doctor, on_delete=models.SET_NULL, null=True, related_name='encounters')
    notes = models.TextField()
    diagnosis = models.TextField(blank=True)
    plan = models.TextField(blank=True)
    ts = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'encounters'
        indexes = [
            models.Index(fields=['patient', 'ts']),
        ]
    
    def __str__(self):
        return f"Encounter: {self.patient.name} with Dr. {self.doctor.name if self.doctor else 'Unknown'}"


class SymptomLog(models.Model):
    """
    Patient-reported symptoms.
    """
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='symptom_logs')
    text = models.TextField()
    cleaned_text = models.TextField(blank=True)
    entities = models.JSONField(default=list)  # [{text, label, start, end}]
    ts = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'symptom_logs'
        indexes = [
            models.Index(fields=['patient', 'ts']),
        ]
    
    def __str__(self):
        return f"Symptoms: {self.text[:50]}..."

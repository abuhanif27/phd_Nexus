"""
Serializers for medical records.
"""
from rest_framework import serializers
from .models import File, LabResult, Prescription, Encounter, SymptomLog


class FileSerializer(serializers.ModelSerializer):
    file_type = serializers.CharField(source='kind', required=False)
    title = serializers.CharField(source='filename', read_only=True)
    description = serializers.CharField(default='', required=False, write_only=True)
    uploaded_at = serializers.DateTimeField(source='created_at', read_only=True)
    file_size = serializers.IntegerField(source='size', read_only=True)
    
    class Meta:
        model = File
        fields = ['id', 'patient', 'kind', 'file_type', 'title', 'description', 
                  'filename', 'mime', 'size', 'file_size', 'created_at', 'uploaded_at']
        read_only_fields = ['id', 'patient', 'filename', 'mime', 'size', 'created_at']


class LabResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabResult
        fields = ['id', 'patient', 'title', 'summary', 'data', 'file', 'ts']
        read_only_fields = ['id', 'ts']


class PrescriptionSerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Prescription
        fields = ['id', 'patient', 'doctor', 'items', 'notes', 'status', 'ts', 'expires_at', 'is_active']
        read_only_fields = ['id', 'ts', 'is_active']


class EncounterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Encounter
        fields = ['id', 'patient', 'doctor', 'notes', 'diagnosis', 'plan', 'ts']
        read_only_fields = ['id', 'ts']


class SymptomLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SymptomLog
        fields = ['id', 'patient', 'text', 'cleaned_text', 'entities', 'ts']
        read_only_fields = ['id', 'patient', 'cleaned_text', 'entities', 'ts']

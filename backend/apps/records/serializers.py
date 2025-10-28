"""
Serializers for medical records.
"""
from rest_framework import serializers
from .models import File, LabResult, Prescription, Encounter, SymptomLog


class FileSerializer(serializers.ModelSerializer):
    class Meta:
        model = File
        fields = ['id', 'patient', 'kind', 'filename', 'mime', 'size', 'created_at']
        read_only_fields = ['id', 'patient', 'created_at']


class LabResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabResult
        fields = ['id', 'patient', 'title', 'summary', 'data', 'file', 'ts']
        read_only_fields = ['id', 'ts']


class PrescriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prescription
        fields = ['id', 'patient', 'doctor', 'items', 'notes', 'ts']
        read_only_fields = ['id', 'ts']


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

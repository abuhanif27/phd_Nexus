"""
Serializers for AI services.
"""
from rest_framework import serializers
from .models import AISummary


class SymptomAnalyzeSerializer(serializers.Serializer):
    text = serializers.CharField()


class SpecialistPredictSerializer(serializers.Serializer):
    text = serializers.CharField()


class SummaryRequestSerializer(serializers.Serializer):
    patient_id = serializers.IntegerField()


class AISummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = AISummary
        fields = ['id', 'patient', 'source_ids', 'text', 'method', 'citations', 'ts']

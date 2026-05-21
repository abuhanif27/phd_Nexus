"""
Serializers for AI services.
"""
from rest_framework import serializers
from .models import AISummary


class SymptomAnalyzeSerializer(serializers.Serializer):
    text = serializers.CharField()


class SpecialistPredictSerializer(serializers.Serializer):
    text = serializers.CharField()


class SymptomCheckSerializer(serializers.Serializer):
    text = serializers.CharField(required=False, allow_blank=True)
    manual_symptoms = serializers.ListField(child=serializers.CharField(), required=False)


class SummaryRequestSerializer(serializers.Serializer):
    patient_id = serializers.IntegerField()


class TextSummarySerializer(serializers.Serializer):
    """Serializer for arbitrary text summarization."""
    text = serializers.CharField()


class AISummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = AISummary
        fields = ['id', 'patient', 'source_ids', 'text', 'method', 'citations', 'ts']


class HealthSummaryShareSerializer(serializers.Serializer):
    """Serializer for creating and returning share tokens."""
    share_token = serializers.UUIDField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    expires_at = serializers.DateTimeField(required=False, allow_null=True)
    is_active = serializers.BooleanField(read_only=True)


class HealthSummaryFeedbackSerializer(serializers.Serializer):
    """Serializer for health summary feedback (reward/penalty)."""
    is_helpful = serializers.BooleanField()
    summary_id = serializers.IntegerField(required=False, allow_null=True)
    wrong_info = serializers.CharField(required=False, allow_blank=True)
    summary_text = serializers.CharField(required=False, allow_blank=True)

"""
Serializers for consent management.
"""
from rest_framework import serializers
from .models import Consent, AuditLog


class ConsentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Consent
        fields = ['id', 'patient', 'doctor', 'scope', 'expires_at', 'status', 'created_at']
        read_only_fields = ['id', 'created_at', 'status']


class GrantConsentSerializer(serializers.Serializer):
    doctor_id = serializers.IntegerField()
    scope = serializers.JSONField()
    duration_hours = serializers.IntegerField(default=48)


class ClaimConsentSerializer(serializers.Serializer):
    otp = serializers.CharField(max_length=6)


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = ['id', 'actor_id', 'actor_role', 'action', 'resource', 'purpose', 'metadata', 'ts']

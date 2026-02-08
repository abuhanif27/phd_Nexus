"""
Serializers for notifications.
"""
from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'channel', 'payload', 'status', 'error', 'ts']
        read_only_fields = ['id', 'status', 'error', 'ts']

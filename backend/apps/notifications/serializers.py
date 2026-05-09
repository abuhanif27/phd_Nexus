"""
Serializers for notifications.
"""
from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'user', 'channel', 'payload', 'status', 'read', 'error', 'ts']
        read_only_fields = ['id', 'user', 'status', 'read', 'error', 'ts']

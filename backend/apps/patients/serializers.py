"""
Serializers for patients.
"""
from rest_framework import serializers
from .models import Patient


class PatientSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    
    class Meta:
        model = Patient
        fields = ['id', 'email', 'name', 'dob', 'gender', 'blood_group', 'emergency_contact']

"""
Serializers for doctors.
"""
from rest_framework import serializers
from .models import Doctor


class DoctorSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    
    class Meta:
        model = Doctor
        fields = ['id', 'email', 'name', 'specialty', 'qualifications', 'bio', 'location', 'rating']

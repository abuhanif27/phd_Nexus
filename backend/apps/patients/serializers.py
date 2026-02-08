"""
Serializers for patients.
"""
from rest_framework import serializers
from .models import Patient


class PatientSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    profile_photo_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Patient
        fields = [
            'id', 
            'email', 
            'name', 
            'profile_photo',
            'profile_photo_url',
            'phone',
            'dob', 
            'gender', 
            'blood_group', 
            'address',
            'emergency_contact',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'email', 'created_at', 'updated_at', 'profile_photo_url']
    
    def get_profile_photo_url(self, obj):
        if obj.profile_photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_photo.url)
        return None

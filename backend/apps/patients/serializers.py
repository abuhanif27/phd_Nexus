"""
Serializers for patients.
"""
from rest_framework import serializers
from .models import Patient


class PatientSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    profile_photo_url = serializers.SerializerMethodField()
    
    def validate_phone(self, value):
        if not value:
            return value
        import re
        pattern = r'^(?:\+88)?01[3-9]\d{8}$'
        if not re.match(pattern, value):
            raise serializers.ValidationError("Invalid Bangladeshi phone number. Must be 11 digits starting with 01.")
        return value

    def validate_emergency_contact(self, value):
        if not value:
            return value
        import re
        pattern = r'^(?:\+88)?01[3-9]\d{8}$'
        if not re.match(pattern, value):
            raise serializers.ValidationError("Invalid emergency contact number. Must be 11 digits starting with 01.")
        return value

    class Meta:
        model = Patient
        fields = [
            'id', 
            'patient_code',
            'email', 
            'name', 
            'profile_photo',
            'profile_photo_url',
            'phone',
            'dob', 
            'gender', 
            'blood_group', 
            'address',
            'latitude',
            'longitude',
            'google_place_id',
            'emergency_contact',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'patient_code', 'email', 'created_at', 'updated_at', 'profile_photo_url']
    
    def get_profile_photo_url(self, obj):
        if obj.profile_photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_photo.url)
        return None

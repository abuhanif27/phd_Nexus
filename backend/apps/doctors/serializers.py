"""
Serializers for doctors.
"""
from rest_framework import serializers
from .models import Doctor


class DoctorSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='name', read_only=True)  # For frontend compatibility
    license_number = serializers.SerializerMethodField()  # For frontend compatibility
    
    class Meta:
        model = Doctor
        fields = ['id', 'email', 'name', 'user_name', 'specialty', 'qualifications', 
                  'bio', 'location', 'rating', 'license_number', 'is_verified', 'verification_status']
    
    def get_license_number(self, obj):
        """Return qualification as license for frontend compatibility."""
        return obj.qualifications[:50] if obj.qualifications else "N/A"

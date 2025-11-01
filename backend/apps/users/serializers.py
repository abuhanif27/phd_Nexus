"""
Serializers for user authentication and management.
"""
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User, OTPToken


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'phone', 'role', 'twofa_enabled', 'created_at']
        read_only_fields = ['id', 'created_at']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    patient_profile = serializers.DictField(write_only=True, required=False)
    doctor_profile = serializers.DictField(write_only=True, required=False)
    
    class Meta:
        model = User
        fields = ['email', 'phone', 'password', 'password_confirm', 'role', 'patient_profile', 'doctor_profile']
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Passwords don't match"})
        
        # Validate that profile data is provided for the selected role
        role = attrs.get('role', 'patient')
        if role == 'patient' and 'patient_profile' in attrs:
            if not attrs['patient_profile'].get('name'):
                raise serializers.ValidationError({"patient_profile": "Name is required"})
        elif role == 'doctor' and 'doctor_profile' in attrs:
            if not attrs['doctor_profile'].get('name'):
                raise serializers.ValidationError({"doctor_profile": "Name is required"})
        
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        patient_profile_data = validated_data.pop('patient_profile', None)
        doctor_profile_data = validated_data.pop('doctor_profile', None)
        
        # Create user
        user = User.objects.create_user(**validated_data)
        
        # Create profile based on role
        if user.role == 'patient' and patient_profile_data:
            from apps.patients.models import Patient
            Patient.objects.create(user=user, **patient_profile_data)
        elif user.role == 'doctor' and doctor_profile_data:
            from apps.doctors.models import Doctor
            Doctor.objects.create(user=user, **doctor_profile_data)
        
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class TwoFASerializer(serializers.Serializer):
    code = serializers.CharField(max_length=6)

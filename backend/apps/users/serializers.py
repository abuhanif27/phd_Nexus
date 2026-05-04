"""
Serializers for user authentication and management.
"""
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from datetime import datetime
from .models import User, OTPToken
from apps.patients.models import Patient
from apps.doctors.models import Doctor


class UserSerializer(serializers.ModelSerializer):
    # Nested serializers for related profiles
    patient_profile = serializers.SerializerMethodField()
    doctor_profile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'phone',
            'role',
            'twofa_enabled',
            'created_at',
            'patient_profile',
            'doctor_profile',
        ]
        read_only_fields = ['id', 'created_at']

    def get_patient_profile(self, obj):
        try:
            p = obj.patient_profile
            dob_value = p.dob
            # Handle if dob is string or date object
            if isinstance(dob_value, str):
                dob_value = dob_value
            elif dob_value:
                dob_value = dob_value.isoformat()
            
            return {
                'id': p.id,
                'name': p.name,
                'phone': p.phone,
                'dob': dob_value,
                'gender': p.gender,
                'blood_group': p.blood_group,
                'address': p.address,
                'emergency_contact': p.emergency_contact,
            }
        except Patient.DoesNotExist:
            return None

    def get_doctor_profile(self, obj):
        try:
            d = obj.doctor_profile
            return {
                'name': d.name,
                'specialty': d.specialty,
                'qualifications': d.qualifications,
                'bio': d.bio,
                'location': d.location,
                'rating': d.rating,
            }
        except Doctor.DoesNotExist:
            return None


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    patient_profile = serializers.DictField(write_only=True, required=False, allow_empty=True)
    doctor_profile = serializers.DictField(write_only=True, required=False, allow_empty=True)
    
    class Meta:
        model = User
        fields = ['email', 'phone', 'password', 'password_confirm', 'role', 'patient_profile', 'doctor_profile']
    
    def validate(self, attrs):
        # Validate password match
        password = attrs.get('password')
        password_confirm = attrs.get('password_confirm')
        
        if not password or not password_confirm:
            raise serializers.ValidationError("Password and password confirmation are required")
        
        if password != password_confirm:
            raise serializers.ValidationError({"password": "Passwords don't match"})
        
        # Get role and validate profile data
        role = attrs.get('role', 'patient')
        
        if role == 'patient':
            patient_profile = attrs.get('patient_profile', {})
            if not patient_profile or not patient_profile.get('name'):
                raise serializers.ValidationError(
                    {"patient_profile": "Patient profile with name is required"}
                )
        elif role == 'doctor':
            doctor_profile = attrs.get('doctor_profile', {})
            if not doctor_profile or not doctor_profile.get('name'):
                raise serializers.ValidationError(
                    {"doctor_profile": "Doctor profile with name is required"}
                )
            if not doctor_profile.get('specialty'):
                raise serializers.ValidationError(
                    {"doctor_profile": "Doctor specialty is required"}
                )
        
        return attrs
    
    def create(self, validated_data):
        # Remove write-only fields
        validated_data.pop('password_confirm', None)
        patient_profile_data = validated_data.pop('patient_profile', None)
        doctor_profile_data = validated_data.pop('doctor_profile', None)
        
        # Create user
        user = User.objects.create_user(**validated_data)
        
        try:
            # Create profile based on role
            if user.role == 'patient' and patient_profile_data:
                # Clean patient profile data - remove empty/null values
                clean_data = {k: v for k, v in patient_profile_data.items() if v}
                Patient.objects.create(user=user, **clean_data)
            elif user.role == 'doctor' and doctor_profile_data:
                # Clean doctor profile data - remove empty/null values
                clean_data = {k: v for k, v in doctor_profile_data.items() if v}
                Doctor.objects.create(user=user, **clean_data)
        except Exception as e:
            # Clean up user if profile creation fails
            user.delete()
            raise serializers.ValidationError(f"Profile creation failed: {str(e)}")
        
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class TwoFASerializer(serializers.Serializer):
    code = serializers.CharField(max_length=6)

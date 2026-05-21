"""
Serializers for user authentication and management.
"""
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from datetime import datetime
from .models import User, OTPToken
from apps.patients.models import Patient
from apps.doctors.models import Doctor
from apps.service_providers.models import ServiceProviderOrganization


class UserSerializer(serializers.ModelSerializer):
    # Nested serializers for related profiles
    patient_profile = serializers.SerializerMethodField()
    doctor_profile = serializers.SerializerMethodField()
    provider_profile = serializers.SerializerMethodField()

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
            'provider_profile',
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
                'patient_code': p.patient_code,
                'name': p.name,
                'phone': p.phone,
                'dob': dob_value,
                'gender': p.gender,
                'blood_group': p.blood_group,
                'address': p.address,
                'latitude': p.latitude,
                'longitude': p.longitude,
                'google_place_id': p.google_place_id,
                'emergency_contact': p.emergency_contact,
            }
        except Patient.DoesNotExist:
            return None

    def get_doctor_profile(self, obj):
        try:
            d = obj.doctor_profile
            return {
                'id': d.id,
                'name': d.name,
                'specialty': d.specialty,
                'qualifications': d.qualifications,
                'bio': d.bio,
                'location': d.location,
                'latitude': d.latitude,
                'longitude': d.longitude,
                'google_place_id': d.google_place_id,
                'rating': d.rating,
            }
        except Doctor.DoesNotExist:
            return None

    def get_provider_profile(self, obj):
        try:
            p = obj.service_provider_profile
            logo_url = None
            if p.logo:
                request = self.context.get('request')
                logo_url = request.build_absolute_uri(p.logo.url) if request else p.logo.url

            return {
                'id': p.id,
                'organization_name': p.organization_name,
                'legal_name': p.legal_name,
                'organization_type': p.organization_type,
                'registration_number': p.registration_number,
                'contact_person': p.contact_person,
                'phone': p.phone,
                'website': p.website,
                'address': p.address,
                'latitude': p.latitude,
                'longitude': p.longitude,
                'google_place_id': p.google_place_id,
                'district': p.district,
                'logo': logo_url,
                'description': p.description,
                'rating': p.rating,
                'is_verified': p.is_verified,
                'verification_status': p.verification_status,
                'admin_notes': p.admin_notes,
            }
        except ServiceProviderOrganization.DoesNotExist:
            return None


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    patient_profile = serializers.DictField(write_only=True, required=False, allow_empty=True)
    doctor_profile = serializers.DictField(write_only=True, required=False, allow_empty=True)
    provider_profile = serializers.DictField(write_only=True, required=False, allow_empty=True)
    organization_logo = serializers.ImageField(write_only=True, required=False, allow_null=True)
    
    class Meta:
        model = User
        fields = ['email', 'phone', 'password', 'password_confirm', 'role', 'patient_profile', 'doctor_profile', 'provider_profile', 'organization_logo']

    def validate_phone(self, value):
        if not value:
            return value
        import re
        pattern = r'^(?:\+88)?01[3-9]\d{8}$'
        if not re.match(pattern, value):
            raise serializers.ValidationError("Invalid Bangladeshi phone number. Must be 11 digits starting with 01 (e.g., 01712345678)")
        return value

    def _provider_profile_from_attrs(self, attrs):
        provider_profile = attrs.get('provider_profile') or {}
        if provider_profile.get('phone'):
            return provider_profile

        account_phone = attrs.get('phone')
        if account_phone:
            provider_profile = {**provider_profile, 'phone': account_phone}
            attrs['provider_profile'] = provider_profile

        return provider_profile
    
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
            # Validate emergency contact
            emergency_contact = patient_profile.get('emergency_contact')
            if emergency_contact:
                import re
                pattern = r'^(?:\+88)?01[3-9]\d{8}$'
                if not re.match(pattern, emergency_contact):
                    raise serializers.ValidationError(
                        {"patient_profile": {"emergency_contact": "Invalid emergency contact number. Must be 11 digits starting with 01."}}
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
        elif role == 'provider':
            provider_profile = self._provider_profile_from_attrs(attrs)
            required_fields = ['organization_name', 'contact_person', 'phone', 'address', 'district']
            missing_fields = [field for field in required_fields if not provider_profile.get(field)]
            if missing_fields:
                raise serializers.ValidationError(
                    {"provider_profile": f"Missing required organization fields: {', '.join(missing_fields)}"}
                )
            # Validate organization phone
            phone = provider_profile.get('phone')
            if phone:
                import re
                pattern = r'^(?:\+88)?01[3-9]\d{8}$'
                if not re.match(pattern, phone):
                    raise serializers.ValidationError(
                        {"provider_profile": {"phone": "Invalid Bangladeshi phone number. Must be 11 digits starting with 01."}}
                    )
        
        return attrs
    
    def create(self, validated_data):
        # Remove write-only fields
        validated_data.pop('password_confirm', None)
        patient_profile_data = validated_data.pop('patient_profile', None)
        doctor_profile_data = validated_data.pop('doctor_profile', None)
        provider_profile_data = validated_data.pop('provider_profile', None)
        organization_logo = validated_data.pop('organization_logo', None)
        
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
            elif user.role == 'provider' and provider_profile_data:
                clean_data = {k: v for k, v in provider_profile_data.items() if v}
                if organization_logo:
                    clean_data['logo'] = organization_logo
                ServiceProviderOrganization.objects.create(user=user, **clean_data)
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


from .models import UserSettings

class UserSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSettings
        fields = [
            'email_notifications', 'push_notifications', 'sms_notifications',
            'appointment_reminders', 'medication_reminders', 'health_alerts', 'newsletters',
            'profile_visibility', 'share_data_research', 'allow_ai_analysis', 'data_sync_enabled',
            'theme', 'language', 'timezone'
        ]

class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"new_password": "Passwords don't match."})
        return attrs

class ProfileUpdateSerializer(serializers.Serializer):
    phone = serializers.CharField(required=False, allow_blank=True)

    def validate_phone(self, value):
        if not value:
            return value
        import re
        pattern = r'^(?:\+88)?01[3-9]\d{8}$'
        if not re.match(pattern, value):
            raise serializers.ValidationError("Invalid Bangladeshi phone number. Must be 11 digits starting with 01 (e.g., 01712345678)")
        return value

    def validate_emergency_contact(self, value):
        if not value:
            return value
        import re
        pattern = r'^(?:\+88)?01[3-9]\d{8}$'
        if not re.match(pattern, value):
            raise serializers.ValidationError("Invalid emergency contact number. Must be 11 digits starting with 01.")
        return value
    
    # Patient fields
    name = serializers.CharField(required=False)
    dob = serializers.DateField(required=False, allow_null=True)
    blood_group = serializers.CharField(required=False, allow_blank=True)
    emergency_contact = serializers.CharField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    
    # Doctor fields
    specialty = serializers.CharField(required=False, allow_blank=True)
    qualifications = serializers.CharField(required=False, allow_blank=True)
    location = serializers.CharField(required=False, allow_blank=True)

class EmailChangeSerializer(serializers.Serializer):
    new_email = serializers.EmailField()

class VerifyOTPSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=6)

class TOTPVerifySerializer(serializers.Serializer):
    code = serializers.CharField(max_length=6)

class VerifyRegistrationSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)

class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

class PasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"new_password": "Passwords don't match."})
        return attrs

from rest_framework import serializers

from .models import ProviderService, ServiceProviderOrganization, ServiceAvailability, ServiceBooking


class ServiceAvailabilitySerializer(serializers.ModelSerializer):
    booked_count = serializers.SerializerMethodField()

    class Meta:
        model = ServiceAvailability
        fields = '__all__'
        read_only_fields = ['id', 'organization', 'booked_count']
        extra_kwargs = {
            'service': {'required': False, 'allow_null': True}
        }

    def get_booked_count(self, obj):
        """Count active bookings for this availability slot."""
        qs = ServiceBooking.objects.filter(
            date=obj.date,
            service__organization=obj.organization,
            status__in=['pending', 'confirmed'],
        )
        if obj.service:
            qs = qs.filter(service=obj.service)
        return qs.count()


class ServiceBookingSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    service_name = serializers.CharField(source='service.name', read_only=True)
    organization_name = serializers.CharField(source='service.organization.organization_name', read_only=True)
    organization_user_id = serializers.IntegerField(source='service.organization.user_id', read_only=True)

    class Meta:
        model = ServiceBooking
        fields = [
            'id', 'patient', 'patient_name', 'service', 'service_name', 
            'organization_name', 'organization_user_id', 'availability', 'date', 
            'preferred_time', 'status', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {
            'patient': {'required': False, 'allow_null': True}
        }


class ProviderServiceSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.organization_name', read_only=True)
    organization_user_id = serializers.IntegerField(source='organization.user_id', read_only=True)
    district = serializers.CharField(source='organization.district', read_only=True)
    logo = serializers.ImageField(source='organization.logo', read_only=True)
    organization_rating = serializers.FloatField(source='organization.rating', read_only=True)

    class Meta:
        model = ProviderService
        fields = [
            'id',
            'organization',
            'organization_name',
            'organization_user_id',
            'organization_rating',
            'district',
            'logo',
            'name',
            'category',
            'description',
            'price',
            'discounted_price',
            'turnaround_time',
            'sample_required',
            'approval_status',
            'admin_feedback',
            'is_available',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'organization', 'created_at', 'updated_at']


class ServiceProviderOrganizationSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    services = ProviderServiceSerializer(many=True, read_only=True)

    def validate_phone(self, value):
        if not value:
            return value
        import re
        pattern = r'^(?:\+88)?01[3-9]\d{8}$'
        if not re.match(pattern, value):
            raise serializers.ValidationError("Invalid Bangladeshi phone number. Must be 11 digits starting with 01.")
        return value

    class Meta:
        model = ServiceProviderOrganization
        fields = [
            'id',
            'user',
            'email',
            'organization_name',
            'legal_name',            'organization_type',
            'registration_number',
            'contact_person',
            'phone',
            'website',
            'address',
            'latitude',
            'longitude',
            'google_place_id',
            'district',
            'logo',
            'description',
            'rating',
            'is_verified',
            'verification_status',
            'admin_notes',
            'approved_at',
            'created_at',
            'updated_at',
            'services',
        ]
        read_only_fields = [
            'id',
            'email',
            'rating',
            'is_verified',
            'verification_status',
            'admin_notes',
            'approved_at',
            'created_at',
            'updated_at',
            'services',
        ]

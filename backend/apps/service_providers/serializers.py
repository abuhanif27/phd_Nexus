from rest_framework import serializers

from .models import ProviderService, ServiceProviderOrganization


class ProviderServiceSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.organization_name', read_only=True)
    district = serializers.CharField(source='organization.district', read_only=True)
    logo = serializers.ImageField(source='organization.logo', read_only=True)
    organization_rating = serializers.FloatField(source='organization.rating', read_only=True)

    class Meta:
        model = ProviderService
        fields = [
            'id',
            'organization',
            'organization_name',
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
            'is_available',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'organization', 'created_at', 'updated_at']


class ServiceProviderOrganizationSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    services = ProviderServiceSerializer(many=True, read_only=True)

    class Meta:
        model = ServiceProviderOrganization
        fields = [
            'id',
            'email',
            'organization_name',
            'legal_name',
            'organization_type',
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

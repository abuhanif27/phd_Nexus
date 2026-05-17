from django.utils import timezone
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.consent.permissions import IsAdmin

from .models import ProviderService, ServiceProviderOrganization
from .serializers import ProviderServiceSerializer, ServiceProviderOrganizationSerializer


class IsProviderOwner(IsAuthenticated):
    def has_permission(self, request, view):
        return (
            super().has_permission(request, view)
            and request.user.role == 'provider'
            and hasattr(request.user, 'service_provider_profile')
            and request.user.service_provider_profile.verification_status == 'approved'
        )


class ServiceProviderOrganizationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ServiceProviderOrganizationSerializer
    permission_classes = [AllowAny]
    filter_backends = [filters.SearchFilter]
    search_fields = ['organization_name', 'district', 'address', 'services__name']

    def get_queryset(self):
        queryset = ServiceProviderOrganization.objects.filter(
            verification_status='approved',
            is_verified=True,
        ).prefetch_related('services')

        district = self.request.query_params.get('district')
        if district:
            queryset = queryset.filter(district__icontains=district)

        organization_type = self.request.query_params.get('type')
        if organization_type:
            queryset = queryset.filter(organization_type=organization_type)

        return queryset.distinct()

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        if request.user.role != 'provider':
            return Response({'error': 'Only service providers can access this endpoint.'}, status=403)

        try:
            organization = request.user.service_provider_profile
        except ServiceProviderOrganization.DoesNotExist:
            return Response({'error': 'Service provider profile not found.'}, status=404)

        serializer = self.get_serializer(organization)
        return Response(serializer.data)


class ProviderServiceViewSet(viewsets.ModelViewSet):
    serializer_class = ProviderServiceSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description', 'organization__organization_name', 'organization__district']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsProviderOwner()]

    def get_queryset(self):
        if self.request.user.is_authenticated and self.request.user.role == 'provider':
            return ProviderService.objects.filter(
                organization=self.request.user.service_provider_profile,
            ).select_related('organization')

        queryset = ProviderService.objects.filter(
            is_available=True,
            organization__verification_status='approved',
            organization__is_verified=True,
        ).select_related('organization')

        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)

        district = self.request.query_params.get('district')
        if district:
            queryset = queryset.filter(organization__district__icontains=district)

        max_price = self.request.query_params.get('max_price')
        if max_price:
            queryset = queryset.filter(price__lte=max_price)

        return queryset.order_by('price', 'name')

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.service_provider_profile)


class ServiceProviderApprovalView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        organizations = ServiceProviderOrganization.objects.filter(verification_status='pending')
        serializer = ServiceProviderOrganizationSerializer(organizations, many=True)
        return Response(serializer.data)

    def post(self, request, pk):
        try:
            organization = ServiceProviderOrganization.objects.get(pk=pk)
        except ServiceProviderOrganization.DoesNotExist:
            return Response({'error': 'Service provider not found'}, status=status.HTTP_404_NOT_FOUND)

        action_name = request.data.get('action')
        notes = request.data.get('notes', '')

        if action_name == 'approve':
            organization.verification_status = 'approved'
            organization.is_verified = True
            organization.approved_at = timezone.now()
            organization.admin_notes = notes
            organization.save()

            user = organization.user
            user.is_active = True
            user.save()

            return Response({'message': f'{organization.organization_name} approved successfully'})

        if action_name == 'reject':
            organization.verification_status = 'rejected'
            organization.is_verified = False
            organization.admin_notes = notes
            organization.save()
            return Response({'message': f'{organization.organization_name} rejected'})

        return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)

from django.db import models
from django.utils import timezone
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.consent.permissions import IsAdmin

from .models import ProviderService, ServiceProviderOrganization, ServiceAvailability, ServiceBooking
from .serializers import (
    ProviderServiceSerializer, 
    ServiceProviderOrganizationSerializer,
    ServiceAvailabilitySerializer,
    ServiceBookingSerializer
)


class IsProviderOwner(IsAuthenticated):
    def has_permission(self, request, view):
        return (
            super().has_permission(request, view)
            and request.user.role == 'provider'
            and hasattr(request.user, 'service_provider_profile')
            and request.user.service_provider_profile.verification_status == 'approved'
        )


class ServiceAvailabilityViewSet(viewsets.ModelViewSet):
    serializer_class = ServiceAvailabilitySerializer
    permission_classes = [IsProviderOwner]

    def get_queryset(self):
        return ServiceAvailability.objects.filter(
            organization=self.request.user.service_provider_profile
        )

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.service_provider_profile)

    def perform_update(self, serializer):
        if self.request.user.role == 'provider':
            serializer.save(approval_status='pending')
        else:
            serializer.save()


class ServiceBookingViewSet(viewsets.ModelViewSet):
    """
    CRUD for service bookings. Supports both patient-initiated 
    and provider-initiated (with consent) booking.
    """
    serializer_class = ServiceBookingSerializer
    queryset = ServiceBooking.objects.all()

    def get_permissions(self):
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'provider' and hasattr(user, 'service_provider_profile'):
            return self.queryset.filter(service__organization=user.service_provider_profile)
        if user.role == 'patient' and hasattr(user, 'patient_profile'):
            return self.queryset.filter(patient=user.patient_profile)
        return self.queryset.none()

    def create(self, request, *args, **kwargs):
        from apps.consent.models import Consent
        from apps.patients.models import Patient as PatientModel
        
        data = request.data.copy()
        user = request.user
        
        if user.role == 'patient':
            try:
                data['patient'] = user.patient_profile.id
            except PatientModel.DoesNotExist:
                return Response(
                    {'error': 'Patient profile not found.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        elif user.role == 'provider':
            # Providers must provide patient ID
            patient_id = data.get('patient')
            if not patient_id:
                return Response(
                    {'error': 'Patient ID is required for provider-initiated booking.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                patient_obj = PatientModel.objects.get(id=patient_id)
                provider_obj = user.service_provider_profile
                
                # Verify consent
                consent = Consent.objects.filter(
                    patient=patient_obj,
                    service_provider=provider_obj,
                    status='active',
                    expires_at__gt=timezone.now()
                ).first()
                
                if not consent:
                    return Response(
                        {'error': 'No active consent from this patient. Please request booking permission first.'},
                        status=status.HTTP_403_FORBIDDEN
                    )
                
                # Check if scheduling is allowed in scope
                scope = consent.scope or {}
                write_scope = scope.get('write', [])
                if 'scheduling' not in write_scope and 'appointments' not in write_scope and '*' not in write_scope:
                    return Response(
                        {'error': 'Consent does not include scheduling permissions.'},
                        status=status.HTTP_403_FORBIDDEN
                    )
                    
            except PatientModel.DoesNotExist:
                return Response({'error': 'Patient not found.'}, status=status.HTTP_404_NOT_FOUND)
            except ServiceProviderOrganization.DoesNotExist:
                return Response({'error': 'Provider profile not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        
        # Conflict check (Optional: check if patient already booked this service at this time)
        # For now, we allow multiple bookings unless business rules dictate otherwise
        
        booking = serializer.save()
        return Response(self.get_serializer(booking).data, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        # Overridden by create() above, but kept for safety
        pass


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

    @action(detail=False, methods=['get', 'patch'], permission_classes=[IsAuthenticated])
    def me(self, request):
        if request.user.role != 'provider':
            return Response({'error': 'Only service providers can access this endpoint.'}, status=403)

        try:
            organization = request.user.service_provider_profile
        except ServiceProviderOrganization.DoesNotExist:
            return Response({'error': 'Service provider profile not found.'}, status=404)

        if request.method == 'PATCH':
            serializer = self.get_serializer(organization, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)

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
        queryset = ProviderService.objects.all().select_related('organization')

        # Role-based filtering
        user = self.request.user
        user_role = getattr(user, 'role', None)
        is_provider = user.is_authenticated and user_role == 'provider'
        is_patient = user.is_authenticated and user_role == 'patient'
        
        if self.request.query_params.get('mine') == 'true':
            if is_provider and hasattr(user, 'service_provider_profile'):
                queryset = queryset.filter(organization=user.service_provider_profile)
            else:
                return ProviderService.objects.none()
        elif self.request.query_params.get('competitors') == 'true':
            if is_provider and hasattr(user, 'service_provider_profile'):
                queryset = queryset.filter(
                    is_available=True,
                    approval_status='approved',
                    organization__verification_status='approved',
                    organization__is_verified=True
                ).exclude(organization=user.service_provider_profile)
            else:
                return ProviderService.objects.none()
        elif is_patient:
            # Patients see everything that is approved
            queryset = queryset.filter(
                is_available=True,
                approval_status='approved',
                organization__verification_status='approved',
                organization__is_verified=True
            )
        else:
            # Default public view: only approved services from approved organizations
            queryset = queryset.filter(
                is_available=True,
                approval_status='approved',
                organization__verification_status='approved',
                organization__is_verified=True
            )

        # Additional filters
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                models.Q(name__icontains=search) | 
                models.Q(description__icontains=search) |
                models.Q(organization__organization_name__icontains=search)
            )

        approval_status = self.request.query_params.get('approval_status')
        if approval_status:
            queryset = queryset.filter(approval_status=approval_status)

        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)

        district = self.request.query_params.get('district')
        if district:
            queryset = queryset.filter(organization__district__icontains=district)

        max_price = self.request.query_params.get('max_price')
        if max_price:
            queryset = queryset.filter(price__lte=max_price)

        # Location-based sorting
        user_lat = self.request.query_params.get('user_lat')
        user_lng = self.request.query_params.get('user_lng')

        if user_lat and user_lng:
            try:
                from django.db.models import ExpressionWrapper, F, FloatField
                from django.db.models.functions import Cast

                u_lat = float(user_lat)
                u_lng = float(user_lng)

                # Simplified Euclidean distance for SQLite (works well for local search)
                # Distance^2 = (lat1 - lat2)^2 + (lng1 - lng2)^2
                queryset = queryset.annotate(
                    lat_diff=ExpressionWrapper(
                        F('organization__latitude') - u_lat,
                        output_field=FloatField()
                    ),
                    lng_diff=ExpressionWrapper(
                        F('organization__longitude') - u_lng,
                        output_field=FloatField()
                    )
                ).annotate(
                    distance_sq=ExpressionWrapper(
                        F('lat_diff') * F('lat_diff') + F('lng_diff') * F('lng_diff'),
                        output_field=FloatField()
                    )
                ).order_by('distance_sq', 'price')
                return queryset
            except (ValueError, TypeError):
                pass

        return queryset.order_by('price', 'name')

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.service_provider_profile)

    def perform_update(self, serializer):
        if self.request.user.role == 'provider':
            serializer.save(approval_status='pending')
        else:
            serializer.save()


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

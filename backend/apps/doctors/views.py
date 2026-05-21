"""
Views for doctor discovery and profiles.
"""
from rest_framework import viewsets, filters, views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from .models import Doctor
from .serializers import DoctorSerializer
from apps.consent.permissions import IsAdmin


class DoctorViewSet(viewsets.ReadOnlyModelViewSet):
    """
    List and retrieve doctors.
    Supports filtering by specialty and location.
    """
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'specialty', 'location']
    lookup_value_regex = r'\d+'
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by specialty (match variations like Dermatology/Dermatologist)
        specialty = self.request.query_params.get('specialty')
        if specialty:
            root = specialty.rstrip('y').rstrip('ist')
            queryset = queryset.filter(specialty__icontains=root)
        
        # Filter by location
        location = self.request.query_params.get('location')
        if location:
            queryset = queryset.filter(location__icontains=location)
        
        return queryset.order_by('-rating')


class DoctorApprovalView(views.APIView):
    """
    Admin-only view to approve or reject doctor registrations.
    """
    permission_classes = [IsAdmin]

    def get(self, request):
        """List all pending doctor requests."""
        pending_doctors = Doctor.objects.filter(verification_status='pending')
        serializer = DoctorSerializer(pending_doctors, many=True)
        return Response(serializer.data)

    def post(self, request, pk):
        """Approve or reject a doctor."""
        try:
            doctor = Doctor.objects.get(pk=pk)
        except Doctor.DoesNotExist:
            return Response({'error': 'Doctor not found'}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action') # 'approve' or 'reject'
        notes = request.data.get('notes', '')

        if action == 'approve':
            doctor.verification_status = 'approved'
            doctor.is_verified = True
            doctor.verified_at = timezone.now()
            doctor.admin_notes = notes
            doctor.save()
            
            # Activate the user account
            user = doctor.user
            user.is_active = True
            user.save()
            
            return Response({'message': f'Doctor {doctor.name} approved successfully'})
            
        elif action == 'reject':
            doctor.verification_status = 'rejected'
            doctor.admin_notes = notes
            doctor.save()
            
            # Keep user inactive
            return Response({'message': f'Doctor {doctor.name} rejected'})
            
        return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)

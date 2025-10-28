"""
Views for patient profiles.
"""
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from apps.consent.permissions import IsPatient
from .models import Patient
from .serializers import PatientSerializer


class PatientViewSet(viewsets.ModelViewSet):
    """Patient profile CRUD (self only)."""
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    permission_classes = [IsAuthenticated, IsPatient]
    
    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

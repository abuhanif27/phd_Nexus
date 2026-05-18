from rest_framework import viewsets, permissions
from .models import Review
from .serializers import ReviewSerializer


class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def get_queryset(self):
        queryset = Review.objects.all()
        doctor_id = self.request.query_params.get('doctor_id')
        org_id = self.request.query_params.get('organization_id')
        
        if doctor_id:
            queryset = queryset.filter(doctor_id=doctor_id)
        if org_id:
            queryset = queryset.filter(organization_id=org_id)
            
        return queryset

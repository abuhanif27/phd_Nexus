"""
Views for billing (stub implementation).
"""
import hmac
import hashlib
from rest_framework import viewsets, views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.conf import settings
from .models import Invoice
from .serializers import InvoiceSerializer


class InvoiceViewSet(viewsets.ModelViewSet):
    """CRUD operations for invoices."""
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        if self.request.user.role == 'patient':
            return self.queryset.filter(patient__user=self.request.user)
        elif self.request.user.role == 'doctor':
            return self.queryset.filter(doctor__user=self.request.user)
        return self.queryset


class CheckoutView(views.APIView):
    """Create a payment checkout (stub)."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        invoice_id = request.data.get('invoice_id')
        
        try:
            invoice = Invoice.objects.get(id=invoice_id)
            
            # Generate fake payment URL
            fake_payment_url = f"http://localhost:8000/api/billing/mock-payment/{invoice.id}"
            
            return Response({
                'payment_url': fake_payment_url,
                'invoice_id': invoice.id,
                'amount': invoice.amount_cents / 100.0,
                'currency': invoice.currency
            })
        
        except Invoice.DoesNotExist:
            return Response(
                {'error': 'Invoice not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class PaymentWebhookView(views.APIView):
    """Handle payment webhooks (stub)."""
    permission_classes = []  # Public endpoint with signature verification
    
    def post(self, request):
        # In real implementation, verify webhook signature
        invoice_id = request.data.get('invoice_id')
        payment_status = request.data.get('status')
        
        if payment_status == 'paid':
            try:
                invoice = Invoice.objects.get(id=invoice_id)
                invoice.status = 'paid'
                invoice.external_ref = f"mock_payment_{invoice_id}"
                invoice.save()
                
                return Response({'message': 'Payment processed'})
            except Invoice.DoesNotExist:
                return Response(
                    {'error': 'Invoice not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        return Response({'message': 'Webhook received'})

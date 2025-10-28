"""
URL routing for billing.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InvoiceViewSet, CheckoutView, PaymentWebhookView

router = DefaultRouter()
router.register('invoices', InvoiceViewSet, basename='invoice')

urlpatterns = [
    path('payments/checkout/', CheckoutView.as_view(), name='checkout'),
    path('webhooks/payment/', PaymentWebhookView.as_view(), name='payment_webhook'),
    path('', include(router.urls)),
]

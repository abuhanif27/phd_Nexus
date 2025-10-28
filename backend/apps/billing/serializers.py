"""
Serializers for billing.
"""
from rest_framework import serializers
from .models import Invoice


class InvoiceSerializer(serializers.ModelSerializer):
    amount_dollars = serializers.SerializerMethodField()
    
    class Meta:
        model = Invoice
        fields = ['id', 'patient', 'doctor', 'amount_cents', 'amount_dollars', 'currency', 'status', 'external_ref', 'ts']
        read_only_fields = ['id', 'ts']
    
    def get_amount_dollars(self, obj):
        return obj.amount_cents / 100.0

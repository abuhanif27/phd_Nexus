from django.contrib import admin
from .models import Invoice


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('id', 'patient_name', 'amount_display', 'status', 'ts')
    list_filter = ('status', 'currency', 'ts')
    search_fields = ('patient__name', 'external_ref')
    readonly_fields = ('ts',)
    
    def patient_name(self, obj):
        return obj.patient.name
    patient_name.short_description = 'Patient'
    
    def amount_display(self, obj):
        return f"{obj.amount_cents/100:.2f} {obj.currency}"
    amount_display.short_description = 'Amount'

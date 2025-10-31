from django.contrib import admin
from django.utils.html import format_html
from .models import File, LabResult, Prescription, Encounter, SymptomLog


@admin.register(File)
class FileAdmin(admin.ModelAdmin):
    list_display = ('filename', 'patient_name', 'kind_badge', 'size_display', 'created_at')
    list_filter = ('kind', 'created_at')
    search_fields = ('filename', 'patient__name', 'notes')
    readonly_fields = ('created_at', 'size_display')
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('📁 File Information', {
            'fields': ('patient', 'filename', 'kind', 'mime')
        }),
        ('📊 File Details', {
            'fields': ('size', 'size_display', 'notes')
        }),
        ('⏰ Metadata', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    def patient_name(self, obj):
        return obj.patient.name
    patient_name.short_description = 'Patient'
    patient_name.admin_order_field = 'patient__name'
    
    def kind_badge(self, obj):
        colors = {
            'lab': '#3b82f6',
            'prescription': '#10b981',
            'imaging': '#8b5cf6',
            'encounter': '#f59e0b',
            'other': '#6b7280'
        }
        icons = {
            'lab': '🔬',
            'prescription': '💊',
            'imaging': '🩻',
            'encounter': '📋',
            'other': '📄'
        }
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 12px;">{} {}</span>',
            colors.get(obj.kind, '#6b7280'),
            icons.get(obj.kind, ''),
            obj.kind.title()
        )
    kind_badge.short_description = 'Type'
    kind_badge.admin_order_field = 'kind'
    
    def size_display(self, obj):
        if obj.size < 1024:
            return f"{obj.size} B"
        elif obj.size < 1024 * 1024:
            return f"{obj.size / 1024:.2f} KB"
        else:
            return f"{obj.size / (1024 * 1024):.2f} MB"
    size_display.short_description = 'File Size'


@admin.register(LabResult)
class LabResultAdmin(admin.ModelAdmin):
    list_display = ['id', 'patient', 'title', 'ts', 'file']
    list_filter = ['ts']
    search_fields = ['patient__name', 'title', 'summary']
    readonly_fields = ['ts']
    
    fieldsets = [
        ('� Lab Information', {
            'fields': ['patient', 'title', 'summary']
        }),
        ('� Data', {
            'fields': ['data', 'file', 'ts']
        }),
    ]


@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = ['id', 'patient', 'doctor', 'items_preview', 'ts']
    list_filter = ['ts']
    search_fields = ['patient__name', 'doctor__name', 'notes']
    readonly_fields = ['ts']
    
    fieldsets = [
        ('� Prescription Information', {
            'fields': ['patient', 'doctor']
        }),
        ('� Details', {
            'fields': ['items', 'notes', 'ts']
        }),
    ]
    
    @admin.display(description='💊 Items')
    def items_preview(self, obj):
        if not obj.items:
            return '—'
        items_html = '<ul style="margin: 0; padding-left: 20px;">'
        for item in obj.items[:3]:  # Show first 3 items
            drug = item.get('drug', 'Unknown')
            dosage = item.get('dosage', '')
            items_html += f'<li><strong>{drug}</strong> - {dosage}</li>'
        if len(obj.items) > 3:
            items_html += f'<li><em>...and {len(obj.items) - 3} more</em></li>'
        items_html += '</ul>'
        return format_html(items_html)


@admin.register(Encounter)
class EncounterAdmin(admin.ModelAdmin):
    list_display = ['id', 'patient', 'doctor', 'ts', 'has_diagnosis']
    list_filter = ['ts']
    search_fields = ['patient__name', 'doctor__name', 'notes', 'diagnosis']
    readonly_fields = ['ts']
    
    fieldsets = [
        ('� Participants', {
            'fields': ['patient', 'doctor']
        }),
        ('📋 Clinical Notes', {
            'fields': ['notes', 'diagnosis', 'plan', 'ts']
        }),
    ]
    
    @admin.display(description='💡 Diagnosis', boolean=True)
    def has_diagnosis(self, obj):
        return bool(obj.diagnosis)


@admin.register(SymptomLog)
class SymptomLogAdmin(admin.ModelAdmin):
    list_display = ['id', 'patient', 'text_preview', 'has_entities', 'ts']
    list_filter = ['ts']
    search_fields = ['patient__name', 'text', 'cleaned_text']
    readonly_fields = ['cleaned_text', 'entities', 'ts']
    
    fieldsets = [
        ('👤 Patient', {
            'fields': ['patient']
        }),
        ('📝 Symptom Details', {
            'fields': ['text', 'cleaned_text', 'entities', 'ts']
        }),
    ]
    
    @admin.display(description='📝 Symptoms')
    def text_preview(self, obj):
        preview = obj.text[:60] + '...' if len(obj.text) > 60 else obj.text
        return format_html('<span style="font-style: italic;">{}</span>', preview)
    
    @admin.display(description='🏷️ Entities', boolean=True)
    def has_entities(self, obj):
        return bool(obj.entities)


from django.contrib import admin
from django.utils.html import format_html
from .models import Patient


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ('name', 'user_email', 'phone', 'blood_group', 'gender', 'age', 'has_photo', 'created_at')
    list_filter = ('gender', 'blood_group', 'created_at')
    search_fields = ('name', 'user__email', 'phone', 'address', 'medical_conditions')
    readonly_fields = ('created_at', 'updated_at', 'photo_preview')
    
    fieldsets = (
        ('👤 Personal Information', {
            'fields': ('user', 'name', 'dob', 'gender', 'phone')
        }),
        ('🩺 Medical Information', {
            'fields': ('blood_group', 'medical_conditions')
        }),
        ('📍 Contact Information', {
            'fields': ('address',)
        }),
        ('📸 Profile Photo', {
            'fields': ('profile_photo', 'photo_preview')
        }),
        ('📅 Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'Email'
    user_email.admin_order_field = 'user__email'
    
    def age(self, obj):
        if obj.dob:
            from django.utils import timezone
            today = timezone.now().date()
            age = today.year - obj.dob.year - ((today.month, today.day) < (obj.dob.month, obj.dob.day))
            return f"{age} years"
        return "-"
    age.short_description = 'Age'
    
    def has_photo(self, obj):
        if obj.profile_photo:
            return format_html('<span style="color: green;">✓</span>')
        return format_html('<span style="color: gray;">✗</span>')
    has_photo.short_description = 'Photo'
    
    def photo_preview(self, obj):
        if obj.profile_photo:
            return format_html(
                '<img src="{}" style="max-width: 200px; max-height: 200px; border-radius: 8px;" />',
                obj.profile_photo.url
            )
        return "No photo uploaded"
    photo_preview.short_description = 'Photo Preview'


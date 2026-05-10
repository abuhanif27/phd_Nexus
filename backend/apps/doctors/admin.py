from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from .models import Doctor


@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    list_display = ('name', 'specialty', 'verification_status', 'is_verified', 'location', 'rating_display', 'user_email')
    list_filter = ('verification_status', 'is_verified', 'specialty', 'location')
    search_fields = ('name', 'user__email', 'specialty', 'location', 'qualifications')
    readonly_fields = ('user_email', 'user_phone', 'verified_at')
    
    fieldsets = (
        ('👨‍⚕️ Doctor Information', {
            'fields': ('user', 'name', 'specialty', 'qualifications')
        }),
        ('🛡️ Verification & Approval', {
            'fields': ('verification_status', 'is_verified', 'verified_at', 'admin_notes')
        }),
        ('📍 Location & Contact', {
            'fields': ('location', 'user_email', 'user_phone')
        }),
        ('⭐ Rating & Profile', {
            'fields': ('rating', 'bio', 'calendar_connected')
        }),
    )
    
    actions = ['approve_doctors', 'reject_doctors']

    def approve_doctors(self, request, queryset):
        for doctor in queryset:
            doctor.verification_status = 'approved'
            doctor.is_verified = True
            doctor.verified_at = timezone.now()
            doctor.save()
            
            # Activate user
            user = doctor.user
            user.is_active = True
            user.save()
            
        self.message_user(request, f"{queryset.count()} doctors have been approved and activated.")
    approve_doctors.short_description = "Approve selected doctors"

    def reject_doctors(self, request, queryset):
        queryset.update(verification_status='rejected', is_verified=False)
        self.message_user(request, f"{queryset.count()} doctors have been rejected.")
    reject_doctors.short_description = "Reject selected doctors"

    def user_email(self, obj):
        return obj.user.email if obj.user else '-'
    user_email.short_description = 'Email'
    
    def user_phone(self, obj):
        return obj.user.phone if obj.user else '-'
    user_phone.short_description = 'Phone'
    
    def rating_display(self, obj):
        stars = '⭐' * int(obj.rating)
        return format_html(
            '<span style="color: #f59e0b;" title="{}/5">{}</span>',
            obj.rating, stars
        )
    rating_display.short_description = 'Rating'
    rating_display.admin_order_field = 'rating'


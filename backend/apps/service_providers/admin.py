from django.contrib import admin
from django.utils import timezone
from django.utils.html import format_html

from .models import ProviderService, ServiceProviderOrganization


class ProviderServiceInline(admin.TabularInline):
    model = ProviderService
    extra = 0
    fields = ('name', 'category', 'price', 'discounted_price', 'turnaround_time', 'is_available')


@admin.register(ServiceProviderOrganization)
class ServiceProviderOrganizationAdmin(admin.ModelAdmin):
    list_display = (
        'organization_name',
        'organization_type',
        'district',
        'verification_status',
        'is_verified',
        'phone',
        'user_email',
        'logo_preview',
    )
    list_filter = ('verification_status', 'is_verified', 'organization_type', 'district')
    search_fields = (
        'organization_name',
        'legal_name',
        'registration_number',
        'contact_person',
        'phone',
        'user__email',
        'district',
    )
    readonly_fields = ('user_email', 'approved_at', 'created_at', 'updated_at', 'logo_preview')
    actions = ['approve_organizations', 'reject_organizations']
    inlines = [ProviderServiceInline]

    fieldsets = (
        ('Organization Information', {
            'fields': (
                'user',
                'organization_name',
                'legal_name',
                'organization_type',
                'registration_number',
                'logo',
                'logo_preview',
                'description',
            )
        }),
        ('Contact & Location', {
            'fields': ('contact_person', 'phone', 'user_email', 'website', 'address', 'district')
        }),
        ('Verification & Approval', {
            'fields': ('verification_status', 'is_verified', 'approved_at', 'admin_notes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )

    def approve_organizations(self, request, queryset):
        for organization in queryset:
            organization.verification_status = 'approved'
            organization.is_verified = True
            organization.approved_at = timezone.now()
            organization.save()
            organization.user.is_active = True
            organization.user.save()
        self.message_user(request, f"{queryset.count()} service provider organizations approved.")
    approve_organizations.short_description = 'Approve selected service providers'

    def reject_organizations(self, request, queryset):
        queryset.update(verification_status='rejected', is_verified=False)
        self.message_user(request, f"{queryset.count()} service provider organizations rejected.")
    reject_organizations.short_description = 'Reject selected service providers'

    def user_email(self, obj):
        return obj.user.email if obj.user else '-'
    user_email.short_description = 'Email'

    def logo_preview(self, obj):
        if not obj.logo:
            return '-'
        return format_html('<img src="{}" style="height:48px;width:48px;object-fit:contain;" />', obj.logo.url)
    logo_preview.short_description = 'Logo'


@admin.register(ProviderService)
class ProviderServiceAdmin(admin.ModelAdmin):
    list_display = ('name', 'organization', 'category', 'price', 'discounted_price', 'is_available')
    list_filter = ('category', 'is_available', 'organization__district')
    search_fields = ('name', 'description', 'organization__organization_name')
    list_select_related = ('organization',)


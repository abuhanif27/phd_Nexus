from django.contrib import admin
from django.utils.html import format_html
from .models import Consent, AuditLog


@admin.register(Consent)
class ConsentAdmin(admin.ModelAdmin):
    list_display = ['id', 'patient', 'doctor', 'scope_preview', 'status_badge', 'expires_at', 'created_at']
    list_filter = ['status', 'created_at', 'expires_at']
    search_fields = ['patient__name', 'doctor__name']
    readonly_fields = ['created_at', 'revoked_at']
    
    fieldsets = [
        ('� Consent Information', {
            'fields': ['patient', 'doctor', 'scope', 'status']
        }),
        ('⏰ Timing', {
            'fields': ['expires_at', 'created_at', 'revoked_at']
        }),
    ]
    
    @admin.display(description='📋 Scope')
    def scope_preview(self, obj):
        read_items = obj.scope.get('read', [])
        write_items = obj.scope.get('write', [])
        return format_html(
            '<span style="color: #3498db;">📖 Read: {}</span><br><span style="color: #e67e22;">✏️ Write: {}</span>',
            ', '.join(read_items) if read_items else 'None',
            ', '.join(write_items) if write_items else 'None'
        )
    
    @admin.display(description='Status')
    def status_badge(self, obj):
        colors = {
            'active': '#27ae60',
            'revoked': '#e74c3c',
            'expired': '#95a5a6',
        }
        color = colors.get(obj.status, '#95a5a6')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px; font-weight: bold;">{}</span>',
            color, obj.status.upper()
        )


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['id', 'actor_display', 'action_badge', 'resource', 'purpose', 'ts']
    list_filter = ['actor_role', 'action', 'ts']
    search_fields = ['actor_id', 'resource', 'purpose']
    readonly_fields = ['actor_id', 'actor_role', 'action', 'resource', 'purpose', 'metadata', 'ts']
    date_hierarchy = 'ts'
    
    fieldsets = [
        ('📝 Audit Entry', {
            'fields': ['actor_id', 'actor_role', 'action', 'resource', 'purpose']
        }),
        ('📊 Details', {
            'fields': ['metadata', 'ts']
        }),
    ]
    
    @admin.display(description='👤 Actor')
    def actor_display(self, obj):
        return f"{obj.actor_role.upper()} #{obj.actor_id}"
    
    @admin.display(description='🎯 Action')
    def action_badge(self, obj):
        colors = {
            'read': '#3498db',
            'write': '#e67e22',
            'delete': '#e74c3c',
            'create': '#27ae60',
        }
        color = colors.get(obj.action.lower(), '#95a5a6')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px; font-weight: bold;">{}</span>',
            color, obj.action.upper()
        )
    
    def has_add_permission(self, request):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False



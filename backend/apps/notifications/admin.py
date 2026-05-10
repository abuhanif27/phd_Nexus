from django.contrib import admin
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('channel', 'user_email', 'status', 'read', 'ts')
    list_filter = ('channel', 'status', 'read', 'ts')
    search_fields = ('user__email', 'payload')
    readonly_fields = ('ts',)
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User'

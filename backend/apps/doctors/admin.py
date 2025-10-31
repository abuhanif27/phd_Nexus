from django.contrib import admin
from django.utils.html import format_html
from .models import Doctor


@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    list_display = ('name', 'specialty', 'location', 'rating_display', 'user_email', 'user_phone')
    list_filter = ('specialty', 'location')
    search_fields = ('name', 'user__email', 'specialty', 'location', 'qualification')
    readonly_fields = ('user_email', 'user_phone')
    
    fieldsets = (
        ('👨‍⚕️ Doctor Information', {
            'fields': ('user', 'name', 'specialty', 'qualification')
        }),
        ('📍 Location & Contact', {
            'fields': ('location', 'user_email', 'user_phone')
        }),
        ('⭐ Rating & Profile', {
            'fields': ('rating', 'bio')
        }),
    )
    
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


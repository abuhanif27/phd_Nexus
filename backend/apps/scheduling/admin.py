from django.contrib import admin
from django.utils.html import format_html
from .models import DoctorAvailability, Appointment


@admin.register(DoctorAvailability)
class DoctorAvailabilityAdmin(admin.ModelAdmin):
    list_display = ['id', 'doctor', 'date', 'session_info', 'booked_display', 'has_breaks']
    list_filter = ['date']
    search_fields = ['doctor__name']
    date_hierarchy = 'date'

    fieldsets = [
        ('👨‍⚕️ Doctor', {'fields': ['doctor']}),
        ('📅 Session', {'fields': ['date', 'start_time', 'session_duration_minutes']}),
        ('👥 Capacity', {'fields': ['max_patients', 'minutes_per_patient']}),
        ('☕ Breaks', {'fields': ['breaks']}),
    ]

    @admin.display(description='⏰ Session')
    def session_info(self, obj):
        return f"{obj.start_time.strftime('%H:%M')} – {obj.end_time.strftime('%H:%M')} ({obj.session_duration_minutes} min)"

    @admin.display(description='👥 Capacity')
    def booked_display(self, obj):
        return f"{obj.max_patients} pts @ {obj.minutes_per_patient} min each"

    @admin.display(description='☕ Breaks', boolean=True)
    def has_breaks(self, obj):
        return bool(obj.breaks)


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ['id', 'patient', 'doctor', 'date', 'time_slot', 'status_badge', 'created_at']
    list_filter = ['status', 'date', 'created_at']
    search_fields = ['patient__name', 'doctor__name', 'notes']
    readonly_fields = ['created_at']
    date_hierarchy = 'date'
    
    fieldsets = [
        ('👥 Participants', {
            'fields': ['doctor', 'patient']
        }),
        ('📅 Schedule', {
            'fields': ['date', 'start_time', 'end_time', 'status']
        }),
        ('📝 Notes', {
            'fields': ['notes', 'created_at']
        }),
    ]
    
    @admin.display(description='⏰ Time Slot')
    def time_slot(self, obj):
        return f"{obj.start_time.strftime('%H:%M')} - {obj.end_time.strftime('%H:%M')}"
    
    @admin.display(description='📌 Status')
    def status_badge(self, obj):
        colors = {
            'scheduled': '#3498db',
            'canceled': '#e74c3c',
            'done': '#27ae60',
        }
        icons = {
            'scheduled': '📅',
            'canceled': '❌',
            'done': '✅',
        }
        color = colors.get(obj.status, '#95a5a6')
        icon = icons.get(obj.status, '📌')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px; font-weight: bold;">{} {}</span>',
            color, icon, obj.status.upper()
        )
    
    actions = ['mark_as_done', 'mark_as_canceled']
    
    @admin.action(description='✅ Mark selected as Done')
    def mark_as_done(self, request, queryset):
        updated = queryset.update(status='done')
        self.message_user(request, f'{updated} appointment(s) marked as done.')
    
    @admin.action(description='❌ Mark selected as Canceled')
    def mark_as_canceled(self, request, queryset):
        updated = queryset.update(status='canceled')
        self.message_user(request, f'{updated} appointment(s) marked as canceled.')



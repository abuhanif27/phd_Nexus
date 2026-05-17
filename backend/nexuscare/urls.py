"""
URL Configuration for NexusCare project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

# Customize Django Admin
admin.site.site_header = "PhD NexusCare Administration"
admin.site.site_title = "PhD NexusCare Admin Portal"
admin.site.index_title = "Welcome to PhD NexusCare Healthcare Platform"

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.users.urls')),
    path('api/consent/', include('apps.consent.urls')),
    path('api/patients/', include('apps.patients.urls')),
    path('api/doctors/', include('apps.doctors.urls')),
    path('api/service-providers/', include('apps.service_providers.urls')),
    path('api/records/', include('apps.records.urls')),
    path('api/scheduling/', include('apps.scheduling.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/', include('apps.ai.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

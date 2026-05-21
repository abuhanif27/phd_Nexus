"""
URL Configuration for NexusCare project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.views.decorators.cache import cache_page


def api_root(request):
    """Landing page for the API — shows available endpoints and status."""
    return JsonResponse({
        "name": "PhD NexusCare API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "admin": "/admin/",
            "auth": "/api/auth/",
            "patients": "/api/patients/",
            "doctors": "/api/doctors/",
            "records": "/api/records/",
            "scheduling": "/api/scheduling/",
            "ai": "/api/ai/",
            "chat": "/api/chat/",
            "notifications": "/api/notifications/",
            "reviews": "/api/reviews/",
            "health": "/api/health/",
        },
        "docs": "https://github.com/your-repo/phd_Nexus",
    })


def health_check(request):
    """Health check endpoint for monitoring and Heroku."""
    from django.db import connection
    try:
        connection.ensure_connection()
        db_ok = True
    except Exception:
        db_ok = False

    return JsonResponse({
        "status": "healthy" if db_ok else "degraded",
        "database": "connected" if db_ok else "disconnected",
    }, status=200 if db_ok else 503)


# Customize Django Admin
admin.site.site_header = "PhD NexusCare Administration"
admin.site.site_title = "PhD NexusCare Admin Portal"
admin.site.index_title = "Welcome to PhD NexusCare Healthcare Platform"

urlpatterns = [
    path('', api_root, name='landing-page'),
    path('api/health/', health_check, name='health-check'),
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.users.urls')),
    path('api/consent/', include('apps.consent.urls')),
    path('api/patients/', include('apps.patients.urls')),
    path('api/doctors/', include('apps.doctors.urls')),
    path('api/service-providers/', include('apps.service_providers.urls')),
    path('api/records/', include('apps.records.urls')),
    path('api/scheduling/', include('apps.scheduling.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/reviews/', include('apps.reviews.urls')),
    path('api/chat/', include('apps.chat.urls')),
    path('api/', include('apps.ai.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

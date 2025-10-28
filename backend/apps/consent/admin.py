from django.contrib import admin
from .models import Consent, AuditLog

admin.site.register(Consent)
admin.site.register(AuditLog)

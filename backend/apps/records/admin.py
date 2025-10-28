from django.contrib import admin
from .models import File, LabResult, Prescription, Encounter, SymptomLog

admin.site.register(File)
admin.site.register(LabResult)
admin.site.register(Prescription)
admin.site.register(Encounter)
admin.site.register(SymptomLog)

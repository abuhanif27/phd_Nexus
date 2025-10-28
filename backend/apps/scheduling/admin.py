from django.contrib import admin
from .models import DoctorAvailability, Appointment

admin.site.register(DoctorAvailability)
admin.site.register(Appointment)

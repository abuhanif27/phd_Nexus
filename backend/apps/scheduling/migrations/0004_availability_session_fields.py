"""
Replace stored end_time with session_duration_minutes, max_patients, minutes_per_patient.
Existing rows have end_time migrated to session_duration_minutes, then end_time is dropped.
"""
from datetime import datetime, timedelta
from django.db import migrations, models


def end_time_to_duration(apps, schema_editor):
    """Compute session_duration_minutes from existing end_time - start_time."""
    DoctorAvailability = apps.get_model('scheduling', 'DoctorAvailability')
    today = datetime.today().date()
    for slot in DoctorAvailability.objects.all():
        start = datetime.combine(today, slot.start_time)
        end = datetime.combine(today, slot.end_time)
        if end <= start:
            end += timedelta(days=1)
        minutes = max(30, int((end - start).total_seconds() / 60))
        slot.session_duration_minutes = minutes
        slot.save(update_fields=['session_duration_minutes'])


class Migration(migrations.Migration):

    dependencies = [
        ('scheduling', '0003_availability_date_based'),
    ]

    operations = [
        # Add new columns with safe defaults
        migrations.AddField(
            model_name='doctoravailability',
            name='session_duration_minutes',
            field=models.IntegerField(default=120),
        ),
        migrations.AddField(
            model_name='doctoravailability',
            name='max_patients',
            field=models.IntegerField(default=8),
        ),
        migrations.AddField(
            model_name='doctoravailability',
            name='minutes_per_patient',
            field=models.IntegerField(default=15),
        ),
        # Migrate existing end_time data
        migrations.RunPython(end_time_to_duration, migrations.RunPython.noop),
        # Drop the stored end_time (it's now a @property)
        migrations.RemoveField(
            model_name='doctoravailability',
            name='end_time',
        ),
    ]

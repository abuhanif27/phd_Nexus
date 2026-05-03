"""
Replace day_of_week (recurring weekly) with date (specific calendar date).
Old rows are deleted because day_of_week integers cannot be converted to dates.
"""
import datetime
from django.db import migrations, models


def clear_availability(apps, schema_editor):
    DoctorAvailability = apps.get_model('scheduling', 'DoctorAvailability')
    DoctorAvailability.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('scheduling', '0002_appointment_consent_appointment_consent_granted'),
    ]

    operations = [
        # Clear old rows (day_of_week values can't map to real dates)
        migrations.RunPython(clear_availability, migrations.RunPython.noop),
        # Drop old unique_together referencing day_of_week
        migrations.AlterUniqueTogether(
            name='doctoravailability',
            unique_together=set(),
        ),
        # Remove day_of_week column
        migrations.RemoveField(
            model_name='doctoravailability',
            name='day_of_week',
        ),
        # Add date column (safe — table is empty at this point)
        migrations.AddField(
            model_name='doctoravailability',
            name='date',
            field=models.DateField(default=datetime.date(2000, 1, 1)),
            preserve_default=False,
        ),
        # Restore unique_together with the new field
        migrations.AlterUniqueTogether(
            name='doctoravailability',
            unique_together={('doctor', 'date', 'start_time')},
        ),
    ]

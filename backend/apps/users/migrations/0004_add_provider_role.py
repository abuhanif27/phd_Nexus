from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_user_email_verified_user_pending_email_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='role',
            field=models.CharField(choices=[('patient', 'Patient'), ('doctor', 'Doctor'), ('provider', 'Hospital Service Provider'), ('admin', 'Admin')], default='patient', max_length=10),
        ),
    ]

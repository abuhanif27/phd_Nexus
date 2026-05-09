from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0003_alter_notification_channel'),
    ]

    operations = [
        migrations.AddField(
            model_name='notification',
            name='read',
            field=models.BooleanField(default=False),
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['user', 'read'], name='notificatio_user_id_1f75db_idx'),
        ),
    ]

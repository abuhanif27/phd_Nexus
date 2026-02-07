# Generated migration: add OCR extracted_text to File

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('records', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='file',
            name='extracted_text',
            field=models.TextField(blank=True, default=''),
        ),
    ]

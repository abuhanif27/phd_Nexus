from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ServiceProviderOrganization',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('organization_name', models.CharField(max_length=200)),
                ('legal_name', models.CharField(blank=True, max_length=200)),
                ('organization_type', models.CharField(choices=[('hospital', 'Hospital'), ('diagnostic_center', 'Diagnostic Center'), ('clinic', 'Clinic'), ('lab', 'Laboratory'), ('imaging_center', 'Imaging Center'), ('other', 'Other')], default='diagnostic_center', max_length=30)),
                ('registration_number', models.CharField(blank=True, max_length=100)),
                ('contact_person', models.CharField(max_length=150)),
                ('phone', models.CharField(max_length=30)),
                ('website', models.URLField(blank=True)),
                ('address', models.TextField()),
                ('district', models.CharField(max_length=100)),
                ('logo', models.ImageField(blank=True, null=True, upload_to='service_provider_logos/')),
                ('description', models.TextField(blank=True)),
                ('is_verified', models.BooleanField(default=False)),
                ('verification_status', models.CharField(choices=[('pending', 'Pending Approval'), ('approved', 'Approved'), ('rejected', 'Rejected'), ('suspended', 'Suspended')], default='pending', max_length=20)),
                ('admin_notes', models.TextField(blank=True)),
                ('approved_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='service_provider_profile', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'service_provider_organizations',
                'ordering': ['organization_name'],
            },
        ),
        migrations.CreateModel(
            name='ProviderService',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
                ('category', models.CharField(choices=[('lab_test', 'Lab Test'), ('imaging', 'Imaging'), ('health_package', 'Health Package'), ('consultation', 'Consultation'), ('procedure', 'Procedure'), ('other', 'Other')], default='lab_test', max_length=30)),
                ('description', models.TextField(blank=True)),
                ('price', models.DecimalField(decimal_places=2, max_digits=10)),
                ('discounted_price', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('turnaround_time', models.CharField(blank=True, help_text='Example: Same day, 24 hours', max_length=100)),
                ('sample_required', models.CharField(blank=True, help_text='Example: Blood, urine, fasting', max_length=120)),
                ('is_available', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('organization', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='services', to='service_providers.serviceproviderorganization')),
            ],
            options={
                'db_table': 'provider_services',
                'ordering': ['category', 'name'],
                'indexes': [models.Index(fields=['category', 'is_available'], name='provider_se_category_3e83d1_idx'), models.Index(fields=['price'], name='provider_se_price_b6c1f2_idx')],
            },
        ),
    ]

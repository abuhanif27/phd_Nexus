import pytest
from django.contrib.auth import get_user_model
from apps.doctors.models import Doctor
from apps.service_providers.models import ServiceProviderOrganization
from apps.reviews.models import Review

User = get_user_model()

@pytest.fixture
def users(db):
    patient_user = User.objects.create_user(email='patient@test.com', password='password123', role='patient')
    doctor_user = User.objects.create_user(email='doctor@test.com', password='password123', role='doctor')
    provider_user = User.objects.create_user(email='provider@test.com', password='password123', role='provider')
    return patient_user, doctor_user, provider_user

@pytest.fixture
def profiles(db, users):
    p_user, d_user, pr_user = users
    doctor = Doctor.objects.create(user=d_user, name='Test Doctor', specialty='General')
    org = ServiceProviderOrganization.objects.create(
        user=pr_user, 
        organization_name='Test Org', 
        contact_person='Manager',
        phone='123456',
        address='Dhaka',
        district='Dhaka'
    )
    return doctor, org

@pytest.mark.django_db
class TestReviews:
    def test_doctor_rating_update(self, users, profiles):
        patient, _, _ = users
        doctor, _ = profiles
        
        # Initial rating
        assert doctor.rating == 0.0
        
        # Add a review
        Review.objects.create(user=patient, doctor=doctor, rating=4, comment='Good')
        doctor.refresh_from_db()
        assert doctor.rating == 4.0
        
        # Add another review
        Review.objects.create(user=patient, doctor=doctor, rating=2, comment='Bad')
        doctor.refresh_from_db()
        assert doctor.rating == 3.0

    def test_organization_rating_update(self, users, profiles):
        patient, _, _ = users
        _, org = profiles
        
        # Initial rating
        assert org.rating == 0.0
        
        # Add a review
        Review.objects.create(user=patient, organization=org, rating=5, comment='Great')
        org.refresh_from_db()
        assert org.rating == 5.0
        
        # Add another review
        Review.objects.create(user=patient, organization=org, rating=3, comment='Ok')
        org.refresh_from_db()
        assert org.rating == 4.0

    def test_location_fields_presence(self, profiles):
        doctor, org = profiles
        
        # Check doctor location fields
        assert hasattr(doctor, 'latitude')
        assert hasattr(doctor, 'longitude')
        assert hasattr(doctor, 'google_place_id')
        
        # Check organization location fields
        assert hasattr(org, 'latitude')
        assert hasattr(org, 'longitude')
        assert hasattr(org, 'google_place_id')

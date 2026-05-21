import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta, datetime
from apps.doctors.models import Doctor
from apps.patients.models import Patient
from apps.consent.models import Consent
from apps.notifications.models import Notification
from apps.scheduling.models import Appointment

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def doctor_user():
    user = User.objects.create_user(email="doctor@test.com", password="Password123!", role="doctor")
    Doctor.objects.create(user=user, name="Dr. Smith", specialty="General Practice")
    return user

@pytest.fixture
def other_doctor_user():
    user = User.objects.create_user(email="doctor2@test.com", password="Password123!", role="doctor")
    Doctor.objects.create(user=user, name="Dr. House", specialty="Diagnostics")
    return user

@pytest.fixture
def patient_user():
    user = User.objects.create_user(email="patient@test.com", password="Password123!", role="patient")
    Patient.objects.create(user=user, name="John Doe", patient_code="PT-12345")
    return user

@pytest.fixture
def doctor_client(doctor_user):
    client = APIClient()
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(doctor_user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return client

@pytest.fixture
def other_doctor_client(other_doctor_user):
    client = APIClient()
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(other_doctor_user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return client

@pytest.fixture
def patient_client(patient_user):
    client = APIClient()
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(patient_user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return client

@pytest.mark.django_db
class TestDoctorBookingEdgeCases:

    def test_01_happy_path_flow(self, doctor_client, patient_client, doctor_user, patient_user):
        """Test the full successful flow: request -> approve -> book."""
        doctor_profile = doctor_user.doctor_profile
        patient_profile = patient_user.patient_profile

        # Request permission
        doctor_client.post('/api/consent/request-booking/', {'patient_id': patient_profile.id})
        notification = Notification.objects.get(user=patient_user, payload__type='booking_permission_request')
        
        # Approve
        patient_client.post('/api/consent/approve-booking/', {
            'doctor_id': doctor_profile.id,
            'notification_id': notification.id
        })

        # Book
        booking_data = {
            'doctor': doctor_profile.id,
            'patient': patient_profile.id,
            'date': (timezone.now() + timedelta(days=1)).date().isoformat(),
            'start_time': '10:00:00',
            'end_time': '10:30:00'
        }
        response = doctor_client.post('/api/scheduling/appointments/', booking_data)
        assert response.status_code == 201

    def test_02_expired_consent(self, doctor_client, doctor_user, patient_user):
        """Doctor cannot book if consent is expired."""
        doctor_profile = doctor_user.doctor_profile
        patient_profile = patient_user.patient_profile

        # Create expired consent
        Consent.objects.create(
            patient=patient_profile,
            doctor=doctor_profile,
            status='active',
            scope={'write': ['scheduling']},
            expires_at=timezone.now() - timedelta(days=1)
        )

        booking_data = {
            'doctor': doctor_profile.id,
            'patient': patient_profile.id,
            'date': (timezone.now() + timedelta(days=1)).date().isoformat(),
            'start_time': '11:00:00',
            'end_time': '11:30:00'
        }
        response = doctor_client.post('/api/scheduling/appointments/', booking_data)
        assert response.status_code == 403
        assert 'No active consent' in response.data['error']

    def test_03_wrong_scope(self, doctor_client, doctor_user, patient_user):
        """Doctor cannot book if consent exists but lacks scheduling scope."""
        doctor_profile = doctor_user.doctor_profile
        patient_profile = patient_user.patient_profile

        # Create consent with read-only scope
        Consent.objects.create(
            patient=patient_profile,
            doctor=doctor_profile,
            status='active',
            scope={'read': ['all'], 'write': []},
            expires_at=timezone.now() + timedelta(days=1)
        )

        booking_data = {
            'doctor': doctor_profile.id,
            'patient': patient_profile.id,
            'date': (timezone.now() + timedelta(days=1)).date().isoformat(),
            'start_time': '12:00:00',
            'end_time': '12:30:00'
        }
        response = doctor_client.post('/api/scheduling/appointments/', booking_data)
        assert response.status_code == 403
        assert 'permissions' in response.data['error']

    def test_04_revoked_consent(self, doctor_client, doctor_user, patient_user):
        """Doctor cannot book if consent was revoked."""
        doctor_profile = doctor_user.doctor_profile
        patient_profile = patient_user.patient_profile

        # Create revoked consent
        Consent.objects.create(
            patient=patient_profile,
            doctor=doctor_profile,
            status='revoked',
            scope={'write': ['scheduling']},
            expires_at=timezone.now() + timedelta(days=1)
        )

        booking_data = {
            'doctor': doctor_profile.id,
            'patient': patient_profile.id,
            'date': (timezone.now() + timedelta(days=1)).date().isoformat(),
            'start_time': '13:00:00',
            'end_time': '13:30:00'
        }
        response = doctor_client.post('/api/scheduling/appointments/', booking_data)
        assert response.status_code == 403

    def test_05_missing_patient_id(self, doctor_client, doctor_user):
        """Doctor must provide patient ID."""
        doctor_profile = doctor_user.doctor_profile
        booking_data = {
            'doctor': doctor_profile.id,
            'date': (timezone.now() + timedelta(days=1)).date().isoformat(),
            'start_time': '14:00:00',
            'end_time': '14:30:00'
        }
        response = doctor_client.post('/api/scheduling/appointments/', booking_data)
        assert response.status_code == 400
        assert 'Patient ID is required' in response.data['error']

    def test_06_doctor_time_conflict(self, doctor_client, doctor_user, patient_user):
        """Doctor cannot book if they already have an appointment at that time."""
        doctor_profile = doctor_user.doctor_profile
        patient_profile = patient_user.patient_profile

        # Grant consent
        Consent.objects.create(
            patient=patient_profile,
            doctor=doctor_profile,
            status='active',
            scope={'write': ['*']},
            expires_at=timezone.now() + timedelta(days=1)
        )

        date = (timezone.now() + timedelta(days=2)).date().isoformat()
        
        # Create existing appointment
        Appointment.objects.create(
            doctor=doctor_profile,
            patient=patient_profile,
            date=date,
            start_time='10:00:00',
            end_time='10:30:00',
            status='scheduled'
        )

        # Try to book overlapping slot
        booking_data = {
            'doctor': doctor_profile.id,
            'patient': patient_profile.id,
            'date': date,
            'start_time': '10:15:00',
            'end_time': '10:45:00'
        }
        response = doctor_client.post('/api/scheduling/appointments/', booking_data)
        assert response.status_code == 409
        assert 'already booked' in response.data['error']

    def test_07_patient_time_conflict(self, doctor_client, other_doctor_user, doctor_user, patient_user):
        """Doctor cannot book if patient has another appointment elsewhere."""
        doctor_profile = doctor_user.doctor_profile
        other_doctor_profile = other_doctor_user.doctor_profile
        patient_profile = patient_user.patient_profile

        Consent.objects.create(
            patient=patient_profile,
            doctor=doctor_profile,
            status='active',
            scope={'write': ['*']},
            expires_at=timezone.now() + timedelta(days=1)
        )

        date = (timezone.now() + timedelta(days=3)).date().isoformat()

        # Patient has appointment with OTHER doctor
        Appointment.objects.create(
            doctor=other_doctor_profile,
            patient=patient_profile,
            date=date,
            start_time='11:00:00',
            end_time='11:30:00',
            status='scheduled'
        )

        # Try to book overlapping slot
        booking_data = {
            'doctor': doctor_profile.id,
            'patient': patient_profile.id,
            'date': date,
            'start_time': '11:15:00',
            'end_time': '11:45:00'
        }
        response = doctor_client.post('/api/scheduling/appointments/', booking_data)
        assert response.status_code == 409
        assert 'You already have' in response.data['error']

    def test_08_double_booking_prevention(self, doctor_client, doctor_user, patient_user):
        """Prevent scheduling multiple active appointments with the same doctor/patient pair."""
        doctor_profile = doctor_user.doctor_profile
        patient_profile = patient_user.patient_profile

        Consent.objects.create(
            patient=patient_profile,
            doctor=doctor_profile,
            status='active',
            scope={'write': ['*']},
            expires_at=timezone.now() + timedelta(days=1)
        )

        # Create one appointment
        Appointment.objects.create(
            doctor=doctor_profile,
            patient=patient_profile,
            date=(timezone.now() + timedelta(days=4)).date().isoformat(),
            start_time='09:00:00',
            end_time='09:30:00',
            status='scheduled'
        )

        # Try to book another one (different time)
        booking_data = {
            'doctor': doctor_profile.id,
            'patient': patient_profile.id,
            'date': (timezone.now() + timedelta(days=5)).date().isoformat(),
            'start_time': '14:00:00',
            'end_time': '14:30:00'
        }
        response = doctor_client.post('/api/scheduling/appointments/', booking_data)
        assert response.status_code == 409
        assert 'upcoming appointment' in response.data['error']

    def test_09_patient_self_booking_no_consent_needed(self, patient_client, doctor_user, patient_user):
        """Patients should always be able to book for themselves without special consent."""
        doctor_profile = doctor_user.doctor_profile
        
        booking_data = {
            'doctor': doctor_profile.id,
            'date': (timezone.now() + timedelta(days=6)).date().isoformat(),
            'start_time': '15:00:00',
            'end_time': '15:30:00'
        }
        response = patient_client.post('/api/scheduling/appointments/', booking_data)
        assert response.status_code == 201

    def test_10_permission_request_rate_limit(self, doctor_client, patient_user):
        """Doctor cannot spam permission requests."""
        patient_profile = patient_user.patient_profile

        # First request
        response = doctor_client.post('/api/consent/request-booking/', {'patient_id': patient_profile.id})
        assert response.status_code == 200

        # Immediate second request
        response = doctor_client.post('/api/consent/request-booking/', {'patient_id': patient_profile.id})
        assert response.status_code == 429
        assert 'already sent' in response.data['error']

    def test_11_invalid_patient_id(self, doctor_client, doctor_user):
        """Handle non-existent patient ID gracefully."""
        booking_data = {
            'doctor': doctor_user.doctor_profile.id,
            'patient': 9999,
            'date': (timezone.now() + timedelta(days=1)).date().isoformat(),
            'start_time': '10:00:00',
            'end_time': '10:30:00'
        }
        response = doctor_client.post('/api/scheduling/appointments/', booking_data)
        assert response.status_code == 404
        assert 'Patient not found' in response.data['error']

"""
Comprehensive tests for doctor-initiated booking by patient code and free slot functionality.
"""
import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta, date as date_type, time
from apps.doctors.models import Doctor
from apps.patients.models import Patient
from apps.scheduling.models import Appointment

User = get_user_model()


@pytest.fixture
def doctor_user(db):
    user = User.objects.create_user(email="doc@test.com", password="Pass123!", role="doctor")
    Doctor.objects.create(user=user, name="Dr. Alpha", specialty="Cardiology")
    return user


@pytest.fixture
def doctor2_user(db):
    user = User.objects.create_user(email="doc2@test.com", password="Pass123!", role="doctor")
    Doctor.objects.create(user=user, name="Dr. Beta", specialty="Neurology")
    return user


@pytest.fixture
def patient_user(db):
    user = User.objects.create_user(email="pat@test.com", password="Pass123!", role="patient")
    Patient.objects.create(user=user, name="Alice", patient_code="PT-ABCD1234")
    return user


@pytest.fixture
def patient2_user(db):
    user = User.objects.create_user(email="pat2@test.com", password="Pass123!", role="patient")
    Patient.objects.create(user=user, name="Bob", patient_code="PT-EFGH5678")
    return user


def auth_client(user):
    client = APIClient()
    token = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")
    return client


def future_date(days=1):
    return (timezone.now() + timedelta(days=days)).date().isoformat()


@pytest.mark.django_db
class TestDoctorBookByPatientCode:
    """Doctor books appointment using patient_code (PT-...)."""

    def test_book_by_patient_code_success(self, doctor_user, patient_user):
        client = auth_client(doctor_user)
        resp = client.post("/api/scheduling/appointments/", {
            "patient_code": "PT-ABCD1234",
            "doctor": doctor_user.doctor_profile.id,
            "date": future_date(2),
            "start_time": "09:00:00",
            "end_time": "09:15:00",
        })
        assert resp.status_code == 201
        assert resp.data["patient_name"] == "Alice"
        assert resp.data["patient_code"] == "PT-ABCD1234"

    def test_book_by_patient_code_case_insensitive(self, doctor_user, patient_user):
        client = auth_client(doctor_user)
        resp = client.post("/api/scheduling/appointments/", {
            "patient_code": "pt-abcd1234",
            "doctor": doctor_user.doctor_profile.id,
            "date": future_date(3),
            "start_time": "10:00:00",
            "end_time": "10:15:00",
        })
        assert resp.status_code == 201

    def test_book_by_invalid_patient_code(self, doctor_user):
        client = auth_client(doctor_user)
        resp = client.post("/api/scheduling/appointments/", {
            "patient_code": "PT-NONEXIST",
            "doctor": doctor_user.doctor_profile.id,
            "date": future_date(2),
            "start_time": "09:00:00",
            "end_time": "09:15:00",
        })
        assert resp.status_code == 404
        assert "Patient not found" in resp.data["error"]

    def test_book_missing_patient_code_and_id(self, doctor_user):
        client = auth_client(doctor_user)
        resp = client.post("/api/scheduling/appointments/", {
            "doctor": doctor_user.doctor_profile.id,
            "date": future_date(2),
            "start_time": "09:00:00",
            "end_time": "09:15:00",
        })
        assert resp.status_code == 400
        assert "Patient code" in resp.data["error"]

    def test_book_by_patient_id_still_works(self, doctor_user, patient_user):
        """Backward compat: doctor can still use patient ID."""
        client = auth_client(doctor_user)
        resp = client.post("/api/scheduling/appointments/", {
            "patient": patient_user.patient_profile.id,
            "doctor": doctor_user.doctor_profile.id,
            "date": future_date(4),
            "start_time": "11:00:00",
            "end_time": "11:15:00",
        })
        assert resp.status_code == 201

    def test_doctor_time_conflict(self, doctor_user, patient_user, patient2_user):
        """Cannot double-book the same doctor slot."""
        client = auth_client(doctor_user)
        d = future_date(5)
        # First booking
        client.post("/api/scheduling/appointments/", {
            "patient_code": "PT-ABCD1234",
            "doctor": doctor_user.doctor_profile.id,
            "date": d,
            "start_time": "14:00:00",
            "end_time": "14:30:00",
        })
        # Overlapping booking with different patient
        resp = client.post("/api/scheduling/appointments/", {
            "patient_code": "PT-EFGH5678",
            "doctor": doctor_user.doctor_profile.id,
            "date": d,
            "start_time": "14:15:00",
            "end_time": "14:45:00",
        })
        assert resp.status_code == 409

    def test_patient_time_conflict(self, doctor_user, doctor2_user, patient_user):
        """Patient cannot have overlapping appointments with different doctors."""
        d = future_date(6)
        # Book with doctor1
        auth_client(doctor_user).post("/api/scheduling/appointments/", {
            "patient_code": "PT-ABCD1234",
            "doctor": doctor_user.doctor_profile.id,
            "date": d,
            "start_time": "15:00:00",
            "end_time": "15:30:00",
        })
        # Book same patient with doctor2 at overlapping time
        resp = auth_client(doctor2_user).post("/api/scheduling/appointments/", {
            "patient_code": "PT-ABCD1234",
            "doctor": doctor2_user.doctor_profile.id,
            "date": d,
            "start_time": "15:15:00",
            "end_time": "15:45:00",
        })
        assert resp.status_code == 409

    def test_patient_sees_doctor_booked_appointment(self, doctor_user, patient_user):
        """Patient can see appointments booked by doctor."""
        doc_client = auth_client(doctor_user)
        doc_client.post("/api/scheduling/appointments/", {
            "patient_code": "PT-ABCD1234",
            "doctor": doctor_user.doctor_profile.id,
            "date": future_date(7),
            "start_time": "08:00:00",
            "end_time": "08:15:00",
        })
        # Patient fetches their appointments
        pat_client = auth_client(patient_user)
        resp = pat_client.get("/api/scheduling/appointments/")
        appointments = resp.data if isinstance(resp.data, list) else resp.data.get("results", [])
        assert len(appointments) >= 1
        assert any(a["doctor_name"] == "Dr. Alpha" for a in appointments)


@pytest.mark.django_db
class TestFreeSlot:
    """Doctor can delete/free a booking if time hasn't passed."""

    def _create_appointment(self, doctor_user, patient_user, days_ahead=2, hour=10):
        d = (timezone.now() + timedelta(days=days_ahead)).date()
        return Appointment.objects.create(
            doctor=doctor_user.doctor_profile,
            patient=patient_user.patient_profile,
            date=d,
            start_time=time(hour, 0),
            end_time=time(hour, 15),
            status="scheduled",
        )

    def test_free_future_slot_success(self, doctor_user, patient_user):
        apt = self._create_appointment(doctor_user, patient_user, days_ahead=3, hour=9)
        client = auth_client(doctor_user)
        resp = client.delete(f"/api/scheduling/appointments/{apt.id}/free/")
        assert resp.status_code == 204
        assert not Appointment.objects.filter(id=apt.id).exists()

    def test_free_past_slot_fails(self, doctor_user, patient_user):
        """Cannot free a slot whose time has already passed."""
        d = (timezone.now() - timedelta(days=1)).date()
        apt = Appointment.objects.create(
            doctor=doctor_user.doctor_profile,
            patient=patient_user.patient_profile,
            date=d,
            start_time=time(10, 0),
            end_time=time(10, 15),
            status="scheduled",
        )
        client = auth_client(doctor_user)
        resp = client.delete(f"/api/scheduling/appointments/{apt.id}/free/")
        assert resp.status_code == 400
        assert "already passed" in resp.data["error"]
        assert Appointment.objects.filter(id=apt.id).exists()

    def test_patient_cannot_free_slot(self, doctor_user, patient_user):
        """Only doctors can free slots."""
        apt = self._create_appointment(doctor_user, patient_user, days_ahead=4, hour=11)
        client = auth_client(patient_user)
        resp = client.delete(f"/api/scheduling/appointments/{apt.id}/free/")
        assert resp.status_code == 403

    def test_free_slot_allows_rebooking(self, doctor_user, patient_user, patient2_user):
        """After freeing a slot, a new patient can be booked in that time."""
        d = future_date(5)
        doc_client = auth_client(doctor_user)

        # Book patient 1
        resp = doc_client.post("/api/scheduling/appointments/", {
            "patient_code": "PT-ABCD1234",
            "doctor": doctor_user.doctor_profile.id,
            "date": d,
            "start_time": "16:00:00",
            "end_time": "16:15:00",
        })
        apt_id = resp.data["id"]

        # Free the slot
        resp = doc_client.delete(f"/api/scheduling/appointments/{apt_id}/free/")
        assert resp.status_code == 204

        # Book patient 2 in same slot
        resp = doc_client.post("/api/scheduling/appointments/", {
            "patient_code": "PT-EFGH5678",
            "doctor": doctor_user.doctor_profile.id,
            "date": d,
            "start_time": "16:00:00",
            "end_time": "16:15:00",
        })
        assert resp.status_code == 201
        assert resp.data["patient_name"] == "Bob"

    def test_other_doctor_cannot_free(self, doctor_user, doctor2_user, patient_user):
        """A doctor cannot free another doctor's appointment."""
        apt = self._create_appointment(doctor_user, patient_user, days_ahead=6, hour=12)
        client = auth_client(doctor2_user)
        # The queryset filters by doctor, so this should 404
        resp = client.delete(f"/api/scheduling/appointments/{apt.id}/free/")
        assert resp.status_code == 404

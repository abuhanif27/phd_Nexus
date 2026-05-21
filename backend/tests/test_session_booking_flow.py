"""
Comprehensive tests for the DoctorBookingSlotsView endpoint and session-based booking flow.
Tests session status (expired/running/upcoming), slot availability, and booking through sessions.
"""
import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from datetime import date, time, timedelta, datetime
from apps.doctors.models import Doctor
from apps.patients.models import Patient
from apps.scheduling.models import DoctorAvailability, Appointment

User = get_user_model()


@pytest.fixture
def doctor_user(db):
    user = User.objects.create_user(email="sess_doc@test.com", password="Pass123!", role="doctor")
    Doctor.objects.create(user=user, name="Dr. Session", specialty="General")
    return user


@pytest.fixture
def patient_user(db):
    user = User.objects.create_user(email="sess_pat@test.com", password="Pass123!", role="patient")
    Patient.objects.create(user=user, name="SessionPatient", patient_code="PT-SESS0001")
    return user


@pytest.fixture
def patient2_user(db):
    user = User.objects.create_user(email="sess_pat2@test.com", password="Pass123!", role="patient")
    Patient.objects.create(user=user, name="SessionPatient2", patient_code="PT-SESS0002")
    return user


def auth_client(user):
    client = APIClient()
    token = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")
    return client


@pytest.mark.django_db
class TestDoctorBookingSlotsEndpoint:
    """Tests for GET /api/doctors/booking-slots/"""

    def test_returns_empty_when_no_sessions(self, doctor_user):
        client = auth_client(doctor_user)
        resp = client.get("/api/doctors/booking-slots/")
        assert resp.status_code == 200
        assert resp.data == []

    def test_upcoming_session_status(self, doctor_user):
        """A session in the future should have status 'upcoming'."""
        doctor = doctor_user.doctor_profile
        future = date.today() + timedelta(days=2)
        DoctorAvailability.objects.create(
            doctor=doctor, date=future, start_time=time(10, 0),
            session_duration_minutes=60, max_patients=4, minutes_per_patient=15,
        )
        client = auth_client(doctor_user)
        resp = client.get("/api/doctors/booking-slots/")
        assert resp.status_code == 200
        assert len(resp.data) == 1
        assert resp.data[0]['status'] == 'upcoming'
        assert resp.data[0]['total_slots'] == 4
        assert resp.data[0]['available_count'] == 4

    def test_expired_session_status(self, doctor_user):
        """A session in the past should have status 'expired'."""
        doctor = doctor_user.doctor_profile
        yesterday = date.today() - timedelta(days=1)
        DoctorAvailability.objects.create(
            doctor=doctor, date=yesterday, start_time=time(8, 0),
            session_duration_minutes=60, max_patients=4, minutes_per_patient=15,
        )
        client = auth_client(doctor_user)
        resp = client.get("/api/doctors/booking-slots/")
        assert resp.status_code == 200
        assert len(resp.data) == 1
        assert resp.data[0]['status'] == 'expired'

    def test_running_session_status(self, doctor_user):
        """A session happening right now should have status 'running'."""
        doctor = doctor_user.doctor_profile
        now = datetime.now()
        # Create session that started 30 min ago and lasts 120 min
        start = (now - timedelta(minutes=30)).time().replace(second=0, microsecond=0)
        DoctorAvailability.objects.create(
            doctor=doctor, date=date.today(), start_time=start,
            session_duration_minutes=120, max_patients=8, minutes_per_patient=15,
        )
        client = auth_client(doctor_user)
        resp = client.get("/api/doctors/booking-slots/")
        assert resp.status_code == 200
        assert len(resp.data) == 1
        assert resp.data[0]['status'] == 'running'

    def test_running_session_past_slots_disabled(self, doctor_user):
        """In a running session, slots whose time has passed should be marked unavailable and past."""
        doctor = doctor_user.doctor_profile
        now = datetime.now()
        # Session started 30 min ago with 15-min slots → first 2 slots are past
        start = (now - timedelta(minutes=30)).time().replace(second=0, microsecond=0)
        DoctorAvailability.objects.create(
            doctor=doctor, date=date.today(), start_time=start,
            session_duration_minutes=120, max_patients=8, minutes_per_patient=15,
        )
        client = auth_client(doctor_user)
        resp = client.get("/api/doctors/booking-slots/")
        session = resp.data[0]
        assert session['status'] == 'running'
        # First 2 slots (at start and start+15) should be past
        past_slots = [s for s in session['slots'] if s.get('past')]
        assert len(past_slots) >= 2
        # Past slots should not be available
        for s in past_slots:
            assert s['available'] is False
        # Future slots should be available
        future_slots = [s for s in session['slots'] if not s.get('past')]
        assert len(future_slots) > 0
        assert any(s['available'] for s in future_slots)

    def test_slots_reflect_bookings(self, doctor_user, patient_user):
        """Booked slots should show available=false."""
        doctor = doctor_user.doctor_profile
        future = date.today() + timedelta(days=3)
        DoctorAvailability.objects.create(
            doctor=doctor, date=future, start_time=time(9, 0),
            session_duration_minutes=60, max_patients=4, minutes_per_patient=15,
        )
        # Book the first slot
        Appointment.objects.create(
            doctor=doctor, patient=patient_user.patient_profile,
            date=future, start_time=time(9, 0), end_time=time(9, 15),
            status='scheduled',
        )
        client = auth_client(doctor_user)
        resp = client.get("/api/doctors/booking-slots/")
        session = resp.data[0]
        assert session['available_count'] == 3
        assert session['slots'][0]['available'] is False
        assert session['slots'][1]['available'] is True

    def test_date_filter(self, doctor_user):
        """?date= param filters to specific date."""
        doctor = doctor_user.doctor_profile
        d1 = date.today() + timedelta(days=4)
        d2 = date.today() + timedelta(days=5)
        DoctorAvailability.objects.create(
            doctor=doctor, date=d1, start_time=time(10, 0),
            session_duration_minutes=60, max_patients=4, minutes_per_patient=15,
        )
        DoctorAvailability.objects.create(
            doctor=doctor, date=d2, start_time=time(10, 0),
            session_duration_minutes=60, max_patients=4, minutes_per_patient=15,
        )
        client = auth_client(doctor_user)
        resp = client.get(f"/api/doctors/booking-slots/?date={d1.isoformat()}")
        assert len(resp.data) == 1
        assert resp.data[0]['date'] == d1.isoformat()

    def test_breaks_excluded_from_slots(self, doctor_user):
        """Slots during break windows should not appear."""
        doctor = doctor_user.doctor_profile
        future = date.today() + timedelta(days=6)
        DoctorAvailability.objects.create(
            doctor=doctor, date=future, start_time=time(9, 0),
            session_duration_minutes=60, max_patients=4, minutes_per_patient=15,
            breaks=[{'start': '09:15', 'end': '09:30'}],
        )
        client = auth_client(doctor_user)
        resp = client.get("/api/doctors/booking-slots/")
        session = resp.data[0]
        # 4 slots: 9:00, 9:15(break-skipped), 9:30, 9:45 → only 3 slots generated
        slot_times = [s['start_time'] for s in session['slots']]
        assert '09:15' not in slot_times
        assert '09:00' in slot_times
        assert '09:30' in slot_times

    def test_patient_cannot_access(self, patient_user):
        """Patients should get 404 (no doctor profile)."""
        client = auth_client(patient_user)
        resp = client.get("/api/doctors/booking-slots/")
        assert resp.status_code == 404

    def test_multiple_sessions_ordered(self, doctor_user):
        """Multiple sessions returned in date/time order."""
        doctor = doctor_user.doctor_profile
        d = date.today() + timedelta(days=7)
        DoctorAvailability.objects.create(
            doctor=doctor, date=d, start_time=time(14, 0),
            session_duration_minutes=60, max_patients=4, minutes_per_patient=15,
        )
        DoctorAvailability.objects.create(
            doctor=doctor, date=d, start_time=time(9, 0),
            session_duration_minutes=60, max_patients=4, minutes_per_patient=15,
        )
        client = auth_client(doctor_user)
        resp = client.get("/api/doctors/booking-slots/")
        times = [s['start_time'] for s in resp.data]
        assert times == sorted(times)


@pytest.mark.django_db
class TestSessionBasedBookingFlow:
    """End-to-end: doctor fetches sessions, picks slot, books patient, slot updates."""

    def test_full_flow_book_and_slot_updates(self, doctor_user, patient_user):
        """Book via session slot → available_count decreases."""
        doctor = doctor_user.doctor_profile
        future = date.today() + timedelta(days=8)
        DoctorAvailability.objects.create(
            doctor=doctor, date=future, start_time=time(10, 0),
            session_duration_minutes=60, max_patients=4, minutes_per_patient=15,
        )
        client = auth_client(doctor_user)

        # Check initial slots
        resp = client.get("/api/doctors/booking-slots/")
        assert resp.data[0]['available_count'] == 4

        # Book first slot
        resp = client.post("/api/scheduling/appointments/", {
            "patient_code": "PT-SESS0001",
            "doctor": doctor.id,
            "date": future.isoformat(),
            "start_time": "10:00:00",
            "end_time": "10:15:00",
        })
        assert resp.status_code == 201

        # Verify slot count decreased
        resp = client.get("/api/doctors/booking-slots/")
        session = next(s for s in resp.data if s['date'] == future.isoformat())
        assert session['available_count'] == 3
        assert session['slots'][0]['available'] is False

    def test_book_second_patient_different_slot(self, doctor_user, patient_user, patient2_user):
        """Two patients can be booked in different slots of same session."""
        doctor = doctor_user.doctor_profile
        future = date.today() + timedelta(days=9)
        DoctorAvailability.objects.create(
            doctor=doctor, date=future, start_time=time(11, 0),
            session_duration_minutes=60, max_patients=4, minutes_per_patient=15,
        )
        client = auth_client(doctor_user)

        # Book patient 1 at 11:00
        resp = client.post("/api/scheduling/appointments/", {
            "patient_code": "PT-SESS0001",
            "doctor": doctor.id,
            "date": future.isoformat(),
            "start_time": "11:00:00",
            "end_time": "11:15:00",
        })
        assert resp.status_code == 201

        # Book patient 2 at 11:15
        resp = client.post("/api/scheduling/appointments/", {
            "patient_code": "PT-SESS0002",
            "doctor": doctor.id,
            "date": future.isoformat(),
            "start_time": "11:15:00",
            "end_time": "11:30:00",
        })
        assert resp.status_code == 201

        # Verify 2 slots taken
        resp = client.get("/api/doctors/booking-slots/")
        session = next(s for s in resp.data if s['date'] == future.isoformat())
        assert session['available_count'] == 2

    def test_cannot_book_already_taken_slot(self, doctor_user, patient_user, patient2_user):
        """Booking an already-taken slot returns conflict."""
        doctor = doctor_user.doctor_profile
        future = date.today() + timedelta(days=10)
        DoctorAvailability.objects.create(
            doctor=doctor, date=future, start_time=time(13, 0),
            session_duration_minutes=60, max_patients=4, minutes_per_patient=15,
        )
        client = auth_client(doctor_user)

        # Book patient 1
        client.post("/api/scheduling/appointments/", {
            "patient_code": "PT-SESS0001",
            "doctor": doctor.id,
            "date": future.isoformat(),
            "start_time": "13:00:00",
            "end_time": "13:15:00",
        })

        # Try same slot for patient 2
        resp = client.post("/api/scheduling/appointments/", {
            "patient_code": "PT-SESS0002",
            "doctor": doctor.id,
            "date": future.isoformat(),
            "start_time": "13:00:00",
            "end_time": "13:15:00",
        })
        assert resp.status_code == 409

    def test_free_slot_restores_availability(self, doctor_user, patient_user):
        """Freeing a slot makes it available again in the session."""
        doctor = doctor_user.doctor_profile
        future = date.today() + timedelta(days=11)
        DoctorAvailability.objects.create(
            doctor=doctor, date=future, start_time=time(14, 0),
            session_duration_minutes=60, max_patients=4, minutes_per_patient=15,
        )
        client = auth_client(doctor_user)

        # Book
        resp = client.post("/api/scheduling/appointments/", {
            "patient_code": "PT-SESS0001",
            "doctor": doctor.id,
            "date": future.isoformat(),
            "start_time": "14:00:00",
            "end_time": "14:15:00",
        })
        apt_id = resp.data['id']

        # Verify taken
        resp = client.get("/api/doctors/booking-slots/")
        session = next(s for s in resp.data if s['date'] == future.isoformat())
        assert session['available_count'] == 3

        # Free it
        resp = client.delete(f"/api/scheduling/appointments/{apt_id}/free/")
        assert resp.status_code == 204

        # Verify restored
        resp = client.get("/api/doctors/booking-slots/")
        session = next(s for s in resp.data if s['date'] == future.isoformat())
        assert session['available_count'] == 4
        assert session['slots'][0]['available'] is True

    def test_canceled_appointment_does_not_block_slot(self, doctor_user, patient_user, patient2_user):
        """A canceled appointment should not block the slot."""
        doctor = doctor_user.doctor_profile
        future = date.today() + timedelta(days=12)
        DoctorAvailability.objects.create(
            doctor=doctor, date=future, start_time=time(15, 0),
            session_duration_minutes=60, max_patients=4, minutes_per_patient=15,
        )
        # Create a canceled appointment at 15:00
        Appointment.objects.create(
            doctor=doctor, patient=patient_user.patient_profile,
            date=future, start_time=time(15, 0), end_time=time(15, 15),
            status='canceled',
        )
        client = auth_client(doctor_user)
        resp = client.get("/api/doctors/booking-slots/")
        session = next(s for s in resp.data if s['date'] == future.isoformat())
        # Slot should still be available (canceled doesn't block)
        assert session['slots'][0]['available'] is True
        assert session['available_count'] == 4

        # Can book another patient in same slot
        resp = client.post("/api/scheduling/appointments/", {
            "patient_code": "PT-SESS0002",
            "doctor": doctor.id,
            "date": future.isoformat(),
            "start_time": "15:00:00",
            "end_time": "15:15:00",
        })
        assert resp.status_code == 201

    def test_patient_sees_session_booked_appointment(self, doctor_user, patient_user):
        """Patient can see the appointment booked through session flow."""
        doctor = doctor_user.doctor_profile
        future = date.today() + timedelta(days=13)
        DoctorAvailability.objects.create(
            doctor=doctor, date=future, start_time=time(9, 0),
            session_duration_minutes=60, max_patients=4, minutes_per_patient=15,
        )
        doc_client = auth_client(doctor_user)
        doc_client.post("/api/scheduling/appointments/", {
            "patient_code": "PT-SESS0001",
            "doctor": doctor.id,
            "date": future.isoformat(),
            "start_time": "09:00:00",
            "end_time": "09:15:00",
        })

        pat_client = auth_client(patient_user)
        resp = pat_client.get("/api/scheduling/appointments/")
        appointments = resp.data if isinstance(resp.data, list) else resp.data.get("results", [])
        assert any(
            a['date'] == future.isoformat() and a['start_time'] == '09:00:00'
            for a in appointments
        )

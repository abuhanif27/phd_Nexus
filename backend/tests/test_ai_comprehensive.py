
import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.patients.models import Patient
from apps.doctors.models import Doctor
from apps.records.models import Prescription, SymptomLog
from apps.ai.models import ReinforcedKnowledge
from apps.ai.reinforcement import ReinforcementEngine
from apps.ai.services import AIService
from django.utils import timezone
from datetime import timedelta

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def doctor_user(db):
    user = User.objects.create_user(email='doc_test@test.com', password='password123', role='doctor')
    Doctor.objects.create(user=user, name='AI Tester', specialty='General', verification_status='approved')
    return user

@pytest.fixture
def patient_user(db):
    user = User.objects.create_user(email='pat_test@test.com', password='password123', role='patient')
    Patient.objects.create(user=user, name='Case Study')
    return user

@pytest.mark.django_db
class TestAIReinforcementComprehensive:
    
    def setup_method(self):
        self.engine = ReinforcementEngine()
        self.engine.initialize_from_csv()

    def test_case_1_empty_input(self):
        """AI should return empty list for empty symptoms, not crash."""
        predictions = self.engine.predict([])
        assert predictions == []

    def test_case_2_ambiguous_symptoms(self):
        """AI should return multiple predictions for symptoms common to many diseases."""
        # 'vomiting' is very common
        predictions = self.engine.predict(["vomiting"])
        assert len(predictions) > 1
        # Check that they are sorted by weight (all 1.0 initially)
        assert predictions[0][1] >= predictions[1][1]

    def test_case_3_unseen_symptoms(self):
        """AI should handle symptoms not in the dataset gracefully."""
        predictions = self.engine.predict(["alien abduction", "magic sparkles"])
        assert predictions == []

    def test_case_4_penalty_logic(self):
        """Verifying that penalize reduces weights but stays above a floor."""
        disease = "Fungal infection"
        symptom = "itching"
        
        # Initial weight
        obj = ReinforcedKnowledge.objects.get(symptom=symptom, disease=disease)
        initial_w = obj.weight
        
        # Penalize multiple times
        for _ in range(20):
            self.engine.penalize([symptom], disease, penalty_value=0.1)
        
        obj.refresh_from_db()
        assert obj.weight < initial_w
        assert obj.weight >= 0.1  # Floor check

    def test_case_5_end_to_end_reward_integration(self, api_client, doctor_user, patient_user):
        """
        CRITICAL TEST: 
        1. Patient logs symptoms.
        2. Doctor creates prescription.
        3. AI weight for that symptom/disease pair should increase.
        """
        patient = patient_user.patient_profile
        doctor = doctor_user.doctor_profile
        
        # Step 1: Log symptoms
        SymptomLog.objects.create(patient=patient, text="I have a terrible skin rash and it is itching")
        
        # Get initial weight for a likely disease
        disease = "Fungal infection"
        symptom = "itching"
        initial_weight = ReinforcedKnowledge.objects.get(symptom=symptom, disease=disease).weight
        
        # Step 2: Doctor creates prescription (This triggers reinforcement in views.py)
        api_client.force_authenticate(user=doctor_user)
        url = reverse('prescription-list')
        data = {
            "patient": patient.id,
            "items": [{"drug": "Anti-fungal Cream", "dosage": "2 times", "duration": "7 days", "instructions": ""}],
            "notes": "Fungal infection",  # This will be used as the diagnosis for reward
            "status": "active"
        }
        
        response = api_client.post(url, data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        
        # Step 3: Verify weight increase
        updated_weight = ReinforcedKnowledge.objects.get(symptom=symptom, disease=disease).weight
        assert updated_weight > initial_weight
        print(f"Integration Success: Weight increased from {initial_weight} to {updated_weight}")

    def test_case_6_normalization(self):
        """Verify that case and underscores don't break lookups."""
        # CSV has 'skin_rash' or 'skin rash'? Let's check 'itching' vs 'ITCHING'
        self.engine.reward(["ITCHING"], "Fungal infection", reward_value=1.0)
        obj = ReinforcedKnowledge.objects.get(symptom="itching", disease="Fungal infection")
        assert obj.weight > 1.0

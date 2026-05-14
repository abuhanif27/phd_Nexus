from django.test import TestCase
from apps.records.models import PrescriptionFeedback
from apps.patients.models import Patient
import json

class RLFeedbackTests(TestCase):
    def setUp(self):
        self.patient = Patient.objects.create(name="Test Patient", email="test@test.com")
        
    def test_feedback_creation(self):
        feedback = PrescriptionFeedback.objects.create(
            patient=self.patient,
            ocr_text="Advil 200mg BD",
            ai_extracted_json={"medicine": "Advil 200", "frequency": "unknown"},
            human_corrected_json={"medicine": "Advil 200mg", "frequency": "BD"},
            reward_score=-1.0
        )
        self.assertEqual(feedback.reward_score, -1.0)

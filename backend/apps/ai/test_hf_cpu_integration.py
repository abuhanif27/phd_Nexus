from django.test import override_settings

from apps.ai.services import AIService
from apps.ai.symptom_checker import SymptomCheckerService


@override_settings(USE_HF_INFERENCE_API=True, HF_TOKEN=None)
def test_hf_rate_limit_enters_cooldown():
    service = AIService()
    service.hf_client = object()

    service._mark_hf_failure("429 Too Many Requests")

    assert service.hf_last_error == "429 Too Many Requests"
    assert service._hf_available() is False


@override_settings(
    USE_HF_INFERENCE_API=True,
    HF_TOKEN=None,
    AI_LOCAL_FALLBACK_MODE="disabled",
)
def test_specialist_prediction_degrades_without_hf_or_local_models():
    service = AIService()

    result = service.predict_specialist("chest pain and shortness of breath")

    assert result["specialist"] == "General Physician"
    assert result["model_type"] == "fallback"


def test_symptom_checker_degrades_to_specialist_prediction(monkeypatch):
    class StubAIService:
        def _hf_available(self):
            return False

        def predict_specialist(self, text, mode="quick"):
            return {
                "specialist": "Cardiology",
                "confidence": 0.72,
                "alternatives": [],
                "model_type": "stub_lightweight",
            }

    checker = SymptomCheckerService()
    checker._ai_service = StubAIService()
    monkeypatch.setattr(checker, "_ensure_resources", lambda: None)
    monkeypatch.setattr(checker, "_get_recommended_doctors", lambda specialist_name, patient=None: [])

    result = checker.check_symptoms("chest pain with fatigue")

    assert result["specialist"] == "Cardiology"
    assert result["model_source"] == "stub_lightweight"
    assert "chest pain with fatigue" in result["detected_symptoms"]

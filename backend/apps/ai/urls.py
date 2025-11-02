"""
URL routing for AI services.
"""
from django.urls import path
from .views import (
    SymptomAnalyzeView, SpecialistPredictView,
    PatientSummaryView, BuildIndexView, TextSummaryView, HealthAnalysisView,
    ModelStatusView
)

urlpatterns = [
    path('symptoms/analyze/', SymptomAnalyzeView.as_view(), name='symptoms_analyze'),
    path('ai/specialist/', SpecialistPredictView.as_view(), name='ai_specialist'),
    path('ai/predict-specialist/', SpecialistPredictView.as_view(), name='predict_specialist'),
    path('ai/summary/', TextSummaryView.as_view(), name='ai_text_summary'),
    path('ai/patient-summary/', PatientSummaryView.as_view(), name='ai_patient_summary'),
    path('ai/build-index/', BuildIndexView.as_view(), name='ai_build_index'),
    path('health-analysis/', HealthAnalysisView.as_view(), name='health_analysis'),
    path('models/status/', ModelStatusView.as_view(), name='model_status'),
]

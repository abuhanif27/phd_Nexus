"""
URL routing for AI services.
"""
from django.urls import path
from .views import (
    SymptomAnalyzeView, SpecialistPredictView,
    PatientSummaryView, TextSummaryView,
    HealthSummaryView, HealthInsightsView, HealthSummaryShareView,
    SavedSummaryListView, SymptomCheckView, SymptomListView,
    AIStatusView
)

urlpatterns = [
    path('health/summary/', HealthSummaryView.as_view(), name='health_summary'),
    path('health/summary/share/', HealthSummaryShareView.as_view(), name='health_summary_share'),
    path('health/insights/', HealthInsightsView.as_view(), name='health_insights'),
    path('health/saved-summaries/', SavedSummaryListView.as_view(), name='saved_summaries'),
    path('health/saved-summaries/<int:pk>/', SavedSummaryListView.as_view(), name='saved_summary_detail'),
    path('symptoms/analyze/', SymptomAnalyzeView.as_view(), name='symptoms_analyze'),
    path('symptoms/check/', SymptomCheckView.as_view(), name='symptom_check'),
    path('symptoms/list/', SymptomListView.as_view(), name='symptom_list'),
    path('ai/status/', AIStatusView.as_view(), name='ai_status'),
    path('ai/specialist/', SpecialistPredictView.as_view(), name='ai_specialist'),
    path('ai/predict-specialist/', SpecialistPredictView.as_view(), name='predict_specialist'),
    path('ai/summary/', TextSummaryView.as_view(), name='ai_text_summary'),
    path('ai/patient-summary/', PatientSummaryView.as_view(), name='ai_patient_summary'),
]

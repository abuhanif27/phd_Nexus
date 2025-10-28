"""
URL routing for AI services.
"""
from django.urls import path
from .views import (
    SymptomAnalyzeView, SpecialistPredictView,
    PatientSummaryView, BuildIndexView
)

urlpatterns = [
    path('symptoms/analyze/', SymptomAnalyzeView.as_view(), name='symptoms_analyze'),
    path('ai/specialist/', SpecialistPredictView.as_view(), name='ai_specialist'),
    path('ai/summary/', PatientSummaryView.as_view(), name='ai_summary'),
    path('ai/build-index/', BuildIndexView.as_view(), name='ai_build_index'),
]

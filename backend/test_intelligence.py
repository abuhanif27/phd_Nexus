import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nexuscare.settings')
django.setup()

from apps.ai.services import ai_service

# Sample corpus with medical indicators
test_corpus = """
[2026-05-03] [file] Document: medical_report.pdf
Patient has history of chronic hypertension. Blood pressure is 160/95 mmHg.
Heart rate noted at 88 bpm.
Diagnosis: severe asthma, currently active.
Prescribed Albuterol inhaler for mild episodes.
Patient's diabetes is well controlled and managed with lifestyle changes.
"""

print("--- Testing Intelligent Condition Analysis ---")
summary = ai_service.generate_health_summary_from_records(1) # Using patient 1 for context
# Manually trigger summary logic with test corpus for isolated verification
# (Injecting corpus into the logic part)

narrative, findings = ai_service._build_professional_summary(test_corpus)
print(f"Narrative: {narrative}\n")

print("Conditions extracted:")
for raw in findings:
    analysis = ai_service._analyze_condition(raw)
    print(f"  Raw: {raw}")
    print(f"  Name: {analysis['name']}")
    print(f"  Severity: {analysis['severity']}")
    print(f"  Status: {analysis['status']}")
    print("-" * 20)

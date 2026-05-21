"""
Sanity-test the BioBERT / clinical-NER integration used by the Report Summary
feature.  Runs against either the HF Inference API (default) or a local
transformers pipeline (USE_LOCAL_AI_MODELS=True) and prints the entities found
in a small piece of clinical text.

Usage:
    python manage.py test_biobert_ner                          # default text
    python manage.py test_biobert_ner --text "Patient on aspirin..."
    python manage.py test_biobert_ner --model d4data/biomedical-ner-all
    python manage.py test_biobert_ner --patient 1              # use real records
"""

from django.core.management.base import BaseCommand
from django.conf import settings

from apps.ai.services import ai_service


DEFAULT_TEXT = (
    "The patient is a 58-year-old male with a 10-year history of type 2 "
    "diabetes mellitus and hypertension. He reports occasional chest pain "
    "and shortness of breath. Current medications include metformin 500mg "
    "twice daily, lisinopril 20mg once daily, and atorvastatin 40mg at "
    "bedtime. Recent labs showed elevated HbA1c at 8.2% and LDL of 165 mg/dL."
)


class Command(BaseCommand):
    help = "Run a BioBERT/clinical-NER sanity test against text or a patient's records."

    def add_arguments(self, parser):
        parser.add_argument('--text', type=str, default=None,
                            help="Free-text input to run NER on. Overrides --patient.")
        parser.add_argument('--patient', type=int, default=None,
                            help="Run NER on the corpus built from this patient's records.")
        parser.add_argument('--model', type=str, default=None,
                            help="Override HF_NER_MODEL for this run.")
        parser.add_argument('--min-score', type=float, default=None,
                            help="Override BIOBERT_MIN_SCORE for this run.")

    def handle(self, *args, **opts):
        model_id = opts['model'] or getattr(settings, 'HF_NER_MODEL',
                                            'd4data/biomedical-ner-all')
        min_score = opts['min_score']

        # Resolve input text
        if opts['patient']:
            corpus, meta = ai_service.get_recent_records_corpus(opts['patient'])
            if not corpus.strip():
                self.stderr.write(self.style.WARNING(
                    f"No records found for patient {opts['patient']}."
                ))
                return
            text = corpus[: int(getattr(settings, 'BIOBERT_CORPUS_MAX_CHARS', 6000))]
            self.stdout.write(self.style.NOTICE(
                f"Patient {opts['patient']} corpus: "
                f"{meta['record_count']} records, "
                f"{meta['source_counts']}"
            ))
        else:
            text = opts['text'] or DEFAULT_TEXT

        self.stdout.write(self.style.NOTICE(f"Model: {model_id}"))
        self.stdout.write(self.style.NOTICE(
            f"HF available: {ai_service._hf_available()} | "
            f"Local fallback enabled: {getattr(settings, 'USE_LOCAL_AI_MODELS', False)}"
        ))
        self.stdout.write(self.style.NOTICE(f"Input chars: {len(text)}"))
        self.stdout.write("---")
        self.stdout.write(text[:300] + ("..." if len(text) > 300 else ""))
        self.stdout.write("---")

        entities = ai_service._call_biobert_ner(text, model_id=model_id)
        self.stdout.write(self.style.SUCCESS(
            f"Got {len(entities)} entities."
        ))

        # Group by label
        by_group = {}
        for ent in entities:
            by_group.setdefault(ent.get('entity_group', '?'), []).append(ent)

        for group in sorted(by_group):
            ents = by_group[group]
            self.stdout.write(self.style.HTTP_INFO(f"\n[{group}] ({len(ents)})"))
            for ent in ents[:10]:
                self.stdout.write(
                    f"  - {ent['word']!r:40s} score={ent['score']:.2f}"
                )

        # Show how many would survive the min_score threshold for the report.
        conditions = ai_service._entities_to_conditions(
            entities, min_score=min_score
        )
        meds = ai_service._entities_to_medications(
            entities, min_score=min_score
        )
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(
            f"After filtering: {len(conditions)} conditions, {len(meds)} medications."
        ))
        for c in conditions[:5]:
            self.stdout.write(
                f"  cond: {c['name']} (sev={c['severity']}, "
                f"conf={c.get('confidence')})"
            )
        for m in meds[:5]:
            self.stdout.write(
                f"  med:  {m['name']} (status={m['status']}, "
                f"conf={m.get('confidence')})"
            )

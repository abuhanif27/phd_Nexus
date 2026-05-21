"""
Push an *anonymized* corpus of medical text to a Hugging Face Dataset that you
own.  Useful for fine-tuning BioBERT/clinical-NER on the records you've
collected, then pulling the model back via HF_NER_MODEL.

This command is **opt-in** and refuses to run without explicit confirmation
because medical records are PHI.  By default it operates in dry-run mode and
prints a small sample.

Steps it performs:
  1. Collects text from File extracted_text + LabResult.summary (configurable).
  2. Strips obvious PII (names, phones, emails, dates of birth, addresses,
     long digit runs).  This is best-effort; review the sample before pushing.
  3. Builds a CSV / JSONL on disk under MEDIA_ROOT/hf_dataset/.
  4. (Optional) Pushes to ``HF_REPO_ID-dataset`` as a *private* HF dataset using
     the ``HF_TOKEN`` from settings.

Usage:
    python manage.py push_dataset_to_hf                       # dry-run preview
    python manage.py push_dataset_to_hf --confirm             # local export only
    python manage.py push_dataset_to_hf --confirm --push      # push to HF (private)
    python manage.py push_dataset_to_hf --confirm --push --public  # public dataset
"""

import csv
import json
import re
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.records.models import File, LabResult, Encounter
from apps.ai.tasks import get_or_extract_file_text


# Conservative PII scrubbers. Order matters — broad patterns first.
_PII_PATTERNS = [
    (re.compile(r'\b[\w.+-]+@[\w-]+\.[\w.-]+\b'), '[EMAIL]'),                    # email
    (re.compile(r'\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b'), '[PHONE]'),  # phone
    (re.compile(r'\bhttps?://\S+\b'), '[URL]'),
    (re.compile(r'\bwww\.\S+\b'), '[URL]'),
    (re.compile(r'\b\d{4}-\d{2}-\d{2}\b'), '[DATE]'),
    (re.compile(r'\b(?:Mr|Mrs|Ms|Dr|Prof)\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?'), '[PERSON]'),
    (re.compile(r'\b\d{6,}\b'), '[ID]'),                                          # long digit IDs
    (re.compile(r'\b[A-Z]{2,}\d{4,}\b'), '[ID]'),                                 # mixed IDs
    (re.compile(r'\b\d{1,5}\s+\w+\s+(?:St|Street|Rd|Road|Ave|Avenue|Lane|Ln|Blvd|Boulevard)\b'),
     '[ADDRESS]'),
]


def scrub_pii(text: str) -> str:
    if not text:
        return ''
    out = text
    for pat, repl in _PII_PATTERNS:
        out = pat.sub(repl, out)
    return ' '.join(out.split())  # collapse whitespace


class Command(BaseCommand):
    help = "Build a PII-scrubbed dataset of medical text and (optionally) push it to HF Hub."

    def add_arguments(self, parser):
        parser.add_argument('--confirm', action='store_true',
                            help="Required to actually write the dataset to disk.")
        parser.add_argument('--push', action='store_true',
                            help="Upload the dataset to the HF Hub after building it.")
        parser.add_argument('--public', action='store_true',
                            help="Create a *public* dataset on HF (default is private).")
        parser.add_argument('--limit', type=int, default=200,
                            help="Max number of records to include (default 200).")
        parser.add_argument('--repo-id', type=str, default=None,
                            help="HF dataset repo id (defaults to HF_REPO_ID + '-dataset').")
        parser.add_argument('--include-encounters', action='store_true',
                            help="Also include Encounter notes (in addition to files + labs).")

    def handle(self, *args, **opts):
        if not opts['confirm']:
            self.stdout.write(self.style.WARNING(
                "Dry run only.  Re-run with --confirm to write the dataset.\n"
                "Re-run with --confirm --push to also upload to HF."
            ))

        rows = []

        # 1. Files
        for f in File.objects.all().order_by('-created_at')[: opts['limit']]:
            try:
                raw = get_or_extract_file_text(f.id) or ''
            except Exception as e:  # noqa: BLE001
                self.stderr.write(f"  skip file {f.id}: {e}")
                continue
            cleaned = scrub_pii(raw)
            if len(cleaned) < 50:
                continue
            rows.append({
                'source': 'file',
                'kind': f.kind or 'other',
                'text': cleaned[:4000],
            })

        # 2. Lab results
        for lab in LabResult.objects.all().order_by('-ts')[: opts['limit']]:
            text = scrub_pii(f"{lab.title}. {lab.summary or ''}")
            if len(text) < 30:
                continue
            rows.append({'source': 'lab', 'kind': 'lab', 'text': text[:4000]})

        # 3. (optional) encounter notes
        if opts['include_encounters']:
            for enc in Encounter.objects.all().order_by('-ts')[: opts['limit']]:
                text = scrub_pii(
                    f"{enc.notes}. Diagnosis: {enc.diagnosis}. Plan: {enc.plan}"
                )
                if len(text) < 30:
                    continue
                rows.append({
                    'source': 'encounter', 'kind': 'encounter', 'text': text[:4000]
                })

        self.stdout.write(self.style.SUCCESS(
            f"Collected {len(rows)} rows after PII scrubbing."
        ))
        if not rows:
            return

        # Show a sample so the operator can review BEFORE pushing.
        self.stdout.write("\nSample (first row):")
        self.stdout.write(json.dumps(rows[0], indent=2)[:600])

        if not opts['confirm']:
            return

        # 4. Write JSONL + CSV under MEDIA_ROOT/hf_dataset/
        out_dir = Path(getattr(settings, 'MEDIA_ROOT', '.')) / 'hf_dataset'
        out_dir.mkdir(parents=True, exist_ok=True)
        jsonl_path = out_dir / 'records.jsonl'
        csv_path = out_dir / 'records.csv'

        with jsonl_path.open('w', encoding='utf-8') as fh:
            for row in rows:
                fh.write(json.dumps(row, ensure_ascii=False) + '\n')

        with csv_path.open('w', encoding='utf-8', newline='') as fh:
            writer = csv.DictWriter(fh, fieldnames=['source', 'kind', 'text'])
            writer.writeheader()
            writer.writerows(rows)

        self.stdout.write(self.style.SUCCESS(
            f"Wrote {jsonl_path} and {csv_path}."
        ))

        if not opts['push']:
            return

        # 5. Push to HF Hub
        token = getattr(settings, 'HF_TOKEN', None)
        if not token:
            raise CommandError("HF_TOKEN not configured; cannot push.")
        repo_id = opts['repo_id'] or (
            getattr(settings, 'HF_REPO_ID', '') + '-dataset'
        )
        if not repo_id or repo_id.endswith('-dataset') and not getattr(settings, 'HF_REPO_ID', ''):
            raise CommandError(
                "Cannot derive HF dataset repo id; pass --repo-id user/name."
            )

        try:
            from huggingface_hub import HfApi
        except ImportError as e:  # noqa: BLE001
            raise CommandError(f"huggingface_hub not installed: {e}")

        api = HfApi(token=token)
        api.create_repo(
            repo_id=repo_id,
            repo_type='dataset',
            private=not opts['public'],
            exist_ok=True,
        )
        api.upload_file(
            path_or_fileobj=str(jsonl_path),
            path_in_repo='records.jsonl',
            repo_id=repo_id,
            repo_type='dataset',
        )
        api.upload_file(
            path_or_fileobj=str(csv_path),
            path_in_repo='records.csv',
            repo_id=repo_id,
            repo_type='dataset',
        )
        self.stdout.write(self.style.SUCCESS(
            f"Uploaded dataset to https://huggingface.co/datasets/{repo_id}"
        ))

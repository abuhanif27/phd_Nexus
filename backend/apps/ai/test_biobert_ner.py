"""
Unit tests for the BioBERT / clinical-NER helpers used by the Report Summary
feature.  The HF inference call is mocked so these tests run offline.
"""
from unittest.mock import patch

from django.test import override_settings

from apps.ai.services import AIService


def _fake_ner_response():
    """Mock HF token-classification response in the standard list-of-dicts shape."""
    return [
        {'entity_group': 'DISEASE_DISORDER', 'word': 'diabetes mellitus',
         'score': 0.97, 'start': 0, 'end': 17},
        {'entity_group': 'DISEASE_DISORDER', 'word': 'hypertension',
         'score': 0.95, 'start': 19, 'end': 31},
        {'entity_group': 'SIGN_SYMPTOM', 'word': 'chest pain',
         'score': 0.88, 'start': 50, 'end': 60},
        {'entity_group': 'MEDICATION', 'word': 'metformin',
         'score': 0.99, 'start': 80, 'end': 89},
        {'entity_group': 'MEDICATION', 'word': 'lisinopril',
         'score': 0.91, 'start': 95, 'end': 105},
        # Low-confidence noise that should be dropped by min_score.
        {'entity_group': 'DISEASE_DISORDER', 'word': 'flu',
         'score': 0.30, 'start': 110, 'end': 113},
        # Empty word should be dropped during normalization.
        {'entity_group': 'MEDICATION', 'word': '',
         'score': 0.95, 'start': 0, 'end': 0},
        # Unknown label group should be ignored by the conditions/meds mappers.
        {'entity_group': 'BIOLOGICAL_STRUCTURE', 'word': 'liver',
         'score': 0.99, 'start': 120, 'end': 125},
    ]


def test_chunk_for_bert_short_text_is_single_chunk():
    service = AIService.__new__(AIService)  # bypass __init__
    chunks = service._chunk_for_bert("short medical note", max_chars=1500)
    assert chunks == ["short medical note"]


def test_chunk_for_bert_splits_on_sentence_boundaries():
    service = AIService.__new__(AIService)
    text = ("Patient has diabetes. " * 100) + ("Patient has hypertension. " * 100)
    chunks = service._chunk_for_bert(text, max_chars=400)
    assert len(chunks) > 2
    assert all(len(c) <= 400 for c in chunks)
    # Reassembling the chunks should preserve the original tokens.
    assert "diabetes" in " ".join(chunks)
    assert "hypertension" in " ".join(chunks)


def test_normalize_ner_response_handles_dicts_and_objects():
    service = AIService.__new__(AIService)

    class _Ent:
        def __init__(self, **kw):
            for k, v in kw.items():
                setattr(self, k, v)

    obj_response = [
        _Ent(entity_group='medication', word='aspirin', score='0.9',
             start=0, end=7),
    ]
    norm = service._normalize_ner_response(obj_response)
    assert norm == [{
        'entity_group': 'MEDICATION', 'word': 'aspirin',
        'score': 0.9, 'start': 0, 'end': 7,
    }]

    dict_response = [{'entity': 'DISEASE', 'word': '##betes', 'score': 0.5}]
    norm2 = service._normalize_ner_response(dict_response)
    assert norm2[0]['entity_group'] == 'DISEASE'
    assert norm2[0]['word'] == 'betes'  # leading ## stripped


def test_entities_to_conditions_filters_and_dedupes():
    service = AIService.__new__(AIService)
    service.SUMMARY_BLACKLIST = AIService.SUMMARY_BLACKLIST  # for _is_noise
    entities = _fake_ner_response()
    conditions = service._entities_to_conditions(entities, min_score=0.5)
    names = [c['name'].lower() for c in conditions]

    # Diseases + symptoms kept, low-confidence "flu" and BIOLOGICAL_STRUCTURE
    # "liver" excluded.
    assert any('diabetes' in n for n in names)
    assert any('hypertension' in n for n in names)
    assert any('chest pain' in n for n in names)
    assert all('liver' not in n for n in names)
    assert all('flu' not in n for n in names)
    # All entries carry the source + confidence metadata.
    assert all(c['source'] == 'biobert' for c in conditions)
    assert all(0 <= c['confidence'] <= 1 for c in conditions)


def test_entities_to_medications_only_meds():
    service = AIService.__new__(AIService)
    service.SUMMARY_BLACKLIST = AIService.SUMMARY_BLACKLIST
    entities = _fake_ner_response()
    meds = service._entities_to_medications(entities, min_score=0.5)
    names = [m['name'].lower() for m in meds]
    assert any('metformin' in n for n in names)
    assert any('lisinopril' in n for n in names)
    # Disease entities should not show up as medications.
    assert all('diabetes' not in n for n in names)
    assert all(m['source'] == 'biobert' for m in meds)


@override_settings(
    USE_HF_INFERENCE_API=True,
    HF_TOKEN='test-token',
    BIOBERT_MIN_SCORE=0.5,
    BIOBERT_MAX_CHUNKS=3,
    BIOBERT_CHUNK_CHARS=1500,
    BIOBERT_CACHE_TTL_SECONDS=60,
)
def test_call_biobert_ner_uses_cache_and_chunks():
    service = AIService()
    service.hf_client = object()  # pretend HF is initialized
    service.hf_disabled_until = 0
    text = "Patient has diabetes and hypertension. Currently on metformin."

    with patch.object(
        AIService, '_call_hf_inference', return_value=_fake_ner_response()
    ) as mock_call:
        first = service._call_biobert_ner(text)
        second = service._call_biobert_ner(text)  # should hit Django cache

    assert len(first) == 7  # 8 raw entities, 1 dropped for empty word
    assert second == first
    # HF should only be called for the FIRST run, not the cached second.
    assert mock_call.call_count >= 1
    # Cached call adds zero new HF requests.
    cached_calls = mock_call.call_count
    service._call_biobert_ner(text)
    assert mock_call.call_count == cached_calls


@override_settings(
    USE_HF_INFERENCE_API=True,
    HF_TOKEN='test-token',
    BIOBERT_MIN_SCORE=0.5,
)
def test_call_biobert_ner_returns_empty_on_empty_input():
    service = AIService()
    service.hf_client = object()
    service.hf_disabled_until = 0
    assert service._call_biobert_ner('') == []
    assert service._call_biobert_ner('   ') == []

"""
Views for AI/ML services.
"""
from rest_framework import views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.patients.models import Patient
from apps.records.models import File, SymptomLog
from apps.records.serializers import FileSerializer
from .models import AISummary, HealthSummaryShare
from .serializers import (
    SymptomAnalyzeSerializer, SpecialistPredictSerializer,
    SummaryRequestSerializer, TextSummarySerializer, AISummarySerializer,
    HealthSummaryShareSerializer, SymptomCheckSerializer,
    HealthSummaryFeedbackSerializer
)
from .services import ai_service
from django.utils import timezone


def _get_patient_or_403(request):
    """Get current user's patient profile or return 403 Response."""
    if not hasattr(request.user, 'patient_profile'):
        return None, Response(
            {'error': 'Patient profile not found. Complete your profile to see health summary.'},
            status=status.HTTP_404_NOT_FOUND
        )
    return request.user.patient_profile, None


class HealthSummaryFeedbackView(views.APIView):
    """
    POST: Submit feedback on health summary quality.
    Rewards or penalizes the AI's reinforcement knowledge base.

    When the user says the summary is CORRECT (is_helpful=True):
      - Extracts symptoms from the summary context
      - Queries the RL engine for top disease predictions
      - Rewards those symptom→disease associations

    When the user says the summary is INCORRECT (is_helpful=False):
      - Extracts symptoms from the flagged summary text or wrong_info
      - Queries the RL engine for top disease predictions
      - Penalizes those symptom→disease associations
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = HealthSummaryFeedbackSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        is_helpful = serializer.validated_data['is_helpful']
        wrong_info = serializer.validated_data.get('wrong_info', '')
        summary_text = serializer.validated_data.get('summary_text', '')
        feedback_text = wrong_info or summary_text

        # Extract symptoms from the feedback text
        found_symptoms = ai_service.rl_engine.get_contained_symptoms(feedback_text) if feedback_text else []

        if not is_helpful:
            # User flagged the summary as wrong — penalize top disease predictions
            if found_symptoms:
                predictions = ai_service.rl_engine.predict(found_symptoms, top_k=3)
                for disease, score in predictions:
                    if score > 0:
                        ai_service.rl_engine.penalize(found_symptoms, disease, penalty_value=0.05)
                        print(f"[FEEDBACK] Penalized '{disease}' (score={score:.2f}) for unhelpful summary")

            print(f"[FEEDBACK] User reported unhelpful summary. Symptoms: {found_symptoms[:5]}. Context: {feedback_text[:200]}")

        elif is_helpful:
            # User confirmed summary was helpful — reinforce top predictions
            if found_symptoms:
                predictions = ai_service.rl_engine.predict(found_symptoms, top_k=2)
                for disease, score in predictions:
                    if score > 0:
                        ai_service.rl_engine.reward(found_symptoms, disease, reward_value=0.08)
                        print(f"[FEEDBACK] Rewarded '{disease}' (score={score:.2f}) for helpful summary")

            print(f"[FEEDBACK] User confirmed helpful summary. Symptoms: {found_symptoms[:5]}")

        return Response({
            'message': 'Feedback recorded. Thank you for helping improve the AI.',
            'is_helpful': is_helpful
        }, status=status.HTTP_200_OK)


class SymptomAnalyzeView(views.APIView):
    """Analyze symptoms using NLP."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = SymptomAnalyzeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        text = serializer.validated_data['text']
        result = ai_service.analyze_symptoms(text)
        
        if request.user.role == 'patient':
            SymptomLog.objects.create(
                patient=request.user.patient_profile,
                text=text,
                cleaned_text=result['cleaned_text'],
                entities=result['entities']
            )
        
        return Response(result)


class SpecialistPredictView(views.APIView):
    """Predict specialist from symptom text."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = SpecialistPredictSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        text = serializer.validated_data['text']
        mode = request.data.get('mode', 'quick')
        model = request.data.get('model') or request.query_params.get('model')
        result = ai_service.predict_specialist(text, model_type=model, mode=mode)
        return Response(result)


class PatientSummaryView(views.APIView):
    """Generate extractive summary of patient records for doctors."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = SummaryRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        patient_id = serializer.validated_data['patient_id']
        
        try:
            patient = Patient.objects.get(id=patient_id)
            if request.user.role == 'patient' and patient.user != request.user:
                return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
            
            result = ai_service.summarize_patient(patient_id)
            return Response(result)
        except Patient.DoesNotExist:
            return Response({'error': 'Patient not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TextSummaryView(views.APIView):
    """Generate summary from arbitrary medical text."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = TextSummarySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        text = serializer.validated_data['text']
        result = ai_service.summarize_text(text)
        return Response(result)


class HealthSummaryView(views.APIView):
    """
    GET: AI health summary with custom record selection.
    POST: Save a summary to database.
    """
    permission_classes = []  # Allow unauthenticated for shared links if token present

    def get(self, request):
        share_token = request.query_params.get('share_token')
        
        if share_token:
            try:
                share = HealthSummaryShare.objects.select_related('patient').get(share_token=share_token)
                if not share.is_valid():
                    return Response({'error': 'Share link expired'}, status=403)
                patient = share.patient
            except HealthSummaryShare.DoesNotExist:
                return Response({'error': 'Invalid share link'}, status=404)
        else:
            if not request.user.is_authenticated:
                return Response({'error': 'Authentication required'}, status=401)
            patient, err = _get_patient_or_403(request)
            if err: return err
        
        # Check for custom file selection
        file_ids_raw = request.query_params.get('file_ids')
        file_ids = None
        if file_ids_raw:
            try:
                file_ids = [int(x) for x in file_ids_raw.split(',') if x.strip()]
            except ValueError: pass

        strict_param = request.query_params.get('strict', 'false').lower() in ('1', 'true', 'yes')
        lab_only_param = request.query_params.get('lab_only', 'false').lower() in ('1', 'true', 'yes')
        lab_only_fallback = False
        lab_only_message = ''

        if lab_only_param:
            if file_ids:
                lab_count = File.objects.filter(id__in=file_ids, patient=patient, kind='lab').count()
                if lab_count == 0:
                    lab_only_param = False
                    lab_only_fallback = True
                    lab_only_message = 'No lab reports found in your selection. Using other records instead.'
            else:
                lab_count = File.objects.filter(patient=patient, kind='lab').count()
                if lab_count == 0:
                    lab_only_param = False
                    lab_only_fallback = True
                    lab_only_message = 'No lab reports found. Using other records instead.'

        try:
            result = ai_service.generate_health_summary_from_records(
                patient.id,
                file_ids=file_ids,
                strict=strict_param,
                lab_only=lab_only_param,
            )
            
            # Map results to frontend shape
            conditions = []
            for i, c in enumerate(result.get('conditions', [])[:15]):
                if isinstance(c, dict):
                    c['id'] = i
                    conditions.append(c)
                else:
                    conditions.append({'id': i, 'name': str(c), 'severity': 'moderate', 'diagnosed_date': '', 'status': 'active'})

            medications = []
            for i, m in enumerate(result.get('medications', [])[:15]):
                if isinstance(m, dict):
                    m['id'] = i
                    if 'start_date' not in m: m['start_date'] = ''
                    medications.append(m)
                else:
                    medications.append({'id': i, 'name': str(m)[:80], 'dosage': '', 'frequency': '', 'start_date': '', 'status': 'active'})

            # Get source file details for linking
            used_file_ids = result.get('selected_source_ids', [])
            source_files_data = []
            if used_file_ids:
                source_files = File.objects.filter(id__in=used_file_ids, patient=patient)
                source_files_data = FileSerializer(source_files, many=True).data

            response_payload = {
                'vital_signs': [],
                'conditions': conditions,
                'medications': medications,
                'last_checkup': result.get('date_range', {}).get('newest'),
                'ai_insights': result.get('insights', []),
                'summary': result.get('summary', ''),
                'bullets': result.get('bullets', []),
                'professional_summary': result.get('professional_summary', ''),
                'professional_findings': result.get('professional_findings', []),
                'record_highlights': result.get('record_highlights', []),
                'source_counts': result.get('source_counts', {}),
                'record_count': result.get('record_count', 0),
                'date_range': result.get('date_range', {}),
                'extracted_vitals': result.get('extracted_vitals', {}),
                'selected_source_ids': used_file_ids,
                'source_files': source_files_data,
                'biobert_entities': result.get('biobert_entities', []),
            }
            if lab_only_fallback:
                response_payload['lab_only_fallback'] = True
                response_payload['lab_only_message'] = lab_only_message

            return Response(response_payload)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    def post(self, request):
        """Save a summary to patient's bookmarks."""
        patient, err = _get_patient_or_403(request)
        if err: return err
            
        summary_text = request.data.get('summary')
        title = request.data.get('title', f"Health Summary - {timezone.now().strftime('%b %d, %Y')}")
        source_ids = request.data.get('source_ids', [])
        
        if not summary_text:
            return Response({'error': 'Summary text is required'}, status=400)
            
        summary = AISummary.objects.create(
            patient=patient,
            text=summary_text,
            title=title,
            source_ids=source_ids,
            is_saved=True,
            method='other'
        )
        
        return Response({'message': 'Summary saved successfully', 'id': summary.id})


class SavedSummaryListView(views.APIView):
    """Manage saved health summaries."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        patient, err = _get_patient_or_403(request)
        if err: return err
            
        summaries = AISummary.objects.filter(patient=patient, is_saved=True).order_by('-ts')
        return Response({
            'summaries': [{
                'id': s.id,
                'title': s.title,
                'text': s.text,
                'ts': s.ts,
                'source_ids': s.source_ids
            } for s in summaries]
        })

    def delete(self, request, pk):
        patient, err = _get_patient_or_403(request)
        if err: return err
        try:
            summary = AISummary.objects.get(id=pk, patient=patient)
            summary.delete()
            return Response({'message': 'Summary deleted'})
        except AISummary.DoesNotExist:
            return Response({'error': 'Summary not found'}, status=404)


class HealthInsightsView(views.APIView):
    """GET: AI insights only."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        patient, err = _get_patient_or_403(request)
        if err: return err
        try:
            result = ai_service.generate_health_summary_from_records(patient.id)
            return Response({'insights': result.get('insights', [])})
        except Exception as e:
            return Response({'error': str(e)}, status=500)


class HealthSummaryShareView(views.APIView):
    """Manage shareable tokens."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        patient, err = _get_patient_or_403(request)
        if err: return err
        
        force_new = request.data.get('force_new', False)
        if not force_new:
            existing = HealthSummaryShare.objects.filter(patient=patient, is_active=True).first()
            if existing and existing.is_valid():
                return Response({
                    'share_token': str(existing.share_token),
                    'share_url': f'/share/health-summary/{existing.share_token}',
                    'created_at': existing.created_at,
                    'is_active': existing.is_active,
                    'message': 'Using existing share link'
                })
        
        if HealthSummaryShare.objects.filter(patient=patient).count() >= 10:
            return Response({'error': 'Limit of 10 share links reached'}, status=400)
        
        share = HealthSummaryShare.objects.create(patient=patient, expires_at=request.data.get('expires_at'))
        return Response({
            'share_token': str(share.share_token),
            'share_url': f'/share/health-summary/{share.share_token}',
            'created_at': share.created_at,
            'is_active': share.is_active,
            'message': 'Share link created successfully'
        }, status=201)
    
    def get(self, request):
        patient, err = _get_patient_or_403(request)
        if err: return err
        shares = HealthSummaryShare.objects.filter(patient=patient).order_by('-created_at')
        return Response({
            'shares': [
                {
                    'share_token': str(s.share_token),
                    'share_url': f'/share/health-summary/{s.share_token}',
                    'created_at': s.created_at,
                    'expires_at': s.expires_at,
                    'is_active': s.is_active,
                    'is_valid': s.is_valid()
                }
                for s in shares
            ]
        })
    
    def put(self, request):
        patient, err = _get_patient_or_403(request)
        if err: return err
        try:
            s = HealthSummaryShare.objects.get(share_token=request.data.get('share_token'), patient=patient)
            s.is_active = request.data.get('is_active', not s.is_active)
            s.save()
            return Response({'message': 'Share link status updated', 'is_active': s.is_active})
        except HealthSummaryShare.DoesNotExist:
            return Response({'error': 'Link not found'}, status=404)
    
    def delete(self, request):
        patient, err = _get_patient_or_403(request)
        if err: return err
        try:
            s = HealthSummaryShare.objects.get(share_token=request.data.get('share_token'), patient=patient)
            s.delete()
            return Response({'message': 'Share link deleted'})
        except HealthSummaryShare.DoesNotExist:
            return Response({'error': 'Link not found'}, status=404)

from .symptom_checker import SymptomCheckerService


symptom_checker_service = SymptomCheckerService()

class SymptomCheckView(views.APIView):
    """
    Symptom checker view using datasets from 'chating system'.
    Predicts disease and suggests specialist.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = SymptomCheckSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        text = serializer.validated_data.get('text', '')
        manual = serializer.validated_data.get('manual_symptoms', [])
        
        patient = getattr(request.user, 'patient_profile', None)
        result = symptom_checker_service.check_symptoms(text, manual_symptoms=manual, patient=patient)
        
        if 'error' in result:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
            
        return Response(result)

class SymptomListView(views.APIView):
    """Get list of all standard symptoms for frontend selection."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        symptom_checker_service._ensure_resources()
        symptoms = [s.replace('_', ' ').title() for s in symptom_checker_service.all_symptoms]
        return Response({
            'symptoms': symptoms,
            'raw_symptoms': [s.lower().replace(' ', '_') for s in symptoms]
        })

class AIStatusView(views.APIView):
    """Check status of AI models and their sources (HF vs Local)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.conf import settings
        return Response({
            'classifier_type': ai_service.specialist_classifier_type,
            'deep_mode_available': ai_service.distilbert_classifier is not None or ai_service.use_hf_api,
            'cloud_inference': ai_service.use_hf_api,
            'cloud_available_now': ai_service._hf_available(),
            'cloud_cooldown_seconds': max(0, int(ai_service.hf_disabled_until - timezone.now().timestamp())),
            'cloud_last_error': ai_service.hf_last_error,
            'local_fallback_mode': getattr(settings, 'AI_LOCAL_FALLBACK_MODE', 'lightweight'),
            'hugging_face': {
                'enabled': getattr(settings, 'USE_HF_MODELS', False),
                'cloud_api': getattr(settings, 'USE_HF_INFERENCE_API', False),
                'repo_id': getattr(settings, 'HF_REPO_ID', 'None'),
                'is_active': ai_service.use_hf_api or 'hf' in (ai_service.specialist_classifier_type or '') or symptom_checker_service.model_source == 'hf'
            },
            'symptom_checker_loaded': symptom_checker_service.model is not None,
            'symptom_checker_source': getattr(symptom_checker_service, 'model_source', 'unknown'),
            'server_time': timezone.now()
        })

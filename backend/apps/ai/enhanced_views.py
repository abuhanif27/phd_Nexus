"""
Enhanced AI Analysis with Quick Answer and Deep Analysis modes.
"""
from rest_framework import views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from django.db.models import Q
from apps.patients.models import Patient
from apps.records.models import SymptomLog, File, LabResult, Prescription
from .serializers import SymptomAnalyzeSerializer
from .services import ai_service
import time


class EnhancedAIAnalysisView(views.APIView):
    """
    Enhanced AI Analysis with two modes:
    1. Quick Answer: Fast symptom analysis using scikit-learn
    2. Deep Analysis: Comprehensive analysis using all patient data + PyTorch
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Request body:
        {
            "symptoms": "fever, cough, headache",
            "mode": "quick" or "deep",  # default: "quick"
            "include_history": true/false  # for deep analysis
        }
        """
        symptoms = request.data.get('symptoms', '').strip()
        mode = request.data.get('mode', 'quick').lower()
        model = request.data.get('model', 'auto')
        
        if not symptoms:
            return Response({
                'error': 'Symptoms text is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Disclaimer - ALWAYS show this
        disclaimer = {
            'warning': '⚠️ MEDICAL DISCLAIMER',
            'message': 'This AI analysis is for informational purposes only. It is NOT a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or qualified health provider with any questions you may have regarding a medical condition.',
            'limitations': [
                'AI predictions may be incorrect or incomplete',
                'Medical emergencies require immediate professional care',
                'AI cannot examine you physically or run diagnostic tests',
                'Individual medical history affects diagnosis accuracy'
            ]
        }
        
        # Get patient profile if user is a patient
        patient = None
        if request.user.role == 'patient':
            try:
                patient = request.user.patient_profile
            except:
                pass
        
        if mode == 'quick':
            # Quick Answer Mode - Simple sklearn analysis
            return self._quick_analysis(symptoms, patient, disclaimer, model)
        elif mode == 'deep':
            # Deep Analysis Mode - Comprehensive with all data
            return self._deep_analysis(symptoms, patient, disclaimer, request.data.get('include_history', True), model)
        else:
            return Response({
                'error': 'Invalid mode. Use "quick" or "deep"'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    def _quick_analysis(self, symptoms, patient, disclaimer, model='auto'):
        """
        Quick Answer: Fast symptom analysis using scikit-learn model
        Takes 1-2 seconds, or uses multi-modal if images/documents available
        """
        start_time = time.time()
        
        # Check if patient has images or lab reports
        patient_images = []
        lab_reports = []
        
        if patient:
            try:
                # Get recent medical images
                from apps.records.models import MedicalImage
                patient_images = list(MedicalImage.objects.filter(
                    patient=patient
                ).order_by('-created_at')[:3])
            except:
                pass
            
            try:
                # Get recent lab reports
                from apps.records.models import LabResult
                lab_reports = list(LabResult.objects.filter(
                    patient=patient
                ).order_by('-created_at')[:3])
            except:
                pass
        
        # Use smart router for intelligent model selection
        try:
            from apps.ai.smart_model_router import get_smart_router
            router = get_smart_router()
            
            result = router.predict(
                text=symptoms,
                patient_images=patient_images,
                lab_reports=lab_reports
            )
        except Exception as e:
            # Fallback to traditional sklearn
            print(f"Smart router failed, using traditional: {e}")
            requested = model or 'sklearn'
            if requested == 'auto':
                requested = 'sklearn'
            result = ai_service.predict_specialist(symptoms, model_type=requested)
        
        # Add NLP entity extraction
        entities = ai_service.analyze_symptoms(symptoms)
        
        processing_time = round(time.time() - start_time, 2)
        
        # Save to symptom log
        if patient:
            SymptomLog.objects.create(
                patient=patient,
                text=symptoms,
                cleaned_text=entities.get('cleaned_text', symptoms),
                entities=entities.get('entities', {})
            )
        
        return Response({
            'mode': 'quick',
            'disclaimer': disclaimer,
            'analysis': {
                'symptoms_analyzed': symptoms,
                'extracted_symptoms': entities.get('entities', {}),
                'recommended_specialist': result.get('specialist'),
                'confidence': result.get('confidence'),
                'reasoning': self._generate_reasoning(entities.get('entities', {})),
                'processing_time': f"{processing_time}s"
            },
            'recommendations': [
                'Consult with recommended specialist for proper diagnosis',
                'Monitor symptoms and note any changes',
                'Seek immediate care if symptoms worsen',
                'Keep a symptom diary for your doctor'
            ],
            'next_steps': {
                'action': 'Book appointment with recommended specialist',
                'urgency': self._assess_urgency(entities.get('entities', {})),
                'preparation': [
                    'Note when symptoms started',
                    'Track symptom severity',
                    'List any triggers or patterns',
                    'Prepare list of current medications'
                ],
                'monitoring': [
                    'Track symptom changes daily',
                    'Note any worsening symptoms',
                    'Record symptom intensity (1-10 scale)',
                    'Seek immediate care if symptoms worsen'
                ]
            }
        })
    
    def _deep_analysis(self, symptoms, patient, disclaimer, include_history, model='auto'):
        """
        Deep Analysis: Comprehensive analysis using:
        - PyTorch deep learning model
        - Patient's medical history (lab reports, prescriptions, images)
        - Previous symptom logs
        - Medical knowledge base lookup
        """
        start_time = time.time()
        analysis_steps = []
        
        # Step 1: Analyze current symptoms with requested model
        analysis_steps.append({
            'step': 1,
            'action': 'Analyzing symptoms with AI model',
            'status': 'processing'
        })
        
        # For deep analysis prefer requested model; default to pytorch
        requested = model or 'pytorch'
        if requested == 'auto':
            requested = 'pytorch'
        
        # Try to predict with error handling
        try:
            pytorch_result = ai_service.predict_specialist(symptoms, model_type=requested)
        except Exception as e:
            print(f"Model prediction error: {e}")
            # Fallback to basic prediction
            pytorch_result = {
                'specialist': 'General Physician',
                'confidence': 0.6,
                'model_type': 'fallback',
                'top_predictions': []
            }
        
        # Always get entities
        try:
            entities = ai_service.analyze_symptoms(symptoms)
        except Exception:
            entities = {'entities': {}, 'cleaned_text': symptoms}
        
        analysis_steps[-1]['status'] = 'completed'
        analysis_steps[-1]['result'] = f"Primary prediction: {pytorch_result.get('specialist')}"
        
        # Step 2: Check patient's medical history (skip if not available)
        historical_data = None
        if patient and include_history:
            analysis_steps.append({
                'step': 2,
                'action': 'Reviewing patient medical history',
                'status': 'processing'
            })
            
            try:
                historical_data = self._gather_patient_history(patient, symptoms)
                analysis_steps[-1]['status'] = 'completed'
                analysis_steps[-1]['result'] = f"Found {historical_data['total_records']} relevant medical records"
            except Exception as e:
                print(f"History gathering error: {e}")
                analysis_steps[-1]['status'] = 'completed'
                analysis_steps[-1]['result'] = 'Using symptom text only (no medical history available)'
                historical_data = None
        
        # Step 3: Cross-reference with medical knowledge
        analysis_steps.append({
            'step': 3,
            'action': 'Cross-referencing with medical knowledge base',
            'status': 'processing'
        })
        
        try:
            knowledge_insights = self._lookup_medical_knowledge(
                entities.get('entities', {}),
                pytorch_result.get('specialist')
            )
        except Exception:
            knowledge_insights = {
                'related_conditions': [],
                'common_causes': [],
                'when_to_seek_emergency_care': []
            }
        
        analysis_steps[-1]['status'] = 'completed'
        analysis_steps[-1]['result'] = 'Knowledge base consultation completed'
        
        processing_time = round(time.time() - start_time, 2)
        
        # Compile comprehensive report
        comprehensive_analysis = {
            'symptoms_analyzed': symptoms,
            'extracted_entities': entities.get('entities', {}),
            'primary_recommendation': pytorch_result.get('specialist'),
            'confidence': pytorch_result.get('confidence'),
            'top_predictions': pytorch_result.get('top_predictions', []),
            'model_reasoning': self._generate_reasoning(entities.get('entities', {})),
            'historical_context': historical_data if historical_data else 'No medical history available',
            'medical_knowledge': knowledge_insights,
            'processing_time': f"{processing_time}s",
            'analysis_depth': 'comprehensive'
        }
        
        # Enhanced recommendations based on all data
        enhanced_recommendations = self._generate_enhanced_recommendations(
            pytorch_result,
            historical_data,
            knowledge_insights,
            entities.get('entities', {})
        )
        
        # Save detailed log
        if patient:
            SymptomLog.objects.create(
                patient=patient,
                text=symptoms,
                cleaned_text=entities.get('cleaned_text', symptoms),
                entities={
                    **entities.get('entities', {}),
                    'deep_analysis': True,
                    'specialist_recommendation': pytorch_result.get('specialist'),
                    'confidence': pytorch_result.get('confidence')
                }
            )
        
        return Response({
            'mode': 'deep',
            'disclaimer': disclaimer,
            'analysis': comprehensive_analysis,
            'analysis_steps': analysis_steps,
            'recommendations': enhanced_recommendations['recommendations'],
            'warnings': enhanced_recommendations['warnings'],
            'next_steps': enhanced_recommendations['next_steps'],
            'follow_up': {
                'monitor': 'Track these symptoms daily',
                'update': 'Upload lab results when available',
                'schedule': 'Book appointment within recommended timeframe'
            }
        })
    
    def _gather_patient_history(self, patient, current_symptoms):
        """Gather all relevant medical history for the patient - with safe error handling"""
        try:
            # Safely get recent symptom logs
            try:
                recent_symptoms = SymptomLog.objects.filter(patient=patient).order_by('-created_at')[:10]
            except Exception:
                recent_symptoms = []
            
            # Safely get lab results
            try:
                lab_results = LabResult.objects.filter(patient=patient).order_by('-test_date')[:5]
            except Exception:
                lab_results = []
            
            # Safely get prescriptions
            try:
                prescriptions = Prescription.objects.filter(patient=patient).order_by('-created_at')[:5]
            except Exception:
                prescriptions = []
            
            # Safely get medical files (skip if not available)
            try:
                medical_files = File.objects.filter(patient=patient).order_by('-uploaded_at')[:10]
            except Exception:
                medical_files = []
            
            return {
                'total_records': (
                    len(recent_symptoms) + 
                    len(lab_results) + 
                    len(prescriptions) + 
                    len(medical_files)
                ),
                'recent_symptoms': [
                    {
                        'date': log.created_at.strftime('%Y-%m-%d'),
                        'symptoms': log.text[:100],
                        'entities': log.entities if hasattr(log, 'entities') else {}
                    }
                    for log in recent_symptoms
                ] if recent_symptoms else [],
                'lab_results': [
                    {
                        'date': lab.test_date.strftime('%Y-%m-%d') if hasattr(lab, 'test_date') else 'N/A',
                        'test_type': getattr(lab, 'test_type', 'Unknown'),
                        'summary': 'Lab test completed'
                    }
                    for lab in lab_results
                ] if lab_results else [],
                'prescriptions': [
                    {
                        'date': rx.created_at.strftime('%Y-%m-%d'),
                        'medication': getattr(rx, 'medication_name', 'Unknown'),
                        'prescribed_by': rx.doctor.user.get_full_name() if hasattr(rx, 'doctor') and rx.doctor else 'Unknown'
                    }
                    for rx in prescriptions
                ] if prescriptions else [],
                'medical_files': [
                    {
                        'date': f.uploaded_at.strftime('%Y-%m-%d') if hasattr(f, 'uploaded_at') else 'N/A',
                        'type': getattr(f, 'kind', 'document'),
                        'filename': getattr(f, 'file_name', 'file')
                    }
                    for f in medical_files
                ] if medical_files else []
            }
        except Exception as e:
            # If everything fails, return empty but valid structure
            print(f"Warning: Could not gather patient history: {e}")
            return {
                'total_records': 0,
                'recent_symptoms': [],
                'lab_results': [],
                'prescriptions': [],
                'medical_files': []
            }
    
    def _lookup_medical_knowledge(self, entities, specialist):
        """
        Simulate medical knowledge base lookup
        In production: Use BioBERT, PubMed, medical databases
        """
        symptoms_list = entities.get('symptoms', [])
        
        # Common medical knowledge (simplified)
        knowledge = {
            'related_conditions': [],
            'common_causes': [],
            'when_to_seek_emergency_care': []
        }
        
        # Emergency symptoms
        emergency_keywords = ['chest pain', 'difficulty breathing', 'severe headache', 
                            'confusion', 'severe bleeding', 'loss of consciousness']
        
        for symptom in symptoms_list:
            symptom_lower = symptom.lower()
            if any(emergency in symptom_lower for emergency in emergency_keywords):
                knowledge['when_to_seek_emergency_care'].append(
                    f"⚠️ '{symptom}' may indicate a medical emergency - seek immediate care"
                )
        
        # Add general knowledge based on specialist
        specialist_knowledge = {
            'Cardiologist': {
                'related_conditions': ['Heart disease', 'Hypertension', 'Arrhythmia'],
                'common_causes': ['Lifestyle factors', 'Genetics', 'Age'],
            },
            'Dermatologist': {
                'related_conditions': ['Skin infections', 'Allergic reactions', 'Eczema'],
                'common_causes': ['Environmental factors', 'Allergies', 'Genetics'],
            },
            # Add more specialists...
        }
        
        if specialist in specialist_knowledge:
            knowledge.update(specialist_knowledge[specialist])
        
        return knowledge
    
    def _assess_urgency(self, entities):
        """Assess urgency level based on symptoms - handles list or dict"""
        # Handle if entities is a list of dicts (spaCy format)
        if isinstance(entities, list):
            symptoms = [e.get('text', str(e)) if isinstance(e, dict) else str(e) for e in entities]
        # Handle if entities is a dict with 'symptoms' key
        elif isinstance(entities, dict):
            symptoms = entities.get('symptoms', [])
            # If symptoms are dicts, extract text
            if symptoms and isinstance(symptoms[0], dict):
                symptoms = [s.get('text', str(s)) for s in symptoms]
        else:
            symptoms = []
        
        emergency_keywords = ['chest pain', 'difficulty breathing', 'severe', 'blood', 'unconscious']
        urgent_keywords = ['high fever', 'persistent pain', 'vomiting', 'dizziness']
        
        symptoms_text = ' '.join(str(s) for s in symptoms).lower()
        
        if any(keyword in symptoms_text for keyword in emergency_keywords):
            return 'EMERGENCY - Seek immediate medical attention'
        elif any(keyword in symptoms_text for keyword in urgent_keywords):
            return 'URGENT - Schedule appointment within 24-48 hours'
        else:
            return 'ROUTINE - Schedule appointment within 1-2 weeks'
    
    def _generate_reasoning(self, entities, prediction, history, knowledge):
        """Generate human-readable reasoning for the prediction"""
        reasoning = []
        
        symptoms = entities.get('symptoms', [])
        if symptoms:
            reasoning.append(f"Identified symptoms: {', '.join(symptoms)}")
        
        reasoning.append(
            f"Deep learning model predicts: {prediction.get('specialist')} "
            f"with {prediction.get('confidence')*100:.1f}% confidence"
        )
        
        if history and history['total_records'] > 0:
            reasoning.append(
                f"Considered {history['total_records']} historical medical records"
            )
        
        if knowledge.get('when_to_seek_emergency_care'):
            reasoning.append("⚠️ Potential emergency symptoms detected")
        
        return ' | '.join(reasoning)
    
    def _generate_enhanced_recommendations(self, prediction, history, knowledge, entities):
        """Generate comprehensive recommendations"""
        recommendations = [
            f"Consult with {prediction.get('specialist')} for comprehensive evaluation",
            "Bring all relevant medical records to your appointment",
        ]
        
        warnings = []
        
        # Add emergency warnings
        if knowledge.get('when_to_seek_emergency_care'):
            warnings.extend(knowledge['when_to_seek_emergency_care'])
        
        # Add history-based recommendations
        if history and history.get('prescriptions'):
            recommendations.append(
                "Inform doctor about current medications to avoid interactions"
            )
        
        if history and history.get('lab_results'):
            recommendations.append(
                "Share recent lab results with your specialist"
            )
        
        # Next steps
        urgency = self._assess_urgency(entities)
        
        next_steps = {
            'urgency': urgency,
            'primary_action': f"Schedule appointment with {prediction.get('specialist')}",
            'preparation': [
                'List all current symptoms with onset dates',
                'Prepare list of current medications',
                'Note any allergies or previous reactions',
                'Bring medical insurance information'
            ],
            'monitoring': [
                'Track symptom severity daily (scale 1-10)',
                'Note any triggers or patterns',
                'Record temperature if experiencing fever',
                'Document any new symptoms'
            ]
        }
        
        return {
            'recommendations': recommendations,
            'warnings': warnings if warnings else ['No immediate emergency warnings'],
            'next_steps': next_steps
        }
    
    def _generate_reasoning(self, entities_data):
        """
        Generate reasoning text from entities data.
        Handles various entity formats safely.
        """
        if not entities_data:
            return 'Based on symptom pattern matching'
        
        symptoms_text = []
        
        # Handle if entities_data is a dict with 'symptoms' key (string list)
        if isinstance(entities_data, dict):
            symptoms_list = entities_data.get('symptoms', [])
            if symptoms_list:
                # If symptoms are strings
                if all(isinstance(s, str) for s in symptoms_list):
                    return f"Based on symptoms analysis: {', '.join(symptoms_list)}"
                # If symptoms are dicts with 'text' key
                elif all(isinstance(s, dict) for s in symptoms_list):
                    symptoms_text = [s.get('text', str(s)) for s in symptoms_list]
                    if symptoms_text:
                        return f"Based on symptoms analysis: {', '.join(symptoms_text)}"
        
        # Handle if entities_data is a list of dicts (spaCy entities format)
        elif isinstance(entities_data, list) and len(entities_data) > 0:
            # Check if list is not empty first
            if not entities_data:
                return 'Based on symptom pattern matching'
            
            # Extract text from entity dicts
            if isinstance(entities_data[0], dict):
                symptoms_text = [e.get('text', str(e)) for e in entities_data if isinstance(e, dict)]
                if symptoms_text:
                    return f"Based on identified entities: {', '.join(symptoms_text)}"
            # If it's a list of strings
            elif isinstance(entities_data[0], str):
                return f"Based on symptoms: {', '.join(entities_data)}"
        
        return 'Based on symptom pattern matching'


# Register the new view
enhanced_ai_analysis = EnhancedAIAnalysisView.as_view()

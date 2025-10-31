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
        Takes 1-2 seconds
        """
        start_time = time.time()
        
        # Use requested model for quick prediction (default to sklearn-like behavior)
        requested = model or 'sklearn'
        # If user selected 'auto', prefer sklearn for quick mode
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
                'reasoning': f"Based on symptoms analysis: {', '.join(entities.get('entities', {}).get('symptoms', []))}" if entities.get('entities') else 'Based on symptom pattern matching',
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
                'preparation': 'Note down: When symptoms started, severity, any triggers'
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
        
        # Step 1: Analyze current symptoms with PyTorch
        analysis_steps.append({
            'step': 1,
            'action': 'Analyzing symptoms with deep learning model',
            'status': 'processing'
        })
        
        # For deep analysis prefer requested model; default to pytorch
        requested = model or 'pytorch'
        if requested == 'auto':
            requested = 'pytorch'
        pytorch_result = ai_service.predict_specialist(symptoms, model_type=requested)
        entities = ai_service.analyze_symptoms(symptoms)
        
        analysis_steps[-1]['status'] = 'completed'
        analysis_steps[-1]['result'] = f"Primary prediction: {pytorch_result.get('specialist')}"
        
        # Step 2: Check patient's medical history
        historical_data = None
        if patient and include_history:
            analysis_steps.append({
                'step': 2,
                'action': 'Reviewing patient medical history',
                'status': 'processing'
            })
            
            historical_data = self._gather_patient_history(patient, symptoms)
            
            analysis_steps[-1]['status'] = 'completed'
            analysis_steps[-1]['result'] = f"Found {historical_data['total_records']} relevant medical records"
        
        # Step 3: Cross-reference with medical knowledge
        analysis_steps.append({
            'step': 3,
            'action': 'Cross-referencing with medical knowledge base',
            'status': 'processing'
        })
        
        # Simulate medical knowledge lookup (in real app, use BioBERT or medical database)
        knowledge_insights = self._lookup_medical_knowledge(
            entities.get('entities', {}),
            pytorch_result.get('specialist')
        )
        
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
            'model_reasoning': self._generate_reasoning(
                entities.get('entities', {}),
                pytorch_result,
                historical_data,
                knowledge_insights
            ),
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
        """Gather all relevant medical history for the patient"""
        # Get recent symptom logs
        recent_symptoms = SymptomLog.objects.filter(
            patient=patient
        ).order_by('-created_at')[:10]
        
        # Get lab results
        lab_results = LabResult.objects.filter(
            patient=patient
        ).order_by('-test_date')[:5]
        
        # Get prescriptions
        prescriptions = Prescription.objects.filter(
            patient=patient
        ).order_by('-created_at')[:5]
        
        # Get medical files (images, reports, etc.)
        medical_files = File.objects.filter(
            patient=patient
        ).order_by('-uploaded_at')[:10]
        
        return {
            'total_records': (
                recent_symptoms.count() + 
                lab_results.count() + 
                prescriptions.count() + 
                medical_files.count()
            ),
            'recent_symptoms': [
                {
                    'date': log.created_at.strftime('%Y-%m-%d'),
                    'symptoms': log.text[:100],
                    'entities': log.entities
                }
                for log in recent_symptoms
            ],
            'lab_results': [
                {
                    'date': lab.test_date.strftime('%Y-%m-%d'),
                    'test_type': lab.test_type,
                    'summary': 'Lab test completed'
                }
                for lab in lab_results
            ],
            'prescriptions': [
                {
                    'date': rx.created_at.strftime('%Y-%m-%d'),
                    'medication': rx.medication_name,
                    'prescribed_by': rx.doctor.user.get_full_name() if rx.doctor else 'Unknown'
                }
                for rx in prescriptions
            ],
            'medical_files': [
                {
                    'date': f.uploaded_at.strftime('%Y-%m-%d'),
                    'type': f.kind,
                    'filename': f.file_name
                }
                for f in medical_files
            ]
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
        """Assess urgency level based on symptoms"""
        symptoms = entities.get('symptoms', [])
        
        emergency_keywords = ['chest pain', 'difficulty breathing', 'severe', 'blood', 'unconscious']
        urgent_keywords = ['high fever', 'persistent pain', 'vomiting', 'dizziness']
        
        symptoms_text = ' '.join(symptoms).lower()
        
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


# Register the new view
enhanced_ai_analysis = EnhancedAIAnalysisView.as_view()

"""
Smart Model Router - Chooses optimal model based on available data
Uses sklearn for text-only, PyTorch for multi-modal (text + image + documents)
"""
from typing import Dict, Optional
import os


class SmartModelRouter:
    """
    Intelligent model selection based on available data:
    - Text only → Fast sklearn (5-10ms)
    - Text + Image/Documents → Advanced PyTorch multi-modal
    """
    
    def __init__(self):
        self.sklearn_model = None
        self.pytorch_model = None
        self._load_models()
    
    def _load_models(self):
        """Load both models"""
        # Load fast sklearn
        try:
            from apps.ai.sklearn_classifier_enhanced import EnhancedSklearnSpecialistClassifier
            from django.conf import settings
            
            sklearn_path = os.path.join(settings.BASE_DIR, 
                                       'ai_models/specialist_clf_sklearn_enhanced.joblib')
            labels_path = os.path.join(settings.BASE_DIR,
                                      'ai_models/specialist_clf_sklearn_enhanced_labels.joblib')
            
            if os.path.exists(sklearn_path):
                self.sklearn_model = EnhancedSklearnSpecialistClassifier.load(
                    sklearn_path, labels_path
                )
                print("✓ Loaded fast sklearn model (for text-only)")
        except Exception as e:
            print(f"Warning: Could not load sklearn model: {e}")
        
        # Load advanced PyTorch (lazy loading - only when needed)
        # Will be loaded on first multi-modal request
    
    def _load_pytorch_if_needed(self):
        """Lazy load PyTorch model"""
        if self.pytorch_model is None:
            try:
                from apps.ai.pytorch_advanced_multimodal import AdvancedPyTorchMultiModalClassifier
                from django.conf import settings
                
                model_path = os.path.join(settings.BASE_DIR,
                                         'ai_models/specialist_clf_pytorch_multimodal.pt')
                labels_path = os.path.join(settings.BASE_DIR,
                                          'ai_models/specialist_clf_pytorch_multimodal_labels.joblib')
                
                if os.path.exists(model_path):
                    self.pytorch_model = AdvancedPyTorchMultiModalClassifier.load(
                        model_path, labels_path
                    )
                    print("✓ Loaded advanced PyTorch multi-modal model")
            except Exception as e:
                print(f"Info: PyTorch multi-modal not available: {e}")
    
    def predict(self,
                text: str,
                image_path: Optional[str] = None,
                document_path: Optional[str] = None,
                patient_images: Optional[list] = None,
                lab_reports: Optional[list] = None) -> Dict:
        """
        Smart prediction routing:
        - If only text: Use fast sklearn (5-10ms)
        - If text + images/docs: Use PyTorch multi-modal (200-500ms but better)
        
        Args:
            text: Symptom description (required)
            image_path: Path to single medical image (optional)
            document_path: Path to single lab report PDF (optional)
            patient_images: List of patient image records from DB (optional)
            lab_reports: List of patient lab report records from DB (optional)
        
        Returns:
            Prediction dict with specialist, confidence, model_used, etc.
        """
        # Determine if multi-modal data is available
        has_multimodal = (
            image_path is not None or
            document_path is not None or
            (patient_images and len(patient_images) > 0) or
            (lab_reports and len(lab_reports) > 0)
        )
        
        # Route to appropriate model
        if not has_multimodal:
            # Fast path: Text-only with sklearn
            if self.sklearn_model:
                result = self.sklearn_model.predict_single(text, top_k=3)
                result['routing'] = 'fast_sklearn'
                result['reason'] = 'Text-only analysis (5-10ms)'
                return result
            else:
                return {
                    'specialist': 'General Physician',
                    'confidence': 0.5,
                    'alternatives': [],
                    'routing': 'fallback',
                    'reason': 'No model available'
                }
        else:
            # Advanced path: Multi-modal with PyTorch
            self._load_pytorch_if_needed()
            
            if self.pytorch_model:
                # Get first available image/document from DB if not directly provided
                if not image_path and patient_images and len(patient_images) > 0:
                    # Get most recent image
                    image_path = patient_images[0].file.path if hasattr(patient_images[0], 'file') else None
                
                if not document_path and lab_reports and len(lab_reports) > 0:
                    # Get most recent lab report
                    doc = lab_reports[0]
                    if hasattr(doc, 'file'):
                        document_path = doc.file.path
                    elif hasattr(doc, 'pdf_file'):
                        document_path = doc.pdf_file.path
                
                result = self.pytorch_model.predict_single(
                    text=text,
                    image_path=image_path,
                    document_path=document_path,
                    top_k=3
                )
                result['routing'] = 'advanced_pytorch_multimodal'
                result['reason'] = 'Multi-modal analysis (images/documents available)'
                return result
            else:
                # Fallback to sklearn if PyTorch not available
                if self.sklearn_model:
                    result = self.sklearn_model.predict_single(text, top_k=3)
                    result['routing'] = 'sklearn_fallback'
                    result['reason'] = 'PyTorch unavailable, using sklearn text-only'
                    result['warning'] = 'Images/documents provided but not analyzed'
                    return result
                else:
                    return {
                        'specialist': 'General Physician',
                        'confidence': 0.5,
                        'alternatives': [],
                        'routing': 'fallback',
                        'reason': 'No model available'
                    }


# Singleton instance
_router_instance = None

def get_smart_router():
    """Get or create smart router instance"""
    global _router_instance
    if _router_instance is None:
        _router_instance = SmartModelRouter()
    return _router_instance

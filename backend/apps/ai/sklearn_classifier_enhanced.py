"""
Enhanced Scikit-learn Specialist Classifier
Features: TF-IDF + Character N-grams + Ensemble + Calibrated Probabilities
"""
from typing import List, Tuple, Dict

# Zero Local Load: Heavy imports moved inside methods.

class EnhancedSklearnSpecialistClassifier:
    """
    Enhanced TF-IDF + Ensemble classifier for specialist prediction.
    """
    
    def __init__(self, 
                 max_features: int = 8000,
                 max_iter: int = 2000,
                 use_ensemble: bool = True,
                 calibrate: bool = True):
        self.max_features = max_features
        self.max_iter = max_iter
        self.use_ensemble = use_ensemble
        self.calibrate = calibrate
        self.pipeline = None
        self.label_encoder = None
    
    def build_pipeline(self, n_classes: int):
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.linear_model import LogisticRegression
        from sklearn.ensemble import VotingClassifier, RandomForestClassifier
        from sklearn.pipeline import Pipeline, FeatureUnion
        from sklearn.calibration import CalibratedClassifierCV
        
        feature_union = FeatureUnion([
            ('word_tfidf', TfidfVectorizer(max_features=self.max_features, ngram_range=(1, 3))),
            ('char_tfidf', TfidfVectorizer(max_features=self.max_features // 2, analyzer='char', ngram_range=(2, 5)))
        ])
        
        if self.use_ensemble:
            base_lr = LogisticRegression(max_iter=self.max_iter, class_weight='balanced', random_state=42)
            base_rf = RandomForestClassifier(n_estimators=100, max_depth=20, class_weight='balanced', random_state=42, n_jobs=-1)
            classifier = VotingClassifier(estimators=[('lr', base_lr), ('rf', base_rf)], voting='soft', n_jobs=-1)
        else:
            classifier = LogisticRegression(max_iter=self.max_iter, class_weight='balanced', random_state=42)
        
        if self.calibrate:
            classifier = CalibratedClassifierCV(classifier, method='sigmoid', cv=3)
        
        return Pipeline([('features', feature_union), ('classifier', classifier)])
    
    def predict_single(self, text: str, top_k: int = 3) -> Dict:
        import numpy as np
        if self.pipeline is None: raise ValueError("Not trained")
        
        proba = self.pipeline.predict_proba([text])[0]
        top_indices = np.argsort(proba)[-top_k:][::-1]
        
        alternatives = []
        for idx in top_indices[1:]:
            if proba[idx] > 0.03:
                alternatives.append({
                    'specialist': self.label_encoder.classes_[idx],
                    'confidence': float(proba[idx])
                })
        
        return {
            'specialist': self.label_encoder.classes_[top_indices[0]],
            'confidence': float(proba[top_indices[0]]),
            'alternatives': alternatives,
            'model_type': 'enhanced_sklearn'
        }
    
    @classmethod
    def load(cls, model_path: str, labels_path: str):
        import joblib
        instance = cls()
        instance.pipeline = joblib.load(model_path)
        instance.label_encoder = joblib.load(labels_path)
        return instance

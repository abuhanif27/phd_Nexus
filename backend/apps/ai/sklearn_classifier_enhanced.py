"""
Enhanced Scikit-learn Specialist Classifier
Features: TF-IDF + Character N-grams + Ensemble + Calibrated Probabilities
High accuracy, fast inference, production-ready.
"""
import numpy as np
import joblib
from pathlib import Path
from typing import List, Tuple, Dict
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import VotingClassifier, RandomForestClassifier
from sklearn.pipeline import Pipeline, FeatureUnion
from sklearn.preprocessing import LabelEncoder
from sklearn.calibration import CalibratedClassifierCV
from sklearn.model_selection import cross_val_score


class EnhancedSklearnSpecialistClassifier:
    """
    Enhanced TF-IDF + Ensemble classifier for specialist prediction.
    
    Improvements over base version:
    - Word + Character n-grams for better feature extraction
    - Ensemble of Logistic Regression + Random Forest
    - Calibrated probabilities for better confidence estimates
    - Cross-validation for robust training
    - Medical term boosting via vocabulary control
    """
    
    def __init__(self, 
                 max_features: int = 8000,
                 max_iter: int = 2000,
                 use_ensemble: bool = True,
                 calibrate: bool = True):
        """
        Initialize enhanced classifier.
        
        Args:
            max_features: Maximum vocabulary size
            max_iter: Maximum iterations for LogisticRegression
            use_ensemble: Use ensemble of multiple classifiers
            calibrate: Apply probability calibration
        """
        self.max_features = max_features
        self.max_iter = max_iter
        self.use_ensemble = use_ensemble
        self.calibrate = calibrate
        self.pipeline = None
        self.label_encoder = None
    
    def build_feature_extractor(self) -> FeatureUnion:
        """
        Build enhanced feature extraction pipeline.
        Combines word-level and character-level TF-IDF.
        """
        return FeatureUnion([
            # Word-level TF-IDF with 1-3 grams
            ('word_tfidf', TfidfVectorizer(
                max_features=self.max_features,
                ngram_range=(1, 3),
                lowercase=True,
                stop_words='english',
                min_df=2,
                max_df=0.9,
                sublinear_tf=True,  # Use log scaling
                norm='l2',
                use_idf=True
            )),
            # Character-level TF-IDF for handling typos and variations
            ('char_tfidf', TfidfVectorizer(
                max_features=self.max_features // 2,
                analyzer='char',
                ngram_range=(2, 5),
                lowercase=True,
                min_df=2,
                max_df=0.9,
                sublinear_tf=True,
                norm='l2',
                use_idf=True
            ))
        ])
    
    def build_classifier(self, n_classes: int):
        """Build enhanced classifier with ensemble and calibration."""
        if self.use_ensemble:
            # Ensemble of complementary classifiers
            base_lr = LogisticRegression(
                max_iter=self.max_iter,
                solver='lbfgs',
                class_weight='balanced',
                C=1.0,
                random_state=42
            )
            
            base_rf = RandomForestClassifier(
                n_estimators=100,
                max_depth=20,
                min_samples_split=5,
                min_samples_leaf=2,
                class_weight='balanced',
                random_state=42,
                n_jobs=-1
            )
            
            classifier = VotingClassifier(
                estimators=[
                    ('lr', base_lr),
                    ('rf', base_rf)
                ],
                voting='soft',  # Use probability averaging
                weights=[2, 1],  # Weight LR more heavily
                n_jobs=-1
            )
        else:
            # Single powerful logistic regression
            classifier = LogisticRegression(
                max_iter=self.max_iter,
                solver='lbfgs',
                class_weight='balanced',
                C=1.0,
                penalty='l2',
                random_state=42
            )
        
        # Apply probability calibration for better confidence estimates
        if self.calibrate:
            classifier = CalibratedClassifierCV(
                classifier,
                method='sigmoid',  # Platt scaling
                cv=3  # 3-fold CV for calibration
            )
        
        return classifier
    
    def build_pipeline(self, n_classes: int) -> Pipeline:
        """Build complete pipeline: features + classifier."""
        return Pipeline([
            ('features', self.build_feature_extractor()),
            ('classifier', self.build_classifier(n_classes))
        ])
    
    def train(self, X_train: List[str], y_train: np.ndarray, 
              label_encoder: LabelEncoder) -> Dict:
        """
        Train the enhanced model with cross-validation.
        
        Args:
            X_train: List of symptom texts
            y_train: Array of encoded labels
            label_encoder: LabelEncoder instance
        
        Returns:
            Training metrics including CV scores
        """
        self.label_encoder = label_encoder
        n_classes = len(label_encoder.classes_)
        
        print(f"\n{'='*70}")
        print("Training Enhanced Scikit-learn Classifier")
        print(f"{'='*70}")
        print(f"Training samples: {len(X_train)}")
        print(f"Number of classes: {n_classes}")
        print(f"Classes: {', '.join(label_encoder.classes_)}")
        print(f"Max features: {self.max_features}")
        print(f"Ensemble: {self.use_ensemble}")
        print(f"Calibration: {self.calibrate}")
        print(f"{'='*70}\n")
        
        # Build pipeline
        self.pipeline = self.build_pipeline(n_classes)
        
        # Cross-validation before final training
        print("Performing 5-fold cross-validation...")
        cv_scores = cross_val_score(
            self.pipeline, X_train, y_train, 
            cv=5, scoring='accuracy', n_jobs=-1
        )
        
        print(f"Cross-validation scores: {cv_scores}")
        print(f"Mean CV accuracy: {cv_scores.mean():.4f} (+/- {cv_scores.std() * 2:.4f})")
        
        # Train on full dataset
        print("\nTraining on full dataset...")
        self.pipeline.fit(X_train, y_train)
        
        # Calculate training accuracy
        train_acc = self.pipeline.score(X_train, y_train)
        print(f"Training accuracy: {train_acc:.4f}")
        
        return {
            'train_accuracy': train_acc,
            'cv_mean': cv_scores.mean(),
            'cv_std': cv_scores.std(),
            'cv_scores': cv_scores.tolist(),
            'n_classes': n_classes,
            'n_samples': len(X_train)
        }
    
    def predict(self, texts: List[str]) -> Tuple[np.ndarray, np.ndarray]:
        """
        Predict specialist for texts.
        
        Returns:
            predictions, probabilities
        """
        if self.pipeline is None:
            raise ValueError("Model not trained. Call train() first.")
        
        predictions = self.pipeline.predict(texts)
        probabilities = self.pipeline.predict_proba(texts)
        
        return predictions, probabilities
    
    def predict_single(self, text: str, top_k: int = 3) -> Dict:
        """
        Predict specialist for single text with enhanced confidence metrics.
        
        Returns:
            {
                'specialist': str,
                'confidence': float,
                'alternatives': [{'specialist': str, 'confidence': float}, ...],
                'entropy': float,  # Prediction uncertainty
                'top_k_sum': float  # Sum of top-k probabilities
            }
        """
        predictions, probabilities = self.predict([text])
        proba = probabilities[0]
        
        # Get top-k predictions
        top_indices = np.argsort(proba)[-top_k:][::-1]
        
        # Calculate entropy (uncertainty measure)
        # Lower entropy = more confident prediction
        epsilon = 1e-10
        entropy = -np.sum(proba * np.log(proba + epsilon))
        
        # Sum of top-k probabilities
        top_k_sum = np.sum(proba[top_indices])
        
        alternatives = []
        for idx in top_indices[1:]:
            if proba[idx] > 0.03:  # Lower threshold for showing alternatives
                alternatives.append({
                    'specialist': self.label_encoder.classes_[idx],
                    'confidence': float(proba[idx])
                })
        
        result = {
            'specialist': self.label_encoder.classes_[top_indices[0]],
            'confidence': float(proba[top_indices[0]]),
            'alternatives': alternatives,
            'entropy': float(entropy),
            'top_k_sum': float(top_k_sum),
            'model_type': 'enhanced_sklearn'
        }
        
        return result
    
    def save(self, model_path: str, labels_path: str):
        """Save model and label encoder."""
        if self.pipeline is None:
            raise ValueError("Model not trained. Call train() first.")
        
        # Save pipeline
        joblib.dump(self.pipeline, model_path)
        print(f"✓ Enhanced model saved to {model_path}")
        
        # Save label encoder
        joblib.dump(self.label_encoder, labels_path)
        print(f"✓ Label encoder saved to {labels_path}")
    
    @classmethod
    def load(cls, model_path: str, labels_path: str) -> 'EnhancedSklearnSpecialistClassifier':
        """Load trained model and label encoder."""
        instance = cls()
        instance.pipeline = joblib.load(model_path)
        instance.label_encoder = joblib.load(labels_path)
        return instance

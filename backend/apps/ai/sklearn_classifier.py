"""
Scikit-learn Specialist Classifier - TF-IDF + Logistic Regression
Lightweight, fast inference, good baseline performance.
"""
import numpy as np
import joblib
from pathlib import Path
from typing import List, Tuple, Dict
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder


class SklearnSpecialistClassifier:
    """
    TF-IDF + Logistic Regression classifier for specialist prediction.
    Fast, lightweight, no GPU needed.
    """
    
    def __init__(self, max_features: int = 5000, max_iter: int = 1000):
        self.max_features = max_features
        self.max_iter = max_iter
        self.pipeline = None
        self.label_encoder = None
    
    def build_model(self) -> Pipeline:
        """Build sklearn pipeline."""
        return Pipeline([
            ('tfidf', TfidfVectorizer(
                max_features=self.max_features,
                ngram_range=(1, 3),
                lowercase=True,
                stop_words='english',
                min_df=1,
                max_df=0.95
            )),
            ('clf', LogisticRegression(
                max_iter=self.max_iter,
                multi_class='multinomial',
                solver='lbfgs',
                class_weight='balanced',
                random_state=42
            ))
        ])
    
    def train(self, X_train: List[str], y_train: np.ndarray, 
              label_encoder: LabelEncoder) -> Dict:
        """
        Train the model.
        
        Args:
            X_train: List of symptom texts
            y_train: Array of encoded labels
            label_encoder: LabelEncoder instance
        
        Returns:
            Training metrics
        """
        self.label_encoder = label_encoder
        self.pipeline = self.build_model()
        
        print("Training scikit-learn classifier...")
        print(f"Training samples: {len(X_train)}")
        print(f"Number of classes: {len(label_encoder.classes_)}")
        print(f"Classes: {', '.join(label_encoder.classes_)}")
        
        self.pipeline.fit(X_train, y_train)
        
        # Calculate training accuracy
        train_acc = self.pipeline.score(X_train, y_train)
        
        return {
            'train_accuracy': train_acc,
            'n_classes': len(label_encoder.classes_),
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
        Predict specialist for single text with top-k alternatives.
        
        Returns:
            {
                'specialist': str,
                'confidence': float,
                'alternatives': [{'specialist': str, 'confidence': float}, ...]
            }
        """
        predictions, probabilities = self.predict([text])
        proba = probabilities[0]
        
        # Get top-k predictions
        top_indices = np.argsort(proba)[-top_k:][::-1]
        
        alternatives = []
        for idx in top_indices[1:]:
            if proba[idx] > 0.05:  # Only show if >5% confidence
                alternatives.append({
                    'specialist': self.label_encoder.classes_[idx],
                    'confidence': float(proba[idx])
                })
        
        return {
            'specialist': self.label_encoder.classes_[top_indices[0]],
            'confidence': float(proba[top_indices[0]]),
            'alternatives': alternatives
        }
    
    def save(self, model_path: str, labels_path: str):
        """Save model and label encoder."""
        if self.pipeline is None:
            raise ValueError("Model not trained. Call train() first.")
        
        # Save pipeline
        joblib.dump(self.pipeline, model_path)
        print(f"✓ Model saved to {model_path}")
        
        # Save label encoder
        joblib.dump(self.label_encoder, labels_path)
        print(f"✓ Label encoder saved to {labels_path}")
    
    @classmethod
    def load(cls, model_path: str, labels_path: str) -> 'SklearnSpecialistClassifier':
        """Load trained model and label encoder."""
        instance = cls()
        instance.pipeline = joblib.load(model_path)
        instance.label_encoder = joblib.load(labels_path)
        return instance

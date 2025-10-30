"""
Machine Learning utilities for training and inference.
"""
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Tuple, List, Dict
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder


class DataLoader:
    """Load and preprocess training data."""
    
    def __init__(self, csv_path: str, test_size: float = 0.2, random_state: int = 42):
        self.csv_path = csv_path
        self.test_size = test_size
        self.random_state = random_state
        self.label_encoder = LabelEncoder()
    
    def load_data(self) -> Tuple[List[str], List[str], List[str], List[str], LabelEncoder]:
        """
        Load data and split into train/test.
        
        Returns:
            X_train, X_test, y_train, y_test, label_encoder
        """
        df = pd.read_csv(self.csv_path)
        
        # Clean text
        df['text'] = df['text'].str.strip()
        df['label'] = df['label'].str.strip()
        
        # Encode labels
        y = self.label_encoder.fit_transform(df['label'])
        X = df['text'].tolist()
        
        # Split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, 
            test_size=self.test_size, 
            random_state=self.random_state,
            stratify=y
        )
        
        return X_train, X_test, y_train, y_test, self.label_encoder
    
    def get_class_names(self) -> List[str]:
        """Get list of specialist names."""
        df = pd.read_csv(self.csv_path)
        return sorted(df['label'].unique().tolist())


def evaluate_model(y_true: np.ndarray, y_pred: np.ndarray, class_names: List[str]) -> Dict:
    """
    Evaluate model performance.
    
    Returns:
        Dictionary with accuracy, precision, recall, f1
    """
    from sklearn.metrics import accuracy_score, precision_recall_fscore_support, classification_report
    
    accuracy = accuracy_score(y_true, y_pred)
    precision, recall, f1, _ = precision_recall_fscore_support(y_true, y_pred, average='weighted')
    
    report = classification_report(y_true, y_pred, target_names=class_names)
    
    return {
        'accuracy': accuracy,
        'precision': precision,
        'recall': recall,
        'f1': f1,
        'report': report
    }

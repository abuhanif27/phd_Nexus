"""
Django Management Command: Train Enhanced AI Models
Run with: python manage.py train_enhanced_models
"""
from django.core.management.base import BaseCommand
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, accuracy_score
from apps.ai.sklearn_classifier_enhanced import EnhancedSklearnSpecialistClassifier


class Command(BaseCommand):
    help = 'Train enhanced AI models with augmented data'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('\n' + '='*70))
        self.stdout.write(self.style.SUCCESS('ENHANCED MODEL TRAINING'))
        self.stdout.write(self.style.SUCCESS('='*70 + '\n'))

        # Load augmented data
        from django.conf import settings
        data_dir = Path(settings.BASE_DIR) / 'data'
        data_path = data_dir / 'symptoms_train_augmented.csv'
        
        if not data_path.exists():
            self.stdout.write(self.style.WARNING(f'Augmented data not found at {data_path}'))
            self.stdout.write(self.style.WARNING('Using original dataset...'))
            data_path = data_dir / 'symptoms_train.csv'
        
        self.stdout.write(f'Loading data from: {data_path}')
        df = pd.read_csv(data_path)
        
        self.stdout.write(f'\nDataset:')
        self.stdout.write(f'  Total samples: {len(df)}')
        self.stdout.write(f'  Classes: {df["label"].nunique()}')
        
        # Prepare data
        label_encoder = LabelEncoder()
        y = label_encoder.fit_transform(df['label'])
        X = df['text'].tolist()
        
        # Split
        X_train, X_temp, y_train, y_temp = train_test_split(
            X, y, test_size=0.25, random_state=42, stratify=y
        )
        X_val, X_test, y_val, y_test = train_test_split(
            X_temp, y_temp, test_size=0.6, random_state=42, stratify=y_temp
        )
        
        self.stdout.write(f'\nData splits:')
        self.stdout.write(f'  Training: {len(X_train)}')
        self.stdout.write(f'  Validation: {len(X_val)}')
        self.stdout.write(f'  Test: {len(X_test)}')
        
        # Train sklearn model
        self.stdout.write(self.style.SUCCESS('\n' + '='*70))
        self.stdout.write(self.style.SUCCESS('TRAINING ENHANCED SKLEARN MODEL'))
        self.stdout.write(self.style.SUCCESS('='*70 + '\n'))
        
        model = EnhancedSklearnSpecialistClassifier(
            max_features=8000,
            use_ensemble=True,
            calibrate=True
        )
        
        # Combine train and val
        X_train_full = X_train + X_val
        y_train_full = np.concatenate([y_train, y_val])
        
        train_metrics = model.train(X_train_full, y_train_full, label_encoder)
        
        # Evaluate on test set
        self.stdout.write(self.style.SUCCESS('\nEvaluating on test set...'))
        y_pred, y_proba = model.predict(X_test)
        test_acc = accuracy_score(y_test, y_pred)
        
        self.stdout.write(self.style.SUCCESS(f'\nTest Accuracy: {test_acc:.4f}'))
        
        # Mean confidence
        mean_conf = y_proba.max(axis=1).mean()
        self.stdout.write(f'Mean Confidence: {mean_conf:.4f}')
        
        # Confidence by correctness
        correct_mask = y_pred == y_test
        correct_conf = y_proba[correct_mask].max(axis=1).mean()
        incorrect_conf = y_proba[~correct_mask].max(axis=1).mean() if (~correct_mask).any() else 0
        
        self.stdout.write(f'Confidence (correct): {correct_conf:.4f}')
        self.stdout.write(f'Confidence (incorrect): {incorrect_conf:.4f}')
        
        # Classification report
        self.stdout.write('\nClassification Report:')
        report = classification_report(y_test, y_pred, target_names=label_encoder.classes_)
        self.stdout.write(report)
        
        # Save model
        from django.conf import settings
        model_dir = Path(settings.BASE_DIR) / 'ai_models'
        model_dir.mkdir(exist_ok=True)
        
        model_path = model_dir / 'specialist_clf_sklearn_enhanced.joblib'
        labels_path = model_dir / 'specialist_clf_sklearn_enhanced_labels.joblib'
        
        model.save(str(model_path), str(labels_path))
        
        self.stdout.write(self.style.SUCCESS('\n' + '='*70))
        self.stdout.write(self.style.SUCCESS('TRAINING COMPLETE'))
        self.stdout.write(self.style.SUCCESS('='*70))
        self.stdout.write(self.style.SUCCESS(f'\n✓ Model saved to: {model_path}'))
        self.stdout.write(self.style.SUCCESS(f'✓ Labels saved to: {labels_path}'))
        self.stdout.write(self.style.SUCCESS(f'\n✓ Test Accuracy: {test_acc:.4f}'))
        self.stdout.write(self.style.SUCCESS(f'✓ Mean Confidence: {mean_conf:.4f}\n'))

"""
Django management command to train sklearn specialist classifier.
Usage: python manage.py train_sklearn
"""
from django.core.management.base import BaseCommand
from django.conf import settings
import os

from apps.ai.ml_utils import DataLoader, evaluate_model
from apps.ai.sklearn_classifier import SklearnSpecialistClassifier


class Command(BaseCommand):
    help = 'Train scikit-learn specialist classifier (TF-IDF + Logistic Regression)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--data',
            type=str,
            default='data/symptoms_train.csv',
            help='Path to training CSV file'
        )
        parser.add_argument(
            '--output',
            type=str,
            default='ai_models/specialist_clf_sklearn.joblib',
            help='Output model path'
        )

    def handle(self, *args, **options):
        data_path = os.path.join(settings.BASE_DIR, options['data'])
        model_path = os.path.join(settings.BASE_DIR, options['output'])
        labels_path = model_path.replace('.joblib', '_labels.joblib')
        
        self.stdout.write(self.style.SUCCESS('\n' + '='*70))
        self.stdout.write(self.style.SUCCESS('Training Scikit-learn Specialist Classifier'))
        self.stdout.write(self.style.SUCCESS('='*70 + '\n'))
        
        # Load data
        self.stdout.write('Loading data...')
        loader = DataLoader(data_path, test_size=0.2, random_state=42)
        X_train, X_test, y_train, y_test, label_encoder = loader.load_data()
        
        self.stdout.write(self.style.SUCCESS(f'✓ Loaded {len(X_train)} training samples'))
        self.stdout.write(self.style.SUCCESS(f'✓ Loaded {len(X_test)} test samples'))
        self.stdout.write(self.style.SUCCESS(f'✓ Number of classes: {len(label_encoder.classes_)}'))
        
        # Train model
        self.stdout.write('\nTraining model...')
        classifier = SklearnSpecialistClassifier(max_features=5000, max_iter=1000)
        train_metrics = classifier.train(X_train, y_train, label_encoder)
        
        self.stdout.write(self.style.SUCCESS(f'✓ Training accuracy: {train_metrics["train_accuracy"]:.4f}'))
        
        # Evaluate on test set
        self.stdout.write('\nEvaluating on test set...')
        y_pred, _ = classifier.predict(X_test)
        test_metrics = evaluate_model(y_test, y_pred, label_encoder.classes_)
        
        self.stdout.write(self.style.SUCCESS(f'\n✓ Test Accuracy: {test_metrics["accuracy"]:.4f}'))
        self.stdout.write(self.style.SUCCESS(f'✓ Test Precision: {test_metrics["precision"]:.4f}'))
        self.stdout.write(self.style.SUCCESS(f'✓ Test Recall: {test_metrics["recall"]:.4f}'))
        self.stdout.write(self.style.SUCCESS(f'✓ Test F1: {test_metrics["f1"]:.4f}'))
        
        self.stdout.write('\nClassification Report:')
        self.stdout.write(test_metrics['report'])
        
        # Save model
        self.stdout.write('\nSaving model...')
        os.makedirs(os.path.dirname(model_path), exist_ok=True)
        classifier.save(model_path, labels_path)
        
        self.stdout.write(self.style.SUCCESS(f'\n✓ Model saved to: {model_path}'))
        self.stdout.write(self.style.SUCCESS(f'✓ Labels saved to: {labels_path}'))
        
        # Test predictions
        self.stdout.write('\n' + '='*70)
        self.stdout.write('Testing predictions...')
        self.stdout.write('='*70)
        
        test_cases = [
            "Chest pain with shortness of breath",
            "Severe headache with vision changes",
            "Persistent cough with fever",
            "Joint pain and swelling in knees"
        ]
        
        for text in test_cases:
            result = classifier.predict_single(text, top_k=3)
            self.stdout.write(f'\nText: "{text}"')
            self.stdout.write(self.style.SUCCESS(
                f'  → {result["specialist"]} (confidence: {result["confidence"]:.2%})'
            ))
            if result['alternatives']:
                self.stdout.write('  Alternatives:')
                for alt in result['alternatives']:
                    self.stdout.write(f'    - {alt["specialist"]}: {alt["confidence"]:.2%}')
        
        self.stdout.write('\n' + '='*70)
        self.stdout.write(self.style.SUCCESS('Training complete!'))
        self.stdout.write('='*70 + '\n')

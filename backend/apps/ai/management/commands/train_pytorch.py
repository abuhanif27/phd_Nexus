"""
Django management command to train PyTorch deep learning specialist classifier.
Usage: python manage.py train_pytorch
"""
from django.core.management.base import BaseCommand
from django.conf import settings
import os

from apps.ai.ml_utils import DataLoader, evaluate_model
from apps.ai.pytorch_classifier import PyTorchSpecialistClassifier, TRANSFORMERS_AVAILABLE


class Command(BaseCommand):
    help = 'Train PyTorch deep learning specialist classifier (DistilBERT)'

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
            default='ai_models/specialist_clf_pytorch.pt',
            help='Output model path'
        )
        parser.add_argument(
            '--epochs',
            type=int,
            default=10,
            help='Number of training epochs'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=16,
            help='Batch size'
        )
        parser.add_argument(
            '--learning-rate',
            type=float,
            default=2e-5,
            help='Learning rate'
        )

    def handle(self, *args, **options):
        if not TRANSFORMERS_AVAILABLE:
            self.stdout.write(self.style.ERROR(
                'ERROR: transformers library not installed!\n'
                'Run: pip install transformers torch'
            ))
            return
        
        data_path = os.path.join(settings.BASE_DIR, options['data'])
        model_path = os.path.join(settings.BASE_DIR, options['output'])
        labels_path = model_path.replace('.pt', '_labels.joblib')
        
        # Load data
        self.stdout.write('Loading data...')
        loader = DataLoader(data_path, test_size=0.2, random_state=42)
        X_train, X_test, y_train, y_test, label_encoder = loader.load_data()
        
        self.stdout.write(self.style.SUCCESS(f'✓ Loaded {len(X_train)} training samples'))
        self.stdout.write(self.style.SUCCESS(f'✓ Loaded {len(X_test)} test samples\n'))
        
        # Train model
        classifier = PyTorchSpecialistClassifier(
            batch_size=options['batch_size'],
            learning_rate=options['learning_rate'],
            epochs=options['epochs']
        )
        
        history = classifier.train(X_train, y_train, X_test, y_test, label_encoder)
        
        # Evaluate on test set
        self.stdout.write('\nFinal evaluation on test set...')
        y_pred, _ = classifier.predict(X_test)
        test_metrics = evaluate_model(y_test, y_pred, label_encoder.classes_)
        
        self.stdout.write(self.style.SUCCESS(f'✓ Test Accuracy: {test_metrics["accuracy"]:.4f}'))
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

"""
Django management command to train PyTorch deep learning specialist classifier (DistilBERT).
Usage: python manage.py train_pytorch
"""
from django.core.management.base import BaseCommand
from django.conf import settings
import os
import numpy as np

from apps.ai.ml_utils import DataLoader, evaluate_model
from apps.ai.distilbert_cpu_classifier import FreeDistilBERTClassifier, train_cpu_friendly, TRANSFORMERS_AVAILABLE


class Command(BaseCommand):
    help = 'Train PyTorch deep learning specialist classifier (DistilBERT)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--data',
            type=str,
            default='data/symptoms_train_augmented.csv',
            help='Path to training CSV file'
        )
        parser.add_argument(
            '--output',
            type=str,
            default='ai_models/specialist_clf_distilbert_cpu.pt',
            help='Output model path'
        )
        parser.add_argument(
            '--epochs',
            type=int,
            default=5,
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
            default=3e-5,
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
        
        # Load data
        self.stdout.write(f'Loading data from {data_path}...')
        loader = DataLoader(data_path, test_size=0.2, random_state=42)
        X_train, X_test, y_train, y_test, label_encoder = loader.load_data()
        
        self.stdout.write(self.style.SUCCESS(f'✓ Loaded {len(X_train)} training samples'))
        self.stdout.write(self.style.SUCCESS(f'✓ Loaded {len(X_test)} test samples\n'))
        
        # Split train into train and val for the training function
        from sklearn.model_selection import train_test_split
        X_t, X_v, y_t, y_v = train_test_split(
            X_train, y_train, test_size=0.1, random_state=42, stratify=y_train
        )
        
        # Train model using the free CPU-friendly implementation
        self.stdout.write(f'Starting training for {options["epochs"]} epochs...')
        
        train_cpu_friendly(
            train_texts=X_t,
            train_labels=label_encoder.inverse_transform(y_t),
            val_texts=X_v,
            val_labels=label_encoder.inverse_transform(y_v),
            save_path=model_path,
            epochs=options['epochs'],
            batch_size=options['batch_size'],
            learning_rate=options['learning_rate']
        )
        
        # Load the best model for evaluation
        classifier = FreeDistilBERTClassifier(model_path)
        
        # Evaluate on test set
        self.stdout.write('\nFinal evaluation on held-out test set...')
        y_pred = []
        for text in X_test:
            res = classifier.predict_single(text)
            y_pred.append(label_encoder.transform([res['specialist']])[0])
            
        test_metrics = evaluate_model(y_test, np.array(y_pred), label_encoder.classes_)
        
        self.stdout.write(self.style.SUCCESS(f'✓ Test Accuracy: {test_metrics["accuracy"]:.4f}'))
        self.stdout.write('\nClassification Report:')
        self.stdout.write(test_metrics['report'])
        
        # Test predictions
        self.stdout.write('\n' + '='*70)
        self.stdout.write('Testing Sample Predictions...')
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


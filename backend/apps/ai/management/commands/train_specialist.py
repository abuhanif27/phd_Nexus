"""
Management command to train specialist classifier.
"""
import os
import json
import pandas as pd
import joblib
from django.core.management.base import BaseCommand
from django.conf import settings
from sentence_transformers import SentenceTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split


class Command(BaseCommand):
    help = 'Train specialist classifier from symptoms CSV'
    
    def add_arguments(self, parser):
        parser.add_argument('--in', dest='input_file', type=str, required=True, help='Input CSV file')
        parser.add_argument('--out', dest='output_file', type=str, required=True, help='Output model file')
    
    def handle(self, *args, **options):
        input_file = options['input_file']
        output_file = options['output_file']
        
        self.stdout.write(f'Training specialist classifier from {input_file}...')
        
        # Load data
        if not os.path.exists(input_file):
            self.stdout.write(self.style.ERROR(f'Input file not found: {input_file}'))
            return
        
        df = pd.read_csv(input_file)
        self.stdout.write(f'Loaded {len(df)} samples')
        
        # Load embedding model
        self.stdout.write('Loading embedding model...')
        model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Generate embeddings
        self.stdout.write('Generating embeddings...')
        embeddings = model.encode(df['text'].tolist(), show_progress_bar=True)
        
        # Train classifier
        self.stdout.write('Training classifier...')
        X_train, X_test, y_train, y_test = train_test_split(
            embeddings, df['label'].values, test_size=0.2, random_state=42
        )
        
        clf = LogisticRegression(max_iter=1000, random_state=42)
        clf.fit(X_train, y_train)
        
        # Evaluate
        train_score = clf.score(X_train, y_train)
        test_score = clf.score(X_test, y_test)
        
        self.stdout.write(f'Train accuracy: {train_score:.3f}')
        self.stdout.write(f'Test accuracy: {test_score:.3f}')
        
        # Save model
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        joblib.dump(clf, output_file)
        
        # Save label map
        label_map = {i: label for i, label in enumerate(clf.classes_)}
        label_map_file = output_file.replace('.joblib', '_labels.json')
        with open(label_map_file, 'w') as f:
            json.dump(label_map, f, indent=2)
        
        self.stdout.write(self.style.SUCCESS(f'\nModel saved to: {output_file}'))
        self.stdout.write(self.style.SUCCESS(f'Labels saved to: {label_map_file}'))

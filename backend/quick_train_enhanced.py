#!/usr/bin/env python3
"""
Quick train script - trains just the sklearn model
No Django setup required - standalone script
"""
import os
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, '/home/hn-hanif/Desktop/phd_Nexus/backend')

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score
from apps.ai.sklearn_classifier_enhanced import EnhancedSklearnSpecialistClassifier

print('\n' + '='*70)
print('ENHANCED SKLEARN MODEL TRAINING')
print('='*70 + '\n')

# Load data
data_path = Path('/home/hn-hanif/Desktop/phd_Nexus/backend/data/symptoms_train_augmented.csv')
print(f'Loading data from: {data_path}')
df = pd.read_csv(data_path)

print(f'\nDataset: {len(df)} samples, {df["label"].nunique()} classes')

# Prepare
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

print(f'Train: {len(X_train)}, Val: {len(X_val)}, Test: {len(X_test)}')

# Train
print('\nTraining...')
model = EnhancedSklearnSpecialistClassifier(
    max_features=8000,
    use_ensemble=True,
    calibrate=True
)

X_train_full = X_train + X_val
y_train_full = np.concatenate([y_train, y_val])

model.train(X_train_full, y_train_full, label_encoder)

# Evaluate
print('\nEvaluating...')
y_pred, y_proba = model.predict(X_test)
test_acc = accuracy_score(y_test, y_pred)
mean_conf = y_proba.max(axis=1).mean()

print(f'\n✓ Test Accuracy: {test_acc:.4f}')
print(f'✓ Mean Confidence: {mean_conf:.4f}')

# Save
model_dir = Path('/home/hn-hanif/Desktop/phd_Nexus/backend/ai_models')
model_path = model_dir / 'specialist_clf_sklearn_enhanced.joblib'
labels_path = model_dir / 'specialist_clf_sklearn_enhanced_labels.joblib'

model.save(str(model_path), str(labels_path))

print(f'\n✓ Saved to: {model_path}')
print('='*70 + '\n')

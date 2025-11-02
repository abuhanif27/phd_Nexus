"""
Enhanced Model Training Script
Trains both sklearn and PyTorch models with augmented data and evaluation.
"""
import os
import sys
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, confusion_matrix

try:
    import matplotlib.pyplot as plt
    import seaborn as sns
    PLOT_AVAILABLE = True
except ImportError:
    PLOT_AVAILABLE = False
    print("Warning: matplotlib/seaborn not available, skipping plots")

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from apps.ai.sklearn_classifier_enhanced import EnhancedSklearnSpecialistClassifier
try:
    from apps.ai.pytorch_classifier_enhanced import EnhancedPyTorchSpecialistClassifier
    PYTORCH_AVAILABLE = True
except ImportError:
    PYTORCH_AVAILABLE = False
    print("Warning: PyTorch enhanced classifier not available")


def load_data(use_augmented: bool = True):
    """Load training data (augmented or original)."""
    data_dir = Path(__file__).parent.parent.parent / 'data'
    
    if use_augmented:
        csv_path = data_dir / 'symptoms_train_augmented.csv'
        if not csv_path.exists():
            print(f"Warning: Augmented data not found, using original")
            csv_path = data_dir / 'symptoms_train.csv'
    else:
        csv_path = data_dir / 'symptoms_train.csv'
    
    print(f"Loading data from: {csv_path}")
    df = pd.read_csv(csv_path)
    
    print(f"\nDataset summary:")
    print(f"Total samples: {len(df)}")
    print(f"Number of classes: {df['label'].nunique()}")
    print(f"\nClass distribution:")
    print(df['label'].value_counts())
    
    return df


def prepare_data(df, test_size=0.2, val_size=0.1):
    """Prepare train/val/test splits."""
    # Encode labels
    label_encoder = LabelEncoder()
    y = label_encoder.fit_transform(df['label'])
    X = df['text'].tolist()
    
    # Split: train/temp -> train/val/test
    X_train, X_temp, y_train, y_temp = train_test_split(
        X, y, test_size=test_size+val_size, random_state=42, stratify=y
    )
    
    # Split temp into val and test
    val_ratio = val_size / (test_size + val_size)
    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp, test_size=(1-val_ratio), random_state=42, stratify=y_temp
    )
    
    print(f"\nData splits:")
    print(f"Training: {len(X_train)} samples")
    print(f"Validation: {len(X_val)} samples")
    print(f"Test: {len(X_test)} samples")
    
    return X_train, X_val, X_test, y_train, y_val, y_test, label_encoder


def evaluate_model(model, X_test, y_test, label_encoder, model_name):
    """Evaluate model and print metrics."""
    print(f"\n{'='*70}")
    print(f"Evaluating {model_name}")
    print(f"{'='*70}")
    
    # Predict
    y_pred, y_proba = model.predict(X_test)
    
    # Overall accuracy
    accuracy = (y_pred == y_test).mean()
    print(f"\nTest Accuracy: {accuracy:.4f}")
    
    # Classification report
    print(f"\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=label_encoder.classes_))
    
    # Confusion matrix
    cm = confusion_matrix(y_test, y_pred)
    
    # Save confusion matrix plot
    if PLOT_AVAILABLE:
        plt.figure(figsize=(12, 10))
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', 
                    xticklabels=label_encoder.classes_,
                    yticklabels=label_encoder.classes_)
        plt.title(f'Confusion Matrix - {model_name}')
        plt.ylabel('True Label')
        plt.xlabel('Predicted Label')
        plt.xticks(rotation=45, ha='right')
        plt.yticks(rotation=0)
        plt.tight_layout()
        
        output_dir = Path(__file__).parent.parent.parent / 'ai_models'
        output_dir.mkdir(exist_ok=True)
        plot_path = output_dir / f'confusion_matrix_{model_name.lower().replace(" ", "_")}.png'
        plt.savefig(plot_path, dpi=300, bbox_inches='tight')
        print(f"\n✓ Confusion matrix saved to: {plot_path}")
        plt.close()
    else:
        print(f"\n✓ Confusion matrix computed (visualization skipped - matplotlib not available)")
    
    # Confidence analysis
    print(f"\nConfidence Analysis:")
    mean_confidence = y_proba.max(axis=1).mean()
    print(f"Mean prediction confidence: {mean_confidence:.4f}")
    
    # Confidence by correctness
    correct_mask = y_pred == y_test
    correct_confidence = y_proba[correct_mask].max(axis=1).mean()
    incorrect_confidence = y_proba[~correct_mask].max(axis=1).mean() if (~correct_mask).any() else 0
    
    print(f"Mean confidence (correct predictions): {correct_confidence:.4f}")
    print(f"Mean confidence (incorrect predictions): {incorrect_confidence:.4f}")
    
    return {
        'accuracy': accuracy,
        'mean_confidence': mean_confidence,
        'correct_confidence': correct_confidence,
        'incorrect_confidence': incorrect_confidence
    }


def train_sklearn_model(X_train, y_train, X_val, y_val, X_test, y_test, label_encoder):
    """Train enhanced sklearn model."""
    print(f"\n{'='*70}")
    print("TRAINING ENHANCED SKLEARN MODEL")
    print(f"{'='*70}")
    
    # Initialize and train
    model = EnhancedSklearnSpecialistClassifier(
        max_features=8000,
        use_ensemble=True,
        calibrate=True
    )
    
    # Combine train and val for sklearn (uses internal CV)
    X_train_full = X_train + X_val
    y_train_full = np.concatenate([y_train, y_val])
    
    train_metrics = model.train(X_train_full, y_train_full, label_encoder)
    
    # Evaluate
    eval_metrics = evaluate_model(model, X_test, y_test, label_encoder, "Enhanced Sklearn")
    
    # Save model
    model_dir = Path(__file__).parent.parent.parent / 'ai_models'
    model_dir.mkdir(exist_ok=True)
    
    model_path = model_dir / 'specialist_clf_sklearn_enhanced.joblib'
    labels_path = model_dir / 'specialist_clf_sklearn_enhanced_labels.joblib'
    
    model.save(str(model_path), str(labels_path))
    
    return model, {**train_metrics, **eval_metrics}


def train_pytorch_model(X_train, y_train, X_val, y_val, X_test, y_test, label_encoder):
    """Train enhanced PyTorch model."""
    if not PYTORCH_AVAILABLE:
        print("\nSkipping PyTorch model (not available)")
        return None, {}
    
    print(f"\n{'='*70}")
    print("TRAINING ENHANCED PYTORCH MODEL")
    print(f"{'='*70}")
    
    # Initialize and train
    model = EnhancedPyTorchSpecialistClassifier(
        model_name='distilbert-base-uncased',  # Fast, good baseline
        batch_size=16,
        learning_rate=2e-5,
        epochs=10,
        label_smoothing=0.1,
        early_stopping_patience=3
    )
    
    train_metrics = model.train(X_train, y_train, X_val, y_val, label_encoder)
    
    # Evaluate
    eval_metrics = evaluate_model(model, X_test, y_test, label_encoder, "Enhanced PyTorch")
    
    # Save model
    model_dir = Path(__file__).parent.parent.parent / 'ai_models'
    model_dir.mkdir(exist_ok=True)
    
    model_path = model_dir / 'specialist_clf_pytorch_enhanced.pt'
    labels_path = model_dir / 'specialist_clf_pytorch_enhanced_labels.joblib'
    
    model.save(str(model_path), str(labels_path))
    
    return model, {**train_metrics, **eval_metrics}


def compare_models(sklearn_metrics, pytorch_metrics):
    """Compare model performance."""
    print(f"\n{'='*70}")
    print("MODEL COMPARISON")
    print(f"{'='*70}\n")
    
    print(f"{'Metric':<30} {'Sklearn':<20} {'PyTorch':<20}")
    print(f"{'-'*70}")
    
    metrics_to_compare = [
        ('Test Accuracy', 'accuracy'),
        ('Mean Confidence', 'mean_confidence'),
        ('Correct Pred Confidence', 'correct_confidence'),
        ('Incorrect Pred Confidence', 'incorrect_confidence'),
    ]
    
    for metric_name, metric_key in metrics_to_compare:
        sklearn_val = sklearn_metrics.get(metric_key, 0)
        pytorch_val = pytorch_metrics.get(metric_key, 0)
        
        print(f"{metric_name:<30} {sklearn_val:<20.4f} {pytorch_val:<20.4f}")
    
    # Determine winner
    sklearn_acc = sklearn_metrics.get('accuracy', 0)
    pytorch_acc = pytorch_metrics.get('accuracy', 0)
    
    print(f"\n{'='*70}")
    if sklearn_acc > pytorch_acc:
        print("✓ Best Model: Enhanced Sklearn")
    elif pytorch_acc > sklearn_acc:
        print("✓ Best Model: Enhanced PyTorch")
    else:
        print("✓ Models tied in accuracy")
    print(f"{'='*70}")


def main():
    """Main training pipeline."""
    print(f"\n{'='*70}")
    print("ENHANCED MODEL TRAINING PIPELINE")
    print(f"{'='*70}\n")
    
    # Load data
    df = load_data(use_augmented=True)
    
    # Prepare splits
    X_train, X_val, X_test, y_train, y_val, y_test, label_encoder = prepare_data(df)
    
    # Train sklearn model
    sklearn_model, sklearn_metrics = train_sklearn_model(
        X_train, y_train, X_val, y_val, X_test, y_test, label_encoder
    )
    
    # Train PyTorch model
    pytorch_model, pytorch_metrics = train_pytorch_model(
        X_train, y_train, X_val, y_val, X_test, y_test, label_encoder
    )
    
    # Compare
    if pytorch_metrics:
        compare_models(sklearn_metrics, pytorch_metrics)
    
    print(f"\n{'='*70}")
    print("TRAINING COMPLETE")
    print(f"{'='*70}\n")
    
    print("✓ Models saved to: backend/ai_models/")
    print("✓ Confusion matrices saved to: backend/ai_models/")
    print("\nTo use these models, update services.py to load the enhanced versions.")


if __name__ == '__main__':
    main()

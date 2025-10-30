"""
PyTorch Deep Learning Specialist Classifier - DistilBERT-based
High accuracy, uses transformer architecture, GPU-friendly.
"""
import torch
import torch.nn as nn
import numpy as np
from pathlib import Path
from typing import List, Tuple, Dict, Optional
from sklearn.preprocessing import LabelEncoder
from torch.utils.data import Dataset, DataLoader
import json

try:
    from transformers import DistilBertTokenizer, DistilBertModel
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    print("Warning: transformers not installed. Run: pip install transformers torch")


class SymptomDataset(Dataset):
    """PyTorch Dataset for symptom texts."""
    
    def __init__(self, texts: List[str], labels: np.ndarray, tokenizer, max_length: int = 128):
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_length = max_length
    
    def __len__(self):
        return len(self.texts)
    
    def __getitem__(self, idx):
        text = self.texts[idx]
        label = self.labels[idx]
        
        encoding = self.tokenizer.encode_plus(
            text,
            add_special_tokens=True,
            max_length=self.max_length,
            padding='max_length',
            truncation=True,
            return_attention_mask=True,
            return_tensors='pt'
        )
        
        return {
            'input_ids': encoding['input_ids'].flatten(),
            'attention_mask': encoding['attention_mask'].flatten(),
            'label': torch.tensor(label, dtype=torch.long)
        }


class DistilBertSpecialistClassifier(nn.Module):
    """
    DistilBERT-based classifier for specialist prediction.
    Uses pre-trained DistilBERT + classification head.
    """
    
    def __init__(self, num_classes: int, dropout: float = 0.3):
        super().__init__()
        
        if not TRANSFORMERS_AVAILABLE:
            raise ImportError("transformers library not available")
        
        self.distilbert = DistilBertModel.from_pretrained('distilbert-base-uncased')
        self.dropout = nn.Dropout(dropout)
        self.classifier = nn.Linear(self.distilbert.config.hidden_size, num_classes)
    
    def forward(self, input_ids, attention_mask):
        outputs = self.distilbert(
            input_ids=input_ids,
            attention_mask=attention_mask
        )
        
        # Use [CLS] token representation
        pooled_output = outputs.last_hidden_state[:, 0, :]
        pooled_output = self.dropout(pooled_output)
        logits = self.classifier(pooled_output)
        
        return logits


class PyTorchSpecialistClassifier:
    """
    PyTorch trainer and inference wrapper for specialist classification.
    """
    
    def __init__(self, max_length: int = 128, batch_size: int = 16, 
                 learning_rate: float = 2e-5, epochs: int = 10):
        self.max_length = max_length
        self.batch_size = batch_size
        self.learning_rate = learning_rate
        self.epochs = epochs
        
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        print(f"Using device: {self.device}")
        
        self.tokenizer = None
        self.model = None
        self.label_encoder = None
    
    def build_model(self, num_classes: int):
        """Build DistilBERT model."""
        if not TRANSFORMERS_AVAILABLE:
            raise ImportError("transformers not installed")
        
        self.tokenizer = DistilBertTokenizer.from_pretrained('distilbert-base-uncased')
        self.model = DistilBertSpecialistClassifier(num_classes).to(self.device)
    
    def train(self, X_train: List[str], y_train: np.ndarray,
              X_val: List[str], y_val: np.ndarray,
              label_encoder: LabelEncoder) -> Dict:
        """
        Train the PyTorch model.
        
        Args:
            X_train: Training texts
            y_train: Training labels (encoded)
            X_val: Validation texts
            y_val: Validation labels (encoded)
            label_encoder: LabelEncoder instance
        
        Returns:
            Training history
        """
        self.label_encoder = label_encoder
        num_classes = len(label_encoder.classes_)
        
        print(f"\n{'='*60}")
        print("Training PyTorch Deep Learning Classifier")
        print(f"{'='*60}")
        print(f"Device: {self.device}")
        print(f"Training samples: {len(X_train)}")
        print(f"Validation samples: {len(X_val)}")
        print(f"Number of classes: {num_classes}")
        print(f"Classes: {', '.join(label_encoder.classes_)}")
        print(f"Epochs: {self.epochs}, Batch size: {self.batch_size}")
        print(f"Learning rate: {self.learning_rate}")
        print(f"{'='*60}\n")
        
        # Build model
        self.build_model(num_classes)
        
        # Create datasets
        train_dataset = SymptomDataset(X_train, y_train, self.tokenizer, self.max_length)
        val_dataset = SymptomDataset(X_val, y_val, self.tokenizer, self.max_length)
        
        train_loader = DataLoader(train_dataset, batch_size=self.batch_size, shuffle=True)
        val_loader = DataLoader(val_dataset, batch_size=self.batch_size)
        
        # Loss and optimizer
        criterion = nn.CrossEntropyLoss()
        optimizer = torch.optim.AdamW(self.model.parameters(), lr=self.learning_rate)
        
        # Training loop
        history = {
            'train_loss': [],
            'train_acc': [],
            'val_loss': [],
            'val_acc': []
        }
        
        best_val_acc = 0.0
        
        for epoch in range(self.epochs):
            # Training
            self.model.train()
            train_loss = 0.0
            train_correct = 0
            train_total = 0
            
            for batch in train_loader:
                input_ids = batch['input_ids'].to(self.device)
                attention_mask = batch['attention_mask'].to(self.device)
                labels = batch['label'].to(self.device)
                
                optimizer.zero_grad()
                
                logits = self.model(input_ids, attention_mask)
                loss = criterion(logits, labels)
                
                loss.backward()
                optimizer.step()
                
                train_loss += loss.item()
                _, predicted = torch.max(logits, 1)
                train_total += labels.size(0)
                train_correct += (predicted == labels).sum().item()
            
            train_loss = train_loss / len(train_loader)
            train_acc = train_correct / train_total
            
            # Validation
            self.model.eval()
            val_loss = 0.0
            val_correct = 0
            val_total = 0
            
            with torch.no_grad():
                for batch in val_loader:
                    input_ids = batch['input_ids'].to(self.device)
                    attention_mask = batch['attention_mask'].to(self.device)
                    labels = batch['label'].to(self.device)
                    
                    logits = self.model(input_ids, attention_mask)
                    loss = criterion(logits, labels)
                    
                    val_loss += loss.item()
                    _, predicted = torch.max(logits, 1)
                    val_total += labels.size(0)
                    val_correct += (predicted == labels).sum().item()
            
            val_loss = val_loss / len(val_loader)
            val_acc = val_correct / val_total
            
            history['train_loss'].append(train_loss)
            history['train_acc'].append(train_acc)
            history['val_loss'].append(val_loss)
            history['val_acc'].append(val_acc)
            
            print(f"Epoch {epoch+1}/{self.epochs} - "
                  f"Train Loss: {train_loss:.4f}, Train Acc: {train_acc:.4f} - "
                  f"Val Loss: {val_loss:.4f}, Val Acc: {val_acc:.4f}")
            
            # Save best model
            if val_acc > best_val_acc:
                best_val_acc = val_acc
                print(f"  ✓ New best validation accuracy: {val_acc:.4f}")
        
        print(f"\n{'='*60}")
        print(f"Training complete! Best validation accuracy: {best_val_acc:.4f}")
        print(f"{'='*60}\n")
        
        return history
    
    def predict(self, texts: List[str]) -> Tuple[np.ndarray, np.ndarray]:
        """
        Predict specialist for texts.
        
        Returns:
            predictions, probabilities
        """
        if self.model is None:
            raise ValueError("Model not trained")
        
        self.model.eval()
        
        dataset = SymptomDataset(
            texts, 
            np.zeros(len(texts)),  # Dummy labels
            self.tokenizer, 
            self.max_length
        )
        loader = DataLoader(dataset, batch_size=self.batch_size)
        
        all_probs = []
        all_preds = []
        
        with torch.no_grad():
            for batch in loader:
                input_ids = batch['input_ids'].to(self.device)
                attention_mask = batch['attention_mask'].to(self.device)
                
                logits = self.model(input_ids, attention_mask)
                probs = torch.softmax(logits, dim=1)
                _, preds = torch.max(logits, 1)
                
                all_probs.append(probs.cpu().numpy())
                all_preds.append(preds.cpu().numpy())
        
        predictions = np.concatenate(all_preds)
        probabilities = np.concatenate(all_probs)
        
        return predictions, probabilities
    
    def predict_single(self, text: str, top_k: int = 3) -> Dict:
        """
        Predict specialist for single text with top-k alternatives.
        """
        predictions, probabilities = self.predict([text])
        proba = probabilities[0]
        
        # Get top-k predictions
        top_indices = np.argsort(proba)[-top_k:][::-1]
        
        alternatives = []
        for idx in top_indices[1:]:
            if proba[idx] > 0.05:
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
        if self.model is None:
            raise ValueError("Model not trained")
        
        # Save model state dict
        torch.save({
            'model_state_dict': self.model.state_dict(),
            'num_classes': len(self.label_encoder.classes_),
            'max_length': self.max_length,
        }, model_path)
        print(f"✓ PyTorch model saved to {model_path}")
        
        # Save label encoder
        import joblib
        joblib.dump(self.label_encoder, labels_path)
        print(f"✓ Label encoder saved to {labels_path}")
    
    @classmethod
    def load(cls, model_path: str, labels_path: str) -> 'PyTorchSpecialistClassifier':
        """Load trained model."""
        import joblib
        
        checkpoint = torch.load(model_path, map_location='cpu')
        
        instance = cls()
        instance.label_encoder = joblib.load(labels_path)
        instance.build_model(checkpoint['num_classes'])
        instance.model.load_state_dict(checkpoint['model_state_dict'])
        instance.model.eval()
        
        return instance

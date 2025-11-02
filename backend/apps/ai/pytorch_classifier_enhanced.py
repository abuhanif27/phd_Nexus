"""
Enhanced PyTorch Deep Learning Specialist Classifier
Features: BioBERT/ClinicalBERT + Multi-head Attention + Label Smoothing
State-of-the-art accuracy for medical text classification.
"""
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
from pathlib import Path
from typing import List, Tuple, Dict, Optional
from sklearn.preprocessing import LabelEncoder
from torch.utils.data import Dataset, DataLoader
import json

try:
    from transformers import (
        AutoTokenizer, AutoModel,
        get_linear_schedule_with_warmup
    )
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    print("Warning: transformers not installed. Run: pip install transformers torch")


class SymptomDataset(Dataset):
    """Enhanced PyTorch Dataset for symptom texts with label smoothing."""
    
    def __init__(self, texts: List[str], labels: np.ndarray, tokenizer, 
                 max_length: int = 128, label_smoothing: float = 0.0, n_classes: int = None):
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_length = max_length
        self.label_smoothing = label_smoothing
        self.n_classes = n_classes
    
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
        
        # Apply label smoothing if requested
        if self.label_smoothing > 0 and self.n_classes:
            smooth_label = torch.full((self.n_classes,), self.label_smoothing / (self.n_classes - 1))
            smooth_label[label] = 1.0 - self.label_smoothing
            label_tensor = smooth_label
        else:
            label_tensor = torch.tensor(label, dtype=torch.long)
        
        return {
            'input_ids': encoding['input_ids'].flatten(),
            'attention_mask': encoding['attention_mask'].flatten(),
            'label': label_tensor
        }


class MultiHeadAttentionPooling(nn.Module):
    """Multi-head attention pooling layer for better sequence representation."""
    
    def __init__(self, hidden_size: int, num_heads: int = 4):
        super().__init__()
        self.num_heads = num_heads
        self.attention = nn.MultiheadAttention(
            embed_dim=hidden_size,
            num_heads=num_heads,
            batch_first=True
        )
        self.layer_norm = nn.LayerNorm(hidden_size)
    
    def forward(self, hidden_states, attention_mask=None):
        # Use [CLS] token as query
        query = hidden_states[:, 0:1, :]  # [batch, 1, hidden]
        
        # Attention over all tokens
        attn_output, attn_weights = self.attention(
            query, hidden_states, hidden_states,
            key_padding_mask=~attention_mask.bool() if attention_mask is not None else None
        )
        
        # Residual connection + layer norm
        output = self.layer_norm(query + attn_output)
        
        return output.squeeze(1)  # [batch, hidden]


class EnhancedBERTSpecialistClassifier(nn.Module):
    """
    Enhanced BERT-based classifier with multi-head attention pooling.
    
    Architecture:
    - Pre-trained BERT (BioBERT or ClinicalBERT recommended)
    - Multi-head attention pooling
    - Dropout + Dense layers
    - Classification head
    """
    
    def __init__(self, model_name: str, num_classes: int, 
                 dropout: float = 0.3, hidden_size: int = 256):
        super().__init__()
        
        if not TRANSFORMERS_AVAILABLE:
            raise ImportError("transformers library not available")
        
        # Load pre-trained BERT model
        self.bert = AutoModel.from_pretrained(model_name)
        bert_hidden_size = self.bert.config.hidden_size
        
        # Multi-head attention pooling
        self.attention_pool = MultiHeadAttentionPooling(bert_hidden_size, num_heads=4)
        
        # Classification head with intermediate layer
        self.dropout1 = nn.Dropout(dropout)
        self.fc1 = nn.Linear(bert_hidden_size, hidden_size)
        self.activation = nn.GELU()
        self.dropout2 = nn.Dropout(dropout * 0.5)
        self.fc2 = nn.Linear(hidden_size, num_classes)
        
        # Initialize weights
        nn.init.xavier_uniform_(self.fc1.weight)
        nn.init.xavier_uniform_(self.fc2.weight)
    
    def forward(self, input_ids, attention_mask):
        # BERT encoding
        outputs = self.bert(
            input_ids=input_ids,
            attention_mask=attention_mask
        )
        
        # Multi-head attention pooling
        pooled_output = self.attention_pool(
            outputs.last_hidden_state,
            attention_mask
        )
        
        # Classification head
        x = self.dropout1(pooled_output)
        x = self.fc1(x)
        x = self.activation(x)
        x = self.dropout2(x)
        logits = self.fc2(x)
        
        return logits


class EnhancedPyTorchSpecialistClassifier:
    """
    Enhanced PyTorch trainer and inference wrapper.
    
    Improvements:
    - BioBERT/ClinicalBERT for medical domain
    - Multi-head attention pooling
    - Label smoothing regularization
    - Learning rate warmup + decay
    - Gradient clipping
    - Early stopping
    """
    
    def __init__(self, 
                 model_name: str = 'emilyalsentzer/Bio_ClinicalBERT',
                 max_length: int = 128,
                 batch_size: int = 16,
                 learning_rate: float = 2e-5,
                 epochs: int = 10,
                 label_smoothing: float = 0.1,
                 early_stopping_patience: int = 3):
        """
        Initialize enhanced PyTorch classifier.
        
        Args:
            model_name: Pre-trained model (BioBERT, ClinicalBERT, or DistilBERT)
            max_length: Maximum sequence length
            batch_size: Training batch size
            learning_rate: Learning rate
            epochs: Number of training epochs
            label_smoothing: Label smoothing factor (0.0 = no smoothing)
            early_stopping_patience: Epochs to wait before early stopping
        """
        self.model_name = model_name
        self.max_length = max_length
        self.batch_size = batch_size
        self.learning_rate = learning_rate
        self.epochs = epochs
        self.label_smoothing = label_smoothing
        self.early_stopping_patience = early_stopping_patience
        
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        print(f"Using device: {self.device}")
        
        self.tokenizer = None
        self.model = None
        self.label_encoder = None
    
    def build_model(self, num_classes: int):
        """Build enhanced BERT model."""
        if not TRANSFORMERS_AVAILABLE:
            raise ImportError("transformers not installed")
        
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = EnhancedBERTSpecialistClassifier(
                self.model_name, num_classes
            ).to(self.device)
        except Exception as e:
            print(f"Warning: Could not load {self.model_name}, falling back to DistilBERT")
            self.model_name = 'distilbert-base-uncased'
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = EnhancedBERTSpecialistClassifier(
                self.model_name, num_classes
            ).to(self.device)
    
    def train(self, X_train: List[str], y_train: np.ndarray,
              X_val: List[str], y_val: np.ndarray,
              label_encoder: LabelEncoder) -> Dict:
        """
        Train the enhanced PyTorch model.
        
        Args:
            X_train: Training texts
            y_train: Training labels (encoded)
            X_val: Validation texts
            y_val: Validation labels (encoded)
            label_encoder: LabelEncoder instance
        
        Returns:
            Training history with metrics
        """
        self.label_encoder = label_encoder
        num_classes = len(label_encoder.classes_)
        
        print(f"\n{'='*70}")
        print("Training Enhanced PyTorch Deep Learning Classifier")
        print(f"{'='*70}")
        print(f"Model: {self.model_name}")
        print(f"Device: {self.device}")
        print(f"Training samples: {len(X_train)}")
        print(f"Validation samples: {len(X_val)}")
        print(f"Number of classes: {num_classes}")
        print(f"Classes: {', '.join(label_encoder.classes_)}")
        print(f"Epochs: {self.epochs}, Batch size: {self.batch_size}")
        print(f"Learning rate: {self.learning_rate}")
        print(f"Label smoothing: {self.label_smoothing}")
        print(f"{'='*70}\n")
        
        # Build model
        self.build_model(num_classes)
        
        # Create datasets
        train_dataset = SymptomDataset(
            X_train, y_train, self.tokenizer, self.max_length,
            label_smoothing=self.label_smoothing, n_classes=num_classes
        )
        val_dataset = SymptomDataset(
            X_val, y_val, self.tokenizer, self.max_length
        )
        
        train_loader = DataLoader(train_dataset, batch_size=self.batch_size, shuffle=True)
        val_loader = DataLoader(val_dataset, batch_size=self.batch_size)
        
        # Loss and optimizer
        criterion = nn.CrossEntropyLoss() if self.label_smoothing == 0 else nn.KLDivLoss(reduction='batchmean')
        optimizer = torch.optim.AdamW(self.model.parameters(), lr=self.learning_rate, weight_decay=0.01)
        
        # Learning rate scheduler with warmup
        total_steps = len(train_loader) * self.epochs
        warmup_steps = int(0.1 * total_steps)
        scheduler = get_linear_schedule_with_warmup(
            optimizer, num_warmup_steps=warmup_steps,
            num_training_steps=total_steps
        )
        
        # Training loop
        history = {
            'train_loss': [],
            'train_acc': [],
            'val_loss': [],
            'val_acc': []
        }
        
        best_val_acc = 0.0
        patience_counter = 0
        
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
                
                # Calculate loss based on label smoothing
                if self.label_smoothing > 0:
                    log_probs = F.log_softmax(logits, dim=-1)
                    loss = criterion(log_probs, labels)
                    _, predicted = torch.max(logits, 1)
                    _, true_labels = torch.max(labels, 1)
                else:
                    loss = criterion(logits, labels)
                    _, predicted = torch.max(logits, 1)
                    true_labels = labels
                
                loss.backward()
                
                # Gradient clipping
                torch.nn.utils.clip_grad_norm_(self.model.parameters(), max_norm=1.0)
                
                optimizer.step()
                scheduler.step()
                
                train_loss += loss.item()
                train_total += true_labels.size(0)
                train_correct += (predicted == true_labels).sum().item()
            
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
                    loss = nn.CrossEntropyLoss()(logits, labels)
                    
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
            
            print(f"Epoch {epoch+1}/{self.epochs}")
            print(f"  Train Loss: {train_loss:.4f}, Train Acc: {train_acc:.4f}")
            print(f"  Val Loss: {val_loss:.4f}, Val Acc: {val_acc:.4f}")
            
            # Early stopping
            if val_acc > best_val_acc:
                best_val_acc = val_acc
                patience_counter = 0
                print(f"  ✓ New best validation accuracy: {best_val_acc:.4f}")
            else:
                patience_counter += 1
                if patience_counter >= self.early_stopping_patience:
                    print(f"\nEarly stopping triggered after {epoch+1} epochs")
                    break
        
        print(f"\nTraining completed!")
        print(f"Best validation accuracy: {best_val_acc:.4f}")
        
        return {
            **history,
            'best_val_acc': best_val_acc,
            'n_classes': num_classes,
            'n_samples': len(X_train)
        }
    
    def predict(self, texts: List[str]) -> Tuple[np.ndarray, np.ndarray]:
        """Predict specialist for texts."""
        if self.model is None:
            raise ValueError("Model not trained. Call train() first.")
        
        self.model.eval()
        
        dataset = SymptomDataset(
            texts, np.zeros(len(texts)), self.tokenizer, self.max_length
        )
        loader = DataLoader(dataset, batch_size=self.batch_size)
        
        all_predictions = []
        all_probabilities = []
        
        with torch.no_grad():
            for batch in loader:
                input_ids = batch['input_ids'].to(self.device)
                attention_mask = batch['attention_mask'].to(self.device)
                
                logits = self.model(input_ids, attention_mask)
                probabilities = F.softmax(logits, dim=-1)
                
                _, predictions = torch.max(logits, 1)
                
                all_predictions.extend(predictions.cpu().numpy())
                all_probabilities.extend(probabilities.cpu().numpy())
        
        return np.array(all_predictions), np.array(all_probabilities)
    
    def predict_single(self, text: str, top_k: int = 3) -> Dict:
        """Predict specialist for single text with confidence metrics."""
        predictions, probabilities = self.predict([text])
        proba = probabilities[0]
        
        # Get top-k predictions
        top_indices = np.argsort(proba)[-top_k:][::-1]
        
        # Calculate entropy
        epsilon = 1e-10
        entropy = -np.sum(proba * np.log(proba + epsilon))
        
        alternatives = []
        for idx in top_indices[1:]:
            if proba[idx] > 0.03:
                alternatives.append({
                    'specialist': self.label_encoder.classes_[idx],
                    'confidence': float(proba[idx])
                })
        
        return {
            'specialist': self.label_encoder.classes_[top_indices[0]],
            'confidence': float(proba[top_indices[0]]),
            'alternatives': alternatives,
            'entropy': float(entropy),
            'model_type': 'enhanced_pytorch'
        }
    
    def save(self, model_path: str, labels_path: str):
        """Save model and tokenizer."""
        if self.model is None:
            raise ValueError("Model not trained. Call train() first.")
        
        # Save model state
        torch.save({
            'model_state_dict': self.model.state_dict(),
            'model_name': self.model_name,
            'num_classes': len(self.label_encoder.classes_)
        }, model_path)
        print(f"✓ Enhanced PyTorch model saved to {model_path}")
        
        # Save label encoder
        import joblib
        joblib.dump(self.label_encoder, labels_path)
        print(f"✓ Label encoder saved to {labels_path}")
    
    @classmethod
    def load(cls, model_path: str, labels_path: str) -> 'EnhancedPyTorchSpecialistClassifier':
        """Load trained model."""
        import joblib
        
        checkpoint = torch.load(model_path, map_location='cpu')
        label_encoder = joblib.load(labels_path)
        
        instance = cls(model_name=checkpoint['model_name'])
        instance.label_encoder = label_encoder
        instance.build_model(checkpoint['num_classes'])
        instance.model.load_state_dict(checkpoint['model_state_dict'])
        instance.model.eval()
        
        return instance

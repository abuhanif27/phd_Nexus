"""
Advanced Multi-Modal PyTorch Classifier for Medical Analysis
Supports: Text (symptoms) + Images (X-rays/scans) + Documents (lab reports)
Uses: BioClinicalBERT for medical text understanding
"""
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
from pathlib import Path
from typing import List, Tuple, Dict, Optional, Union
from sklearn.preprocessing import LabelEncoder
from torch.utils.data import Dataset, DataLoader
import json
import io
from PIL import Image

try:
    from transformers import (
        AutoTokenizer, AutoModel,
        get_linear_schedule_with_warmup
    )
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    print("Warning: transformers not installed")

try:
    import torchvision.transforms as transforms
    import torchvision.models as models
    VISION_AVAILABLE = True
except ImportError:
    VISION_AVAILABLE = False
    print("Warning: torchvision not installed")

try:
    import PyPDF2
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False
    print("Warning: PyPDF2 not installed for PDF processing")


class MultiModalDataset(Dataset):
    """
    Enhanced dataset supporting multiple modalities:
    - Text: Patient symptoms (always required)
    - Images: X-rays, CT scans, etc. (optional)
    - Documents: Lab reports, PDFs (optional)
    """
    
    def __init__(self, 
                 texts: List[str], 
                 labels: np.ndarray,
                 images: Optional[List] = None,
                 documents: Optional[List[str]] = None,
                 tokenizer=None,
                 max_length: int = 256,
                 label_smoothing: float = 0.0,
                 n_classes: int = None):
        """
        Args:
            texts: Symptom descriptions
            labels: Target classes
            images: Optional list of image paths or PIL Images
            documents: Optional list of document texts (extracted from PDFs)
            tokenizer: Text tokenizer
            max_length: Max sequence length for text
            label_smoothing: Label smoothing factor
            n_classes: Number of classes
        """
        self.texts = texts
        self.labels = labels
        self.images = images
        self.documents = documents
        self.tokenizer = tokenizer
        self.max_length = max_length
        self.label_smoothing = label_smoothing
        self.n_classes = n_classes
        
        # Image preprocessing
        self.image_transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], 
                               std=[0.229, 0.224, 0.225])
        ]) if VISION_AVAILABLE else None
    
    def __len__(self):
        return len(self.texts)
    
    def __getitem__(self, idx):
        text = self.texts[idx]
        label = self.labels[idx]
        
        # Text encoding
        encoding = self.tokenizer.encode_plus(
            text,
            add_special_tokens=True,
            max_length=self.max_length,
            padding='max_length',
            truncation=True,
            return_attention_mask=True,
            return_tensors='pt'
        )
        
        # Image encoding (if available)
        image_tensor = None
        has_image = False
        if self.images and idx < len(self.images) and self.images[idx] is not None:
            try:
                if isinstance(self.images[idx], str):
                    img = Image.open(self.images[idx]).convert('RGB')
                else:
                    img = self.images[idx].convert('RGB')
                image_tensor = self.image_transform(img)
                has_image = True
            except Exception as e:
                print(f"Warning: Could not load image {idx}: {e}")
        
        if image_tensor is None:
            # Create dummy image if none available
            image_tensor = torch.zeros(3, 224, 224)
        
        # Document encoding (if available)
        doc_encoding = None
        has_doc = False
        if self.documents and idx < len(self.documents) and self.documents[idx]:
            doc_text = self.documents[idx]
            doc_encoding = self.tokenizer.encode_plus(
                doc_text,
                add_special_tokens=True,
                max_length=self.max_length,
                padding='max_length',
                truncation=True,
                return_attention_mask=True,
                return_tensors='pt'
            )
            has_doc = True
        else:
            # Create dummy document encoding
            doc_encoding = {
                'input_ids': torch.zeros_like(encoding['input_ids']),
                'attention_mask': torch.zeros_like(encoding['attention_mask'])
            }
        
        # Label encoding with smoothing
        if self.label_smoothing > 0 and self.n_classes:
            smooth_label = torch.full((self.n_classes,), 
                                     self.label_smoothing / (self.n_classes - 1))
            smooth_label[label] = 1.0 - self.label_smoothing
            label_tensor = smooth_label
        else:
            label_tensor = torch.tensor(label, dtype=torch.long)
        
        return {
            'text_input_ids': encoding['input_ids'].flatten(),
            'text_attention_mask': encoding['attention_mask'].flatten(),
            'image': image_tensor,
            'has_image': torch.tensor(has_image, dtype=torch.float),
            'doc_input_ids': doc_encoding['input_ids'].flatten(),
            'doc_attention_mask': doc_encoding['attention_mask'].flatten(),
            'has_doc': torch.tensor(has_doc, dtype=torch.float),
            'label': label_tensor
        }


class CrossModalAttention(nn.Module):
    """
    Cross-modal attention for fusing text, image, and document features.
    Allows each modality to attend to others.
    """
    
    def __init__(self, hidden_size: int, num_heads: int = 8):
        super().__init__()
        self.multihead_attn = nn.MultiheadAttention(
            embed_dim=hidden_size,
            num_heads=num_heads,
            batch_first=True
        )
        self.layer_norm = nn.LayerNorm(hidden_size)
        self.dropout = nn.Dropout(0.1)
    
    def forward(self, query, key, value, mask=None):
        """
        Args:
            query: [batch, seq_len, hidden]
            key: [batch, seq_len, hidden]
            value: [batch, seq_len, hidden]
            mask: Optional attention mask
        """
        attn_output, attn_weights = self.multihead_attn(
            query, key, value,
            key_padding_mask=mask
        )
        
        # Residual + LayerNorm
        output = self.layer_norm(query + self.dropout(attn_output))
        return output, attn_weights


class MultiModalMedicalClassifier(nn.Module):
    """
    Advanced multi-modal classifier for medical diagnosis.
    
    Architecture:
    1. BioClinicalBERT for text (symptoms + documents)
    2. ResNet50 for medical images
    3. Cross-modal attention fusion
    4. Gated fusion mechanism (uses only available modalities)
    5. Multi-head classification
    """
    
    def __init__(self, 
                 text_model_name: str,
                 num_classes: int,
                 hidden_size: int = 768,
                 dropout: float = 0.3):
        super().__init__()
        
        if not TRANSFORMERS_AVAILABLE:
            raise ImportError("transformers library required")
        
        # Text encoder (BioClinicalBERT)
        self.text_encoder = AutoModel.from_pretrained(text_model_name)
        self.text_hidden_size = self.text_encoder.config.hidden_size
        
        # Image encoder (ResNet50 pretrained on ImageNet, fine-tuned)
        if VISION_AVAILABLE:
            resnet = models.resnet50(pretrained=True)
            # Remove final classification layer
            self.image_encoder = nn.Sequential(*list(resnet.children())[:-1])
            self.image_projection = nn.Linear(2048, hidden_size)
        else:
            self.image_encoder = None
            self.image_projection = None
        
        # Document encoder (same BERT, different params)
        self.doc_encoder = AutoModel.from_pretrained(text_model_name)
        
        # Project all modalities to same dimension
        self.text_projection = nn.Linear(self.text_hidden_size, hidden_size)
        self.doc_projection = nn.Linear(self.text_hidden_size, hidden_size)
        
        # Cross-modal attention layers
        self.text_to_image_attn = CrossModalAttention(hidden_size, num_heads=8)
        self.text_to_doc_attn = CrossModalAttention(hidden_size, num_heads=8)
        self.image_to_text_attn = CrossModalAttention(hidden_size, num_heads=8)
        
        # Gated fusion (learns importance of each modality)
        self.fusion_gate = nn.Sequential(
            nn.Linear(hidden_size * 3, hidden_size),
            nn.ReLU(),
            nn.Linear(hidden_size, 3),
            nn.Softmax(dim=-1)
        )
        
        # Final classification head
        self.classifier = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(hidden_size, hidden_size // 2),
            nn.LayerNorm(hidden_size // 2),
            nn.GELU(),
            nn.Dropout(dropout * 0.5),
            nn.Linear(hidden_size // 2, num_classes)
        )
        
        # Initialize weights
        self._init_weights()
    
    def _init_weights(self):
        """Initialize projection and classifier weights"""
        for module in [self.text_projection, self.doc_projection, 
                      self.image_projection, self.classifier]:
            if module and isinstance(module, (nn.Linear, nn.Sequential)):
                for m in module.modules() if isinstance(module, nn.Sequential) else [module]:
                    if isinstance(m, nn.Linear):
                        nn.init.xavier_uniform_(m.weight)
                        if m.bias is not None:
                            nn.init.zeros_(m.bias)
    
    def forward(self, 
                text_input_ids, 
                text_attention_mask,
                images=None,
                has_image=None,
                doc_input_ids=None,
                doc_attention_mask=None,
                has_doc=None):
        """
        Forward pass with conditional modality processing.
        
        Args:
            text_input_ids: [batch, seq_len]
            text_attention_mask: [batch, seq_len]
            images: [batch, 3, 224, 224] (optional)
            has_image: [batch] boolean flags
            doc_input_ids: [batch, seq_len] (optional)
            doc_attention_mask: [batch, seq_len] (optional)
            has_doc: [batch] boolean flags
        """
        batch_size = text_input_ids.size(0)
        device = text_input_ids.device
        
        # 1. Encode text (symptoms) - always available
        text_output = self.text_encoder(
            input_ids=text_input_ids,
            attention_mask=text_attention_mask
        )
        text_features = text_output.last_hidden_state[:, 0, :]  # [CLS] token
        text_features = self.text_projection(text_features)  # [batch, hidden]
        
        # 2. Encode images (if available)
        if self.image_encoder and images is not None:
            image_features = self.image_encoder(images)
            image_features = image_features.view(batch_size, -1)
            image_features = self.image_projection(image_features)
            
            # Mask unavailable images
            if has_image is not None:
                has_image = has_image.unsqueeze(-1)  # [batch, 1]
                image_features = image_features * has_image
        else:
            image_features = torch.zeros(batch_size, text_features.size(-1), device=device)
            has_image = torch.zeros(batch_size, 1, device=device)
        
        # 3. Encode documents (if available)
        if doc_input_ids is not None:
            doc_output = self.doc_encoder(
                input_ids=doc_input_ids,
                attention_mask=doc_attention_mask
            )
            doc_features = doc_output.last_hidden_state[:, 0, :]
            doc_features = self.doc_projection(doc_features)
            
            # Mask unavailable documents
            if has_doc is not None:
                has_doc = has_doc.unsqueeze(-1)
                doc_features = doc_features * has_doc
        else:
            doc_features = torch.zeros(batch_size, text_features.size(-1), device=device)
            has_doc = torch.zeros(batch_size, 1, device=device)
        
        # 4. Cross-modal attention fusion
        # Text attends to image
        text_image_fused, _ = self.text_to_image_attn(
            text_features.unsqueeze(1),
            image_features.unsqueeze(1),
            image_features.unsqueeze(1)
        )
        text_image_fused = text_image_fused.squeeze(1)
        
        # Text attends to document
        text_doc_fused, _ = self.text_to_doc_attn(
            text_features.unsqueeze(1),
            doc_features.unsqueeze(1),
            doc_features.unsqueeze(1)
        )
        text_doc_fused = text_doc_fused.squeeze(1)
        
        # Image attends to text (if image available)
        image_text_fused, _ = self.image_to_text_attn(
            image_features.unsqueeze(1),
            text_features.unsqueeze(1),
            text_features.unsqueeze(1)
        )
        image_text_fused = image_text_fused.squeeze(1)
        
        # 5. Gated fusion - learn importance of each modality
        all_features = torch.stack([
            text_image_fused,
            text_doc_fused,
            image_text_fused
        ], dim=1)  # [batch, 3, hidden]
        
        # Compute gate weights based on available modalities
        gate_input = torch.cat([
            text_features,
            image_features,
            doc_features
        ], dim=-1)
        gate_weights = self.fusion_gate(gate_input)  # [batch, 3]
        
        # Weighted fusion
        gate_weights = gate_weights.unsqueeze(-1)  # [batch, 3, 1]
        fused_features = (all_features * gate_weights).sum(dim=1)  # [batch, hidden]
        
        # 6. Classification
        logits = self.classifier(fused_features)
        
        return logits, {
            'gate_weights': gate_weights.squeeze(-1),
            'text_features': text_features,
            'image_features': image_features,
            'doc_features': doc_features
        }


class AdvancedPyTorchMultiModalClassifier:
    """
    Advanced PyTorch classifier with multi-modal support.
    
    Features:
    - BioClinicalBERT for medical text
    - ResNet50 for medical images
    - PDF extraction for lab reports
    - Cross-modal attention fusion
    - Conditional processing (uses what's available)
    """
    
    def __init__(self,
                 model_name: str = 'emilyalsentzer/Bio_ClinicalBERT',
                 max_length: int = 256,
                 batch_size: int = 8,
                 learning_rate: float = 2e-5,
                 epochs: int = 15,
                 label_smoothing: float = 0.1,
                 early_stopping_patience: int = 5):
        """
        Initialize advanced multi-modal classifier.
        
        Args:
            model_name: BioClinicalBERT or other medical BERT model
            max_length: Maximum sequence length
            batch_size: Training batch size
            learning_rate: Learning rate
            epochs: Training epochs
            label_smoothing: Label smoothing factor
            early_stopping_patience: Early stopping patience
        """
        self.model_name = model_name
        self.max_length = max_length
        self.batch_size = batch_size
        self.learning_rate = learning_rate
        self.epochs = epochs
        self.label_smoothing = label_smoothing
        self.early_stopping_patience = early_stopping_patience
        
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        print(f"🚀 Using device: {self.device}")
        if torch.cuda.is_available():
            print(f"   GPU: {torch.cuda.get_device_name(0)}")
        
        self.tokenizer = None
        self.model = None
        self.label_encoder = None
    
    def extract_text_from_pdf(self, pdf_path: str) -> str:
        """Extract text from PDF lab report"""
        if not PDF_AVAILABLE:
            return ""
        
        try:
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text = ""
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
                return text.strip()
        except Exception as e:
            print(f"Warning: Could not extract PDF text: {e}")
            return ""
    
    def build_model(self, num_classes: int):
        """Build advanced multi-modal model"""
        if not TRANSFORMERS_AVAILABLE:
            raise ImportError("transformers not installed")
        
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = MultiModalMedicalClassifier(
                self.model_name, num_classes
            ).to(self.device)
            print(f"✓ Loaded {self.model_name} (Medical Domain Model)")
        except Exception as e:
            print(f"Warning: Could not load {self.model_name}, trying DistilBERT: {e}")
            self.model_name = 'distilbert-base-uncased'
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = MultiModalMedicalClassifier(
                self.model_name, num_classes
            ).to(self.device)
    
    def predict_single(self, 
                      text: str,
                      image_path: Optional[str] = None,
                      document_path: Optional[str] = None,
                      top_k: int = 3) -> Dict:
        """
        Predict with multi-modal input.
        
        Args:
            text: Symptom description (required)
            image_path: Path to medical image (optional)
            document_path: Path to lab report PDF (optional)
            top_k: Number of top predictions
        
        Returns:
            Prediction dict with specialist, confidence, alternatives, modality info
        """
        if self.model is None:
            raise ValueError("Model not trained")
        
        self.model.eval()
        
        # Prepare image
        image = None
        has_image = False
        if image_path:
            try:
                image = Image.open(image_path).convert('RGB')
                has_image = True
            except Exception as e:
                print(f"Warning: Could not load image: {e}")
        
        # Prepare document
        doc_text = ""
        has_doc = False
        if document_path:
            doc_text = self.extract_text_from_pdf(document_path)
            has_doc = bool(doc_text)
        
        # Create dataset
        dataset = MultiModalDataset(
            texts=[text],
            labels=np.array([0]),  # Dummy label
            images=[image] if has_image else None,
            documents=[doc_text] if has_doc else None,
            tokenizer=self.tokenizer,
            max_length=self.max_length
        )
        
        batch = dataset[0]
        
        # Move to device
        for key in batch:
            if torch.is_tensor(batch[key]):
                batch[key] = batch[key].unsqueeze(0).to(self.device)
        
        with torch.no_grad():
            logits, extra_info = self.model(
                text_input_ids=batch['text_input_ids'],
                text_attention_mask=batch['text_attention_mask'],
                images=batch['image'],
                has_image=batch['has_image'],
                doc_input_ids=batch['doc_input_ids'],
                doc_attention_mask=batch['doc_attention_mask'],
                has_doc=batch['has_doc']
            )
            
            probabilities = F.softmax(logits, dim=-1)[0].cpu().numpy()
        
        # Get top-k predictions
        top_indices = np.argsort(probabilities)[-top_k:][::-1]
        
        # Calculate entropy
        epsilon = 1e-10
        entropy = -np.sum(probabilities * np.log(probabilities + epsilon))
        
        alternatives = []
        for idx in top_indices[1:]:
            if probabilities[idx] > 0.03:
                alternatives.append({
                    'specialist': self.label_encoder.classes_[idx],
                    'confidence': float(probabilities[idx])
                })
        
        # Get gate weights (modality importance)
        gate_weights = extra_info['gate_weights'][0].cpu().numpy()
        
        return {
            'specialist': self.label_encoder.classes_[top_indices[0]],
            'confidence': float(probabilities[top_indices[0]]),
            'alternatives': alternatives,
            'entropy': float(entropy),
            'model_type': 'advanced_multimodal_pytorch',
            'modalities_used': {
                'text': True,
                'image': has_image,
                'document': has_doc
            },
            'modality_importance': {
                'text_image': float(gate_weights[0]),
                'text_document': float(gate_weights[1]),
                'image_text': float(gate_weights[2])
            }
        }
    
    # Training methods would go here...
    # (Similar to enhanced PyTorch but with multi-modal support)

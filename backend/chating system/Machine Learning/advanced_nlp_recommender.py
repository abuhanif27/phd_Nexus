import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
import tkinter as tk
from tkinter import messagebox, ttk
import sys
import re
import warnings

# Suppress minor warnings for cleaner console output
warnings.filterwarnings("ignore")

try:
    from sentence_transformers import SentenceTransformer, util
    import torch
except ImportError:
    print("CRITICAL ERROR: Missing NLP libraries.")
    print("Please install them by running: pip install sentence-transformers torch")
    sys.exit(1)

# --- 1. DATA PREPROCESSING & DIRECT SPECIALIST TRAINING ---

def setup_system():
    print("Loading datasets...")
    try:
        df_symptoms = pd.read_csv('Symptom.csv')
        df_specialist = pd.read_csv('Disease Specialist.csv')
    except FileNotFoundError as e:
        print(f"Error: Could not find dataset files. {e}")
        sys.exit(1)

    # Clean the symptom data to get the master list of 131 unique symptoms
    all_symptoms = pd.unique(df_symptoms.iloc[:, 1:].values.ravel('K'))
    all_symptoms = sorted([str(s).strip() for s in all_symptoms if str(s).lower() != 'nan' and str(s) != ''])
    
    # -------------------------------------------------------------------------
    # REQUIREMENT MET: Direct prediction for the Specialist
    # -------------------------------------------------------------------------
    # Join the datasets on Disease so each row maps directly to a Specialist
    df_merged = pd.merge(df_symptoms, df_specialist, on='Disease', how='inner')
    
    # -------------------------------------------------------------------------
    # REQUIREMENT MET: Binary (One-Hot) Encoding
    # -------------------------------------------------------------------------
    X = np.zeros((len(df_merged), len(all_symptoms)))
    y = df_merged['Specialist'].values  # Target is directly the Specialist
    
    symptom_idx = {symptom: i for i, symptom in enumerate(all_symptoms)}

    for i in range(len(df_merged)):
        row_symptoms = df_merged.iloc[i, 1:18].dropna().values
        for s in row_symptoms:
            s_clean = str(s).strip()
            if s_clean in symptom_idx:
                X[i, symptom_idx[s_clean]] = 1

    print("Training Probabilistic Random Forest directly on Specialists...")
    # Train Random Forest (Probabilistic output via predict_proba)
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X, y)
    
    classes = model.classes_

    # -------------------------------------------------------------------------
    # REQUIREMENT MET: NLP Transformer Model (BERT Architecture)
    # -------------------------------------------------------------------------
    print("Loading NLP Transformer Model...")
    # 'all-MiniLM-L6-v2' is a fast, highly accurate sentence transformer based on BERT.
    # Note: If you specifically want BioBERT, you can change this to 'pritamdeka/S-PubMedBert-MS-MARCO', 
    # but it requires downloading a much larger model. MiniLM is optimized for this exact task.
    nlp_model = SentenceTransformer('all-MiniLM-L6-v2') 
    
    # Pre-compute embeddings for all known 131 symptoms for fast semantic matching
    readable_symptoms = [s.replace('_', ' ') for s in all_symptoms]
    symptom_embeddings = nlp_model.encode(readable_symptoms, convert_to_tensor=True)

    print("System Ready!")
    return model, classes, all_symptoms, symptom_idx, nlp_model, symptom_embeddings, readable_symptoms


# Load everything globally
rf_model, rf_classes, all_symptoms, symptom_idx, nlp_model, symptom_embeddings, readable_symptoms = setup_system()


# --- 3. GUI DESIGN ---
class NLPRecommenderApp:
    def __init__(self, root):
        self.root = root
        self.root.title("NLP-Powered Medical Specialist Recommender")
        self.root.geometry("850x700")
        self.root.configure(bg='#eef2f5')

        style = ttk.Style()
        style.configure("TButton", font=("Segoe UI", 11), padding=10)
        
        # Header
        header = tk.Label(self.root, text="Describe your symptoms in your own words:", bg='#eef2f5', font=("Segoe UI", 16, "bold"), fg="#2c3e50")
        header.pack(pady=20)

        # Free Text Input (Replacing Dropdowns)
        self.text_input = tk.Text(self.root, height=5, width=70, font=("Segoe UI", 12))
        self.text_input.pack(pady=10)
        self.text_input.insert(tk.END, "E.g., I have a terrible headache, I feel like vomiting, and my skin is very itchy.")

        # Analyze Button
        self.analyze_btn = ttk.Button(self.root, text="ANALYZE & RECOMMEND", command=self.analyze_and_predict)
        self.analyze_btn.pack(pady=15)

        # NLP Extraction Result
        self.extracted_lbl = tk.Label(self.root, text="Standardized Symptoms Detected by BERT:", bg='#eef2f5', font=("Segoe UI", 10, "italic"), fg="#7f8c8d")
        self.extracted_lbl.pack()
        
        self.detected_symptoms_var = tk.StringVar()
        self.detected_lbl = tk.Label(self.root, textvariable=self.detected_symptoms_var, bg='#eef2f5', font=("Segoe UI", 11, "bold"), fg="#2980b9", wraplength=700)
        self.detected_lbl.pack(pady=5)

        # Results Frame for Probabilistic output
        self.results_frame = tk.Frame(self.root, bg='#eef2f5')
        self.results_frame.pack(pady=20, fill=tk.BOTH, expand=True)

    def analyze_and_predict(self):
        user_text = self.text_input.get("1.0", tk.END).strip()
        if not user_text or user_text.startswith("E.g.,"):
            messagebox.showwarning("Input Error", "Please enter your symptoms.")
            return

        # 1. NLP Processing: Split user text into descriptive phrases
        phrases = re.split(r',|\.|\band\b', user_text)
        phrases = [p.strip() for p in phrases if len(p.strip()) > 3]

        detected_internal_symptoms = set()
        detected_readable = []

        # 2. Semantic Search (Mapping free text to 131 standard symptoms)
        if phrases:
            phrase_embeddings = nlp_model.encode(phrases, convert_to_tensor=True)
            # Compute cosine similarities between user phrases and all 131 symptoms
            cosine_scores = util.cos_sim(phrase_embeddings, symptom_embeddings)
            
            for i in range(len(phrases)):
                best_score_idx = torch.argmax(cosine_scores[i]).item()
                best_score = cosine_scores[i][best_score_idx].item()
                
                # Threshold for semantic match
                if best_score > 0.40:
                    matched_symptom = all_symptoms[best_score_idx]
                    detected_internal_symptoms.add(matched_symptom)
                    detected_readable.append(f"{readable_symptoms[best_score_idx]}")

        if not detected_internal_symptoms:
            self.detected_symptoms_var.set("No medical symptoms matched. Please try describing them differently.")
            for widget in self.results_frame.winfo_children():
                widget.destroy()
            return

        self.detected_symptoms_var.set(", ".join(set(detected_readable)))

        # 3. Create One-Hot Input Vector
        input_vector = np.zeros(len(all_symptoms))
        for s in detected_internal_symptoms:
            input_vector[symptom_idx[s]] = 1
        
        input_vector = input_vector.reshape(1, -1)

        # -------------------------------------------------------------------------
        # REQUIREMENT MET: Probabilistic approach & Confidence Score (rf.predict_proba)
        # -------------------------------------------------------------------------
        probabilities = rf_model.predict_proba(input_vector)[0]
        
        # Get Top 3 most probable specialists
        top_3_indices = np.argsort(probabilities)[::-1][:3]
        
        for widget in self.results_frame.winfo_children():
            widget.destroy()

        tk.Label(self.results_frame, text="Top Specialist Recommendations:", bg='#eef2f5', font=("Segoe UI", 14, "bold")).pack(pady=10)

        colors = ["#27ae60", "#f39c12", "#e67e22"]
        for i, idx in enumerate(top_3_indices):
            spec = rf_classes[idx]
            prob = probabilities[idx] * 100
            
            if prob > 0:
                frame = tk.Frame(self.results_frame, bg='#eef2f5')
                frame.pack(fill=tk.X, padx=150, pady=8)
                
                lbl = tk.Label(frame, text=f"{i+1}. {spec}", bg='#eef2f5', font=("Segoe UI", 13, "bold"), fg=colors[i])
                lbl.pack(side=tk.LEFT)
                
                score_lbl = tk.Label(frame, text=f"Confidence: {prob:.1f}%", bg='#eef2f5', font=("Segoe UI", 12))
                score_lbl.pack(side=tk.RIGHT)

if __name__ == "__main__":
    root = tk.Tk()
    app = NLPRecommenderApp(root)
    root.mainloop()

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
import tkinter as tk
from tkinter import messagebox, ttk
import sys
import re
import warnings

# Suppress minor warnings
warnings.filterwarnings("ignore")

try:
    from sentence_transformers import SentenceTransformer, util
    import torch
except ImportError:
    print("CRITICAL ERROR: Missing NLP libraries.")
    print("Please install them by running: pip install sentence-transformers torch")
    sys.exit(1)

# --- 1. DATA PREPROCESSING & MODEL SETUP ---

def setup_system():
    print("Initializing Hybrid AI System...")
    try:
        df_symptoms = pd.read_csv('Symptom.csv')
        df_specialist = pd.read_csv('Disease Specialist.csv')
    except FileNotFoundError as e:
        print(f"Error: Missing CSV files. {e}")
        sys.exit(1)

    # Master list of 131 symptoms
    all_symptoms = pd.unique(df_symptoms.iloc[:, 1:].values.ravel('K'))
    all_symptoms = sorted([str(s).strip() for s in all_symptoms if str(s).lower() != 'nan' and str(s) != ''])
    
    # Merge for Direct Specialist Prediction
    df_merged = pd.merge(df_symptoms, df_specialist, on='Disease', how='inner')
    
    # One-Hot Encoding
    X = np.zeros((len(df_merged), len(all_symptoms)))
    y = df_merged['Specialist'].values
    symptom_idx = {symptom: i for i, symptom in enumerate(all_symptoms)}

    for i in range(len(df_merged)):
        row_symptoms = df_merged.iloc[i, 1:18].dropna().values
        for s in row_symptoms:
            s_clean = str(s).strip()
            if s_clean in symptom_idx:
                X[i, symptom_idx[s_clean]] = 1

    # Train Probabilistic Random Forest
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X, y)
    
    # NLP Model (BERT)
    print("Loading BERT Transformer...")
    nlp_model = SentenceTransformer('all-MiniLM-L6-v2') 
    readable_symptoms = [s.replace('_', ' ').title() for s in all_symptoms]
    symptom_embeddings = nlp_model.encode(readable_symptoms, convert_to_tensor=True)

    print("Hybrid System Ready!")
    return model, model.classes_, all_symptoms, symptom_idx, nlp_model, symptom_embeddings, readable_symptoms

# --- LOAD GLOBAL RESOURCES ---
rf_model, rf_classes, all_symptoms, symptom_idx, nlp_model, symptom_embeddings, readable_symptoms = setup_system()

# --- 2. HYBRID GUI DESIGN ---

class HybridApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Hybrid AI Medical Specialist Recommender")
        self.root.geometry("900x850")
        self.root.configure(bg='#f4f7f9')

        self.selected_manually = set()

        # UI Components
        self.setup_styles()
        self.create_widgets()

    def setup_styles(self):
        style = ttk.Style()
        style.theme_use('clam')
        style.configure("TFrame", background="#f4f7f9")
        style.configure("Header.TLabel", font=("Segoe UI", 18, "bold"), foreground="#2c3e50", background="#f4f7f9")
        style.configure("Sub.TLabel", font=("Segoe UI", 11, "italic"), foreground="#34495e", background="#f4f7f9")

    def create_widgets(self):
        # Header
        ttk.Label(self.root, text="Hybrid Medical Specialist Recommender", style="Header.TLabel").pack(pady=15)
        
        # --- SECTION 1: NLP INPUT (FREE TEXT) ---
        nlp_frame = tk.LabelFrame(self.root, text=" 1. Describe how you feel (Free Text) ", font=("Segoe UI", 11, "bold"), bg="#f4f7f9", padx=10, pady=10)
        nlp_frame.pack(fill=tk.X, padx=30, pady=5)

        ttk.Label(nlp_frame, text="Our BERT AI will extract symptoms from your description:").pack(anchor=tk.W)
        self.text_input = tk.Text(nlp_frame, height=4, width=80, font=("Segoe UI", 11))
        self.text_input.pack(pady=5)
        self.text_input.insert(tk.END, "E.g., I've had a sharp stomach pain and I feel like vomiting.")

        # --- SECTION 2: MANUAL DROPDOWN SELECTION ---
        manual_frame = tk.LabelFrame(self.root, text=" 2. Or select symptoms from the list (Clear Ideas) ", font=("Segoe UI", 11, "bold"), bg="#f4f7f9", padx=10, pady=10)
        manual_frame.pack(fill=tk.X, padx=30, pady=10)

        # Search / Filter for the Dropdown/List
        filter_frame = ttk.Frame(manual_frame)
        filter_frame.pack(fill=tk.X)
        
        ttk.Label(filter_frame, text="Search for a symptom:").pack(side=tk.LEFT)
        self.search_var = tk.StringVar()
        self.search_var.trace("w", self.filter_list)
        ttk.Entry(filter_frame, textvariable=self.search_var, width=30).pack(side=tk.LEFT, padx=10)

        # Listbox and Selected area
        list_container = ttk.Frame(manual_frame)
        list_container.pack(fill=tk.BOTH, expand=True, pady=5)

        self.symptom_lb = tk.Listbox(list_container, height=8, width=40, font=("Segoe UI", 10), selectmode=tk.MULTIPLE)
        self.symptom_lb.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        # Populate
        for s in readable_symptoms:
            self.symptom_lb.insert(tk.END, s)

        btn_ctrl = ttk.Frame(list_container)
        btn_ctrl.pack(side=tk.LEFT, padx=10)
        ttk.Button(btn_ctrl, text="Add >>", command=self.add_manual).pack(pady=2)
        ttk.Button(btn_ctrl, text="<< Remove", command=self.remove_manual).pack(pady=2)

        self.selected_lb = tk.Listbox(list_container, height=8, width=40, font=("Segoe UI", 10))
        self.selected_lb.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        # --- SECTION 3: RESULTS ---
        bottom_frame = ttk.Frame(self.root)
        bottom_frame.pack(fill=tk.BOTH, expand=True, padx=30, pady=10)

        ttk.Button(bottom_frame, text="ANALYZE & RECOMMEND", command=self.process_prediction).pack(pady=10)

        self.results_area = tk.Frame(bottom_frame, bg="#ffffff", relief=tk.RIDGE, borderwidth=1)
        self.results_area.pack(fill=tk.BOTH, expand=True, pady=10)
        
        self.res_lbl = tk.Label(self.results_area, text="Recommendation will appear here...", bg="white", font=("Segoe UI", 12))
        self.res_lbl.pack(pady=50)

    def filter_list(self, *args):
        search = self.search_var.get().lower()
        self.symptom_lb.delete(0, tk.END)
        for s in readable_symptoms:
            if search in s.lower():
                self.symptom_lb.insert(tk.END, s)

    def add_manual(self):
        for idx in self.symptom_lb.curselection():
            val = self.symptom_lb.get(idx)
            if val not in self.selected_manually:
                self.selected_manually.add(val)
                self.selected_lb.insert(tk.END, val)

    def remove_manual(self):
        for idx in reversed(self.selected_lb.curselection()):
            val = self.selected_lb.get(idx)
            self.selected_manually.remove(val)
            self.selected_lb.delete(idx)

    def process_prediction(self):
        # 1. Gather all symptoms (NLP + Manual)
        final_symptoms = set()
        
        # A. Manual
        for s in self.selected_manually:
            final_symptoms.add(s.lower().replace(' ', '_'))

        # B. NLP
        user_text = self.text_input.get("1.0", tk.END).strip()
        if user_text and not user_text.startswith("E.g.,"):
            phrases = re.split(r',|\.|\band\b', user_text)
            phrases = [p.strip() for p in phrases if len(p.strip()) > 3]
            if phrases:
                phrase_embs = nlp_model.encode(phrases, convert_to_tensor=True)
                cosine_scores = util.cos_sim(phrase_embs, symptom_embeddings)
                for i in range(len(phrases)):
                    best_idx = torch.argmax(cosine_scores[i]).item()
                    if cosine_scores[i][best_idx].item() > 0.45:
                        final_symptoms.add(all_symptoms[best_idx])

        if not final_symptoms:
            messagebox.showwarning("Incomplete Data", "Please select symptoms or describe how you feel.")
            return

        # 2. Predict Probabilities
        vector = np.zeros(len(all_symptoms))
        for s in final_symptoms:
            if s in symptom_idx:
                vector[symptom_idx[s]] = 1
        
        probs = rf_model.predict_proba(vector.reshape(1, -1))[0]
        top_indices = np.argsort(probs)[::-1][:3]

        # 3. Display Results
        for widget in self.results_area.winfo_children():
            widget.destroy()

        header = tk.Label(self.results_area, text="Final Diagnosis Summary", bg="white", font=("Segoe UI", 12, "bold"))
        header.pack(pady=10)

        # Show extracted symptoms for transparency
        extracted_txt = "Detected Symptoms: " + ", ".join([s.replace('_', ' ').title() for s in final_symptoms])
        tk.Label(self.results_area, text=extracted_txt, bg="white", font=("Segoe UI", 10), wraplength=700).pack(pady=5)

        for i, idx in enumerate(top_indices):
            if probs[idx] > 0:
                frame = tk.Frame(self.results_area, bg="white")
                frame.pack(fill=tk.X, padx=100, pady=5)
                
                color = "#27ae60" if i == 0 else "#2c3e50"
                tk.Label(frame, text=f"{i+1}. {rf_classes[idx]}", bg="white", font=("Segoe UI", 12, "bold"), fg=color).pack(side=tk.LEFT)
                tk.Label(frame, text=f"{probs[idx]*100:.1f}% Match", bg="white", font=("Segoe UI", 11), fg="#7f8c8d").pack(side=tk.RIGHT)

if __name__ == "__main__":
    root = tk.Tk()
    app = HybridApp(root)
    root.mainloop()

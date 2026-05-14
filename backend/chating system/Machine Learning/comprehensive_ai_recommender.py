import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
import tkinter as tk
from tkinter import messagebox, ttk
import sys
import re
import warnings
from difflib import get_close_matches, SequenceMatcher

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
    print("Initializing Comprehensive AI System...")
    try:
        df_symptoms = pd.read_csv('Symptom.csv')
        df_specialist = pd.read_csv('Disease Specialist.csv')
        df_desc = pd.read_csv('Symptom Description.csv')
        df_prec = pd.read_csv('Symptom Precaution.csv')
        df_severity = pd.read_csv('Symptom Severity.csv')
    except FileNotFoundError as e:
        print(f"Error: Missing CSV files. {e}")
        sys.exit(1)

    # Master list of unique symptoms
    all_symptoms = pd.unique(df_symptoms.iloc[:, 1:].values.ravel('K'))
    all_symptoms = sorted([str(s).strip() for s in all_symptoms if str(s).lower() != 'nan' and str(s) != ''])
    
    # Train for Disease Prediction (not directly Specialist)
    X = np.zeros((len(df_symptoms), len(all_symptoms)))
    y = df_symptoms['Disease'].values
    symptom_idx = {symptom: i for i, symptom in enumerate(all_symptoms)}

    for i in range(len(df_symptoms)):
        row_symptoms = df_symptoms.iloc[i, 1:18].dropna().values
        for s in row_symptoms:
            s_clean = str(s).strip()
            if s_clean in symptom_idx:
                X[i, symptom_idx[s_clean]] = 1

    # Train Probabilistic Random Forest
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X, y)
    
    # Pre-map data for fast lookup
    disease_info = {}
    for disease in df_symptoms['Disease'].unique():
        spec = df_specialist[df_specialist['Disease'] == disease]['Specialist'].values
        desc = df_desc[df_desc['Disease'] == disease]['Description'].values
        prec = df_prec[df_prec['Disease'] == disease].iloc[:, 1:].values.flatten()
        
        disease_info[disease] = {
            'specialist': spec[0] if len(spec) > 0 else "General Physician",
            'description': desc[0] if len(desc) > 0 else "No description available.",
            'precautions': [p for p in prec if pd.notna(p)]
        }

    # Severity lookup
    severity_map = dict(zip(df_severity['Symptom'], df_severity['weight']))

    # NLP Model (BioBERT)
    print("Loading BioBERT Transformer (Medical Specialized)...")
    # 'pritamdeka/S-PubMedBert-MS-MARCO' is a BioBERT model fine-tuned for sentence similarity.
    # It is significantly more accurate for medical terminology than general BERT.
    try:
        nlp_model = SentenceTransformer('pritamdeka/S-PubMedBert-MS-MARCO') 
    except Exception as e:
        print(f"Warning: Could not load BioBERT ({e}). Falling back to general model...")
        nlp_model = SentenceTransformer('all-MiniLM-L6-v2')
    
    readable_symptoms = [s.replace('_', ' ').title() for s in all_symptoms]
    symptom_embeddings = nlp_model.encode(readable_symptoms, convert_to_tensor=True)

    print("Comprehensive BioBERT System Ready!")
    return model, model.classes_, all_symptoms, symptom_idx, nlp_model, symptom_embeddings, readable_symptoms, disease_info, severity_map

# --- LOAD GLOBAL RESOURCES ---
rf_model, rf_classes, all_symptoms, symptom_idx, nlp_model, symptom_embeddings, readable_symptoms, disease_info, severity_map = setup_system()

# --- 2. GUI DESIGN ---

class ComprehensiveApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Comprehensive AI Medical Assistant")
        self.root.geometry("1000x900")
        self.root.configure(bg='#f4f7f9')

        self.selected_manually = set()

        # UI Components
        self.setup_styles()
        self.create_widgets()

    def setup_styles(self):
        style = ttk.Style()
        style.theme_use('clam')
        style.configure("TFrame", background="#f4f7f9")
        style.configure("Header.TLabel", font=("Segoe UI", 20, "bold"), foreground="#2c3e50", background="#f4f7f9")
        style.configure("Section.TLabelframe", background="#f4f7f9")
        style.configure("Section.TLabelframe.Label", font=("Segoe UI", 11, "bold"), foreground="#2980b9")

    def create_widgets(self):
        # Header
        ttk.Label(self.root, text="AI Medical Specialist & Disease Insights", style="Header.TLabel").pack(pady=20)
        
        # Main Container
        main_container = ttk.Frame(self.root)
        main_container.pack(fill=tk.BOTH, expand=True, padx=30)

        # Left Column: Input
        input_frame = ttk.Frame(main_container)
        input_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0, 15))

        # --- SECTION 1: NLP INPUT ---
        nlp_frame = ttk.LabelFrame(input_frame, text=" 1. Describe your symptoms (Free Text) ")
        nlp_frame.pack(fill=tk.X, pady=5)

        self.text_input = tk.Text(nlp_frame, height=5, width=45, font=("Segoe UI", 11))
        self.text_input.pack(padx=10, pady=10)
        self.text_input.insert(tk.END, "I have been feeling very weak, having a high fever and severe headache.")

        # --- SECTION 2: MANUAL SELECTION ---
        manual_frame = ttk.LabelFrame(input_frame, text=" 2. Select symptoms from list ")
        manual_frame.pack(fill=tk.BOTH, expand=True, pady=10)

        filter_frame = ttk.Frame(manual_frame)
        filter_frame.pack(fill=tk.X, padx=10, pady=5)
        
        ttk.Label(filter_frame, text="Search:").pack(side=tk.LEFT)
        self.search_var = tk.StringVar()
        self.search_var.trace("w", self.filter_list)
        ttk.Entry(filter_frame, textvariable=self.search_var).pack(side=tk.LEFT, padx=5, fill=tk.X, expand=True)

        list_container = ttk.Frame(manual_frame)
        list_container.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)

        self.symptom_lb = tk.Listbox(list_container, height=10, font=("Segoe UI", 10), selectmode=tk.MULTIPLE)
        self.symptom_lb.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        # Populate
        for s in readable_symptoms:
            self.symptom_lb.insert(tk.END, s)

        btn_ctrl = ttk.Frame(list_container)
        btn_ctrl.pack(side=tk.LEFT, padx=10)
        ttk.Button(btn_ctrl, text="Add >>", command=self.add_manual).pack(pady=2)
        ttk.Button(btn_ctrl, text="<< Remove", command=self.remove_manual).pack(pady=2)

        self.selected_lb = tk.Listbox(list_container, height=10, font=("Segoe UI", 10))
        self.selected_lb.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        # Right Column: Results
        self.results_frame = ttk.Frame(main_container)
        self.results_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=(15, 0))

        ttk.Button(input_frame, text="ANALYZE & RECOMMEND", command=self.process_prediction).pack(pady=20, fill=tk.X)

        # Results Canvas with Scrollbar
        self.canvas = tk.Canvas(self.results_frame, bg="#ffffff", highlightthickness=0)
        self.scrollbar = ttk.Scrollbar(self.results_frame, orient="vertical", command=self.canvas.yview)
        self.scrollable_results = ttk.Frame(self.canvas)

        self.scrollable_results.bind(
            "<Configure>",
            lambda e: self.canvas.configure(scrollregion=self.canvas.bbox("all"))
        )

        self.canvas.create_window((0, 0), window=self.scrollable_results, anchor="nw")
        self.canvas.configure(yscrollcommand=self.scrollbar.set)

        self.canvas.pack(side="left", fill="both", expand=True)
        self.scrollbar.pack(side="right", fill="y")
        
        self.placeholder_lbl = tk.Label(self.scrollable_results, text="Enter symptoms and click Analyze\nto see detailed recommendations.", bg="white", font=("Segoe UI", 12), fg="#95a5a6", justify=tk.CENTER)
        self.placeholder_lbl.pack(pady=200, padx=50)

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

    def calculate_severity(self, detected_symptoms):
        if not detected_symptoms:
            return 0, "Unknown"
        
        total_weight = 0
        count = 0
        for s in detected_symptoms:
            weight = severity_map.get(s, 0)
            if weight > 0:
                total_weight += weight
                count += 1
        
        avg_severity = total_weight / count if count > 0 else 0
        
        if avg_severity >= 5:
            return avg_severity, "URGENT: Please consult a doctor immediately."
        elif avg_severity >= 3:
            return avg_severity, "MODERATE: Schedule an appointment soon."
        else:
            return avg_severity, "MILD: Monitor your symptoms and rest."

    def process_prediction(self):
        final_symptoms = set()
        
        # A. Manual Selection (100% Certainty)
        for s in self.selected_manually:
            final_symptoms.add(s.lower().replace(' ', '_'))

        # B. NLP & Fuzzy Hybrid Extraction
        user_text = self.text_input.get("1.0", tk.END).strip()
        if user_text and not user_text.startswith("E.g.,"):
            # Split text into phrases
            phrases = re.split(r',|\.|\band\b', user_text)
            phrases = [p.strip() for p in phrases if len(p.strip()) > 2]
            
            if phrases:
                # 1. Semantic Check (BioBERT)
                phrase_embs = nlp_model.encode(phrases, convert_to_tensor=True)
                cosine_scores = util.cos_sim(phrase_embs, symptom_embeddings)
                
                for i, phrase in enumerate(phrases):
                    found_for_phrase = False
                    
                    # 2. Strict Semantic Match (> 0.45)
                    best_idx = torch.argmax(cosine_scores[i]).item()
                    if cosine_scores[i][best_idx].item() > 0.45:
                        final_symptoms.add(all_symptoms[best_idx])
                        found_for_phrase = True
                    
                    # 3. Fuzzy String Match (for typos/direct keywords)
                    # If BioBERT didn't find a strong match, or as a double-check
                    if not found_for_phrase:
                        # Check against all readable symptoms
                        for j, symptom_name in enumerate(readable_symptoms):
                            ratio = SequenceMatcher(None, phrase.lower(), symptom_name.lower()).ratio()
                            # 0.75 is a high threshold to avoid "messy" matches but catch typos
                            if ratio > 0.75:
                                final_symptoms.add(all_symptoms[j])
                                break

        if not final_symptoms:
            messagebox.showwarning("Incomplete Data", "Please select symptoms or describe how you feel.")
            return

        # 2. Predict Disease
        vector = np.zeros(len(all_symptoms))
        for s in final_symptoms:
            if s in symptom_idx:
                vector[symptom_idx[s]] = 1
        
        probs = rf_model.predict_proba(vector.reshape(1, -1))[0]
        top_idx = np.argmax(probs)
        predicted_disease = rf_classes[top_idx]
        confidence = probs[top_idx] * 100

        # 3. Severity Analysis
        sev_score, sev_msg = self.calculate_severity(final_symptoms)

        # 4. Display Results
        for widget in self.scrollable_results.winfo_children():
            widget.destroy()

        res_container = tk.Frame(self.scrollable_results, bg="white", padx=20, pady=20)
        res_container.pack(fill=tk.BOTH, expand=True)

        # Disease & Specialist
        tk.Label(res_container, text=predicted_disease, bg="white", font=("Segoe UI", 18, "bold"), fg="#2c3e50").pack(anchor=tk.W)
        tk.Label(res_container, text=f"Recommended Specialist: {disease_info[predicted_disease]['specialist']}", bg="white", font=("Segoe UI", 13, "bold"), fg="#27ae60").pack(anchor=tk.W, pady=(0, 10))
        
        # Confidence
        conf_color = "#27ae60" if confidence > 70 else "#f39c12"
        tk.Label(res_container, text=f"Match Confidence: {confidence:.1f}%", bg="white", font=("Segoe UI", 11), fg=conf_color).pack(anchor=tk.W)

        # Severity
        sev_color = "#e74c3c" if sev_score >= 5 else ("#f39c12" if sev_score >= 3 else "#27ae60")
        tk.Label(res_container, text=f"Severity Level: {sev_score:.1f}/7 - {sev_msg}", bg="white", font=("Segoe UI", 11, "bold"), fg=sev_color, wraplength=400, justify=tk.LEFT).pack(anchor=tk.W, pady=10)

        # Description
        desc_frame = tk.LabelFrame(res_container, text=" About the Condition ", font=("Segoe UI", 10, "bold"), bg="white")
        desc_frame.pack(fill=tk.X, pady=10)
        tk.Label(desc_frame, text=disease_info[predicted_disease]['description'], bg="white", font=("Segoe UI", 10), wraplength=400, justify=tk.LEFT, padx=10, pady=10).pack()

        # Precautions
        prec_frame = tk.LabelFrame(res_container, text=" Immediate Precautions ", font=("Segoe UI", 10, "bold"), bg="white")
        prec_frame.pack(fill=tk.X, pady=10)
        
        for i, p in enumerate(disease_info[predicted_disease]['precautions']):
            tk.Label(prec_frame, text=f"{i+1}. {p.capitalize()}", bg="white", font=("Segoe UI", 10), padx=10, pady=2).pack(anchor=tk.W)

        # Detected Symptoms (for transparency)
        symptom_txt = "Standardized Symptoms Detected: " + ", ".join([s.replace('_', ' ').title() for s in final_symptoms])
        tk.Label(res_container, text=symptom_txt, bg="white", font=("Segoe UI", 9, "italic"), fg="#7f8c8d", wraplength=400, justify=tk.LEFT).pack(anchor=tk.W, pady=20)

if __name__ == "__main__":
    root = tk.Tk()
    app = ComprehensiveApp(root)
    root.mainloop()

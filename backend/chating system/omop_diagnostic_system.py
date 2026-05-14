import pandas as pd
import numpy as np
import tkinter as tk
from tkinter import messagebox, ttk
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import re
from difflib import SequenceMatcher
import warnings

# Suppress warnings for cleaner terminal output
warnings.filterwarnings("ignore")

# =============================================================================
# 1. DATA EXTRACTION & STANDARDIZATION MODULE (OMOP-LIKE)
# =============================================================================
class OMOPDataLoader:
    """
    Handles loading of local CSV files and standardizing them into a 
    structure mimicking the OMOP Common Data Model (CDM).
    """
    def __init__(self, paths):
        self.paths = paths
        self.data = {}

    def standardize_disease(self, name):
        """Removes quotes, trailing spaces, and normalizes whitespace."""
        if not isinstance(name, str): return name
        name = name.strip().replace("'", "").replace('"', '')
        return " ".join(name.split()) 

    def load_all(self):
        try:
            print("Extracting and standardizing medical datasets...")
            self.data['condition_occurrence'] = pd.read_csv(self.paths['symptom'])
            self.data['symptom_severity'] = pd.read_csv(self.paths['severity'])
            self.data['condition_description'] = pd.read_csv(self.paths['description'])
            self.data['condition_precaution'] = pd.read_csv(self.paths['precaution'])
            self.data['specialist_mapping'] = pd.read_csv(self.paths['specialist'])
            
            # Standardize column headers (Strip & Underscore)
            for table in self.data:
                self.data[table].columns = [c.strip().replace(' ', '_') for c in self.data[table].columns]
            
            # Standardize Disease names across all tables to ensure lookup accuracy
            for table in self.data:
                if 'Disease' in self.data[table].columns:
                    self.data[table]['Disease'] = self.data[table]['Disease'].apply(self.standardize_disease)
            
            return self.data
        except Exception as e:
            print(f"CRITICAL ERROR: Failed to load data. {e}")
            return None

# =============================================================================
# 2. PREPROCESSING MODULE (DEEP LOGIC)
# =============================================================================
class MedicalPreprocessor:
    """
    Applies deep cleaning logic to symptoms and builds the feature matrix.
    """
    def __init__(self):
        self.unique_symptoms = []
        self.symptom_to_idx = {}
        self.severity_map = {}

    def clean_string(self, s):
        """Standardizes symptom strings for robust matching."""
        if not isinstance(s, str) or s.lower() in ['nan', '0', 'none', '']: return np.nan
        s = s.strip().lower().replace(' ', '_')
        s = re.sub(r'_+', '_', s) # Collapse multiple underscores
        return s

    def clean_symptoms(self, df):
        symptom_cols = [c for c in df.columns if 'Symptom' in c]
        for col in symptom_cols:
            df[col] = df[col].apply(self.clean_string)
        return df

    def create_feature_matrix(self, df, severity_df):
        symptom_cols = [c for c in df.columns if 'Symptom' in c]
        all_vals = df[symptom_cols].values.flatten()
        
        # Identify all unique symptoms across the dataset
        self.unique_symptoms = sorted(list(set([str(x) for x in all_vals if pd.notna(x)])))
        self.symptom_to_idx = {s: i for i, s in enumerate(self.unique_symptoms)}
        
        # Build symptom severity weight map
        severity_df['Symptom'] = severity_df['Symptom'].apply(self.clean_string)
        self.severity_map = dict(zip(severity_df['Symptom'], severity_df['weight']))

        # Transform to One-Hot Matrix
        X = np.zeros((len(df), len(self.unique_symptoms)))
        for i, row in df.iterrows():
            for col in symptom_cols:
                val = row[col]
                if val in self.symptom_to_idx:
                    X[i, self.symptom_to_idx[val]] = 1
        
        return pd.DataFrame(X, columns=self.unique_symptoms), df['Disease']

# =============================================================================
# 3. PLP PIPELINE (TRAINING & INFERENCE)
# =============================================================================
class PLPPipeline:
    """
    Patient-Level Prediction Pipeline.
    Encapsulates the ML model and refined symptom detection logic.
    """
    def __init__(self):
        self.model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.preprocessor = MedicalPreprocessor()
        self.is_trained = False
        self.classes = []

    def run_training(self, raw_df, severity_df):
        df_cleaned = self.preprocessor.clean_symptoms(raw_df.copy())
        X, y = self.preprocessor.create_feature_matrix(df_cleaned, severity_df.copy())
        
        print(f"Training Model on {len(X)} clinical profiles...")
        self.model.fit(X, y)
        self.classes = self.model.classes_
        self.is_trained = True
        return 1.0

    def predict(self, manual_symptoms, text_input, history="", medications=""):
        if not self.is_trained: return None
        
        final_detected = set()
        
        # 1. Manual Selections (Highest Priority)
        for s in manual_symptoms:
            cleaned = self.preprocessor.clean_string(s)
            if cleaned in self.preprocessor.symptom_to_idx:
                final_detected.add(cleaned)

        # 2. Extract from free text using robust phrase matching
        combined_text = f"{text_input} {history} {medications}".lower().replace('_', ' ')
        clean_text = re.sub(r'[^a-z\s]', ' ', combined_text)
        clean_text = re.sub(r'\s+', ' ', clean_text).strip()

        # Sort symptoms by length (longest first) to catch specific phrases before single words
        sorted_symptoms = sorted(self.preprocessor.unique_symptoms, key=len, reverse=True)
        for sym in sorted_symptoms:
            readable = sym.replace('_', ' ')
            if re.search(rf'\b{re.escape(readable)}\b', clean_text):
                final_detected.add(sym)

        # 3. Emergency Trigger Check
        emergency_keywords = ['cut', 'bleeding', 'veins', 'accident', 'wound', 'injury', 'fracture', 'broken', 'emergency', 'heart attack', 'stroke', 'unconscious']
        is_emergency = any(re.search(rf'\b{re.escape(k)}\b', clean_text) for k in emergency_keywords)

        if not final_detected:
            if is_emergency:
                return {'is_emergency': True, 'detected': [], 'disease': "EMERGENCY: ACUTE TRAUMA", 'confidence': 0}
            return None

        # Create input vector for Random Forest
        vector = np.zeros(len(self.preprocessor.unique_symptoms))
        for s in final_detected:
            vector[self.preprocessor.symptom_to_idx[s]] = 1
        
        input_df = pd.DataFrame([vector], columns=self.preprocessor.unique_symptoms)
        probs = self.model.predict_proba(input_df)[0]
        top_idx = np.argmax(probs)
        
        return {
            'disease': self.classes[top_idx],
            'confidence': probs[top_idx] * 100,
            'detected': list(final_detected),
            'is_emergency': is_emergency
        }

    def calculate_severity(self, detected_symptoms):
        if not detected_symptoms: return 0, "Minimal"
        weights = [self.preprocessor.severity_map.get(s, 0) for s in detected_symptoms]
        weights = [w for w in weights if w > 0]
        avg_sev = sum(weights) / len(weights) if weights else 0
        return avg_sev, ("URGENT" if avg_sev >= 5 else "MODERATE" if avg_sev >= 3 else "MILD")

# =============================================================================
# 4. GUI MODULE (ADVANCED TKINTER INTERFACE)
# =============================================================================
class AutocompleteText(tk.Text):
    """Text widget with suggestion popup for clinical symptoms."""
    def __init__(self, master, suggestions, **kwargs):
        super().__init__(master, **kwargs)
        self.suggestions = suggestions
        self.popup = None
        self.bind("<KeyRelease>", self._on_key_release)
        self.bind("<FocusOut>", self._hide_popup)

    def _on_key_release(self, event):
        if event.keysym in ("Up", "Down", "Return", "Escape"): return
        content = self.get("1.0", tk.INSERT)
        parts = re.split(r'[\s,]+', content)
        last_word = parts[-1].strip().lower() if parts else ""
        if len(last_word) < 2:
            self._hide_popup()
            return
        matches = [s for s in self.suggestions if last_word in s.replace('_', ' ').lower()]
        if matches: self._show_popup(matches[:10])
        else: self._hide_popup()

    def _show_popup(self, matches):
        if self.popup: self.popup.destroy()
        self.popup = tk.Listbox(self.master, font=("Segoe UI", 10), width=45)
        for m in matches: self.popup.insert(tk.END, m.replace('_', ' ').title())
        bbox = self.bbox(tk.INSERT)
        if bbox:
            x, y, _, h = bbox
            self.popup.place(x=self.winfo_x() + x, y=self.winfo_y() + y + h)
        self.popup.bind("<<ListboxSelect>>", self._on_select)

    def _on_select(self, event):
        if not self.popup: return
        selection = self.popup.get(self.popup.curselection())
        content = self.get("1.0", tk.INSERT)
        new_content = re.sub(r'[\w\s-]+$', selection + ", ", content)
        self.delete("1.0", tk.INSERT)
        self.insert("1.0", new_content)
        self._hide_popup()
        self.focus_set()

    def _hide_popup(self, event=None):
        if self.popup: self.popup.destroy()
        self.popup = None

class DiagnosticGUI:
    def __init__(self, root, pipeline, cdm_data):
        self.root = root
        self.pipeline = pipeline
        self.cdm_data = cdm_data
        self.root.title("Advanced AI Medical Diagnostic System")
        self.root.geometry("1150x950")
        self.root.configure(bg='#f0f4f7')
        self.selected_manually = set()
        self.setup_ui()

    def setup_ui(self):
        # Header
        header = tk.Frame(self.root, bg='#2c3e50', height=80)
        header.pack(fill=tk.X)
        tk.Label(header, text="MED-AI: CLINICAL DIAGNOSTIC DASHBOARD", font=("Segoe UI", 24, "bold"), fg="white", bg='#2c3e50').pack(pady=20)

        # Main Scrollable Window
        container = tk.Frame(self.root, bg="#f0f4f7")
        container.pack(fill=tk.BOTH, expand=True)
        canvas = tk.Canvas(container, bg="#f0f4f7", highlightthickness=0)
        scrollbar = ttk.Scrollbar(container, orient="vertical", command=canvas.yview)
        self.scroll_frame = tk.Frame(canvas, bg="#f0f4f7")
        self.scroll_frame.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.create_window((0, 0), window=self.scroll_frame, anchor="nw", width=1130)
        canvas.configure(yscrollcommand=scrollbar.set)
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

        # 1. Description Area
        text_frame = tk.LabelFrame(self.scroll_frame, text=" 1. CLINICAL SYMPTOMS & CHAT INPUT ", bg="white", font=("Segoe UI", 11, "bold"), fg="#2980b9", padx=15, pady=15)
        text_frame.pack(fill=tk.X, padx=30, pady=15)
        self.text_input = AutocompleteText(text_frame, suggestions=self.pipeline.preprocessor.unique_symptoms, height=5, font=("Segoe UI", 12), relief=tk.GROOVE, borderwidth=2)
        self.text_input.pack(fill=tk.X)

        # 2. Manual/History Section
        manual_frame = tk.LabelFrame(self.scroll_frame, text=" 2. MANUAL EVIDENCE SELECTION & MEDICAL HISTORY ", bg="white", font=("Segoe UI", 11, "bold"), fg="#2980b9", padx=15, pady=15)
        manual_frame.pack(fill=tk.X, padx=30, pady=15)
        
        list_frame = tk.Frame(manual_frame, bg="white")
        list_frame.pack(fill=tk.X)
        
        col1 = tk.Frame(list_frame, bg="white")
        col1.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        tk.Label(col1, text="Search All Symptoms:", font=("Segoe UI", 10)).pack(anchor=tk.W)
        self.search_var = tk.StringVar()
        self.search_var.trace("w", self.filter_list)
        tk.Entry(col1, textvariable=self.search_var, font=("Segoe UI", 11)).pack(fill=tk.X, pady=5)
        self.symptom_lb = tk.Listbox(col1, height=8, font=("Segoe UI", 10), selectmode=tk.MULTIPLE)
        self.symptom_lb.pack(fill=tk.BOTH, expand=True)
        for s in self.pipeline.preprocessor.unique_symptoms:
            self.symptom_lb.insert(tk.END, s.replace('_', ' ').title())

        col_btn = tk.Frame(list_frame, bg="white", padx=15)
        col_btn.pack(side=tk.LEFT)
        tk.Button(col_btn, text="ADD >>", command=self.add_manual, width=12, bg="#ecf0f1").pack(pady=5)
        tk.Button(col_btn, text="<< REMOVE", command=self.remove_manual, width=12, bg="#ecf0f1").pack(pady=5)
        
        col2 = tk.Frame(list_frame, bg="white")
        col2.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        tk.Label(col2, text="Current Selection for AI:", font=("Segoe UI", 10)).pack(anchor=tk.W)
        self.selected_lb = tk.Listbox(col2, height=10, font=("Segoe UI", 10))
        self.selected_lb.pack(fill=tk.BOTH, expand=True)

        hist_box = tk.Frame(manual_frame, bg="white", pady=15)
        hist_box.pack(fill=tk.X)
        h_frame = tk.Frame(hist_box, bg="white")
        h_frame.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 10))
        tk.Label(h_frame, text="365-Day Medical History:").pack(anchor=tk.W)
        self.history_ent = tk.Entry(h_frame, font=("Segoe UI", 11), relief=tk.GROOVE, borderwidth=2)
        self.history_ent.pack(fill=tk.X)
        
        m_frame = tk.Frame(hist_box, bg="white")
        m_frame.pack(side=tk.LEFT, fill=tk.X, expand=True)
        tk.Label(m_frame, text="Recent Medications:").pack(anchor=tk.W)
        self.med_ent = tk.Entry(m_frame, font=("Segoe UI", 11), relief=tk.GROOVE, borderwidth=2)
        self.med_ent.pack(fill=tk.X)

        tk.Button(self.scroll_frame, text="GENERATE CLINICAL DIAGNOSIS", command=self.process, bg="#27ae60", fg="white", font=("Segoe UI", 14, "bold"), height=2).pack(fill=tk.X, padx=30, pady=20)
        
        # 3. Results Section
        self.res_frame = tk.LabelFrame(self.scroll_frame, text=" 3. CLINICAL DIAGNOSTIC INSIGHTS ", bg="white", font=("Segoe UI", 11, "bold"), fg="#c0392b", padx=20, pady=20)
        self.res_frame.pack(fill=tk.BOTH, expand=True, padx=30, pady=15)
        self.placeholder = tk.Label(self.res_frame, text="Perform analysis to see clinical recommendations...", font=("Segoe UI", 12, "italic"), bg="white", fg="#95a5a6")
        self.placeholder.pack(pady=50)

    def filter_list(self, *args):
        search = self.search_var.get().lower()
        self.symptom_lb.delete(0, tk.END)
        for s in self.pipeline.preprocessor.unique_symptoms:
            if search in s.replace('_', ' ').lower():
                self.symptom_lb.insert(tk.END, s.replace('_', ' ').title())

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

    def process(self):
        manual = list(self.selected_manually)
        text = self.text_input.get("1.0", tk.END).strip()
        res = self.pipeline.predict(manual, text, self.history_ent.get(), self.med_ent.get())
        if res:
            sev_score, sev_msg = self.pipeline.calculate_severity(res['detected'])
            self.show_results(res, sev_score, sev_msg)
        else:
            messagebox.showerror("No Data", "No recognized clinical symptoms found. Please use standard terminology or select from the list.")

    def show_results(self, res, sev_score, sev_msg):
        for widget in self.res_frame.winfo_children(): widget.destroy()
        disease = res.get('disease', 'Unknown Condition')
        detected = res.get('detected', [])

        if res.get('is_emergency'):
            ef = tk.Frame(self.res_frame, bg="#fce4ec", padx=20, pady=20, highlightthickness=2, highlightbackground="#c2185b")
            ef.pack(fill=tk.X, pady=(0, 20))
            tk.Label(ef, text="⚠ CRITICAL MEDICAL ALERT", font=("Segoe UI", 16, "bold"), fg="#c2185b", bg="#fce4ec").pack()
            tk.Label(ef, text="Your description matches acute trauma or a life-threatening emergency.\nThis AI system is restricted to CHRONIC conditions. Seek IMMEDIATE EMERGENCY care.", font=("Segoe UI", 11), fg="#c2185b", bg="#fce4ec", wraplength=1000).pack(pady=10)

        tk.Label(self.res_frame, text=disease.upper(), font=("Segoe UI", 20, "bold"), fg="#2c3e50", bg="white").pack(anchor=tk.W)
        if detected:
            spec_df = self.cdm_data['specialist_mapping']
            specialist = spec_df[spec_df['Disease'] == disease]['Specialist'].values[0] if disease in spec_df['Disease'].values else "General Physician"
            tk.Label(self.res_frame, text=f"RECOMMENDED SPECIALIST: {specialist}", font=("Segoe UI", 14, "bold"), fg="#27ae60", bg="white").pack(anchor=tk.W)
            tk.Label(self.res_frame, text=f"AI MATCH CONFIDENCE: {res['confidence']:.1f}% | SEVERITY: {sev_score:.1f}/7 ({sev_msg})", font=("Segoe UI", 12, "bold"), fg="#2980b9", bg="white").pack(anchor=tk.W, pady=10)

        desc_df = self.cdm_data['condition_description']
        description = desc_df[desc_df['Disease'] == disease]['Description'].values[0] if disease in desc_df['Disease'].values else "Detailed clinical data not available for this condition."
        d_box = tk.LabelFrame(self.res_frame, text=" CLINICAL SUMMARY ", bg="white", font=("Segoe UI", 10, "bold"))
        d_box.pack(fill=tk.X, pady=10)
        tk.Label(d_box, text=description, bg="white", wraplength=1000, justify=tk.LEFT, font=("Segoe UI", 11)).pack(padx=15, pady=10)

        evidence_txt = "DETECTED CLINICAL EVIDENCE: " + (", ".join([s.replace('_', ' ').title() for s in detected]) if detected else "None (Emergency Bypass)")
        tk.Label(self.res_frame, text=evidence_txt, font=("Segoe UI", 10, "italic", "bold"), fg="#34495e", bg="white", wraplength=1000).pack(anchor=tk.W, pady=20)

# =============================================================================
# MAIN BOOTSTRAP
# =============================================================================
if __name__ == "__main__":
    paths = {
        'symptom': 'Symptom.csv', 
        'severity': 'Symptom Severity.csv', 
        'description': 'Symptom Description.csv', 
        'precaution': 'Symptom Precaution.csv', 
        'specialist': 'Disease Specialist.csv'
    }
    loader = OMOPDataLoader(paths)
    data = loader.load_all()
    if data:
        pipe = PLPPipeline()
        pipe.run_training(data['condition_occurrence'], data['symptom_severity'])
        root = tk.Tk()
        DiagnosticGUI(root, pipe, data)
        root.mainloop()

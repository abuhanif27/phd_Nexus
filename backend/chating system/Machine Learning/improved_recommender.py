import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
import tkinter as tk
from tkinter import messagebox, ttk
import sys

# --- DATA PREPROCESSING & MODEL TRAINING ---

def load_and_train():
    # Load datasets
    try:
        df_symptoms = pd.read_csv('Symptom.csv')
        df_specialist = pd.read_csv('Disease Specialist.csv')
    except FileNotFoundError as e:
        print(f"Error: Could not find dataset files. {e}")
        sys.exit(1)

    # 1. Extract all unique symptoms
    # Flatten all symptom columns, strip whitespace, remove nans
    all_symptoms = pd.unique(df_symptoms.iloc[:, 1:].values.ravel('K'))
    all_symptoms = sorted([str(s).strip() for s in all_symptoms if str(s).lower() != 'nan' and str(s) != ''])
    
    # 2. Create Binary (One-Hot) Encoded Dataset
    # We want a dataframe where columns are symptoms and rows are instances
    diseases = df_symptoms['Disease'].unique()
    
    # Initialize matrix with zeros
    X = np.zeros((len(df_symptoms), len(all_symptoms)))
    y = df_symptoms['Disease'].values

    # Map symptom names to column indices
    symptom_idx = {symptom: i for i, symptom in enumerate(all_symptoms)}

    for i in range(len(df_symptoms)):
        row_symptoms = df_symptoms.iloc[i, 1:].dropna().values
        for s in row_symptoms:
            s_clean = str(s).strip()
            if s_clean in symptom_idx:
                X[i, symptom_idx[s_clean]] = 1

    # 3. Train Random Forest Model
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X, y)

    # 4. Create Disease to Specialist Mapping
    specialist_map = dict(zip(df_specialist['Disease'], df_specialist['Specialist']))
    
    return model, all_symptoms, specialist_map, symptom_idx

# Load model and metadata
model, all_symptoms, specialist_map, symptom_idx = load_and_train()

# --- GUI DESIGN ---

class ImprovedApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Advanced Medical Specialist Recommender")
        self.root.geometry("800x700")
        self.root.configure(bg='#f0f4f7')

        self.selected_symptoms = set()

        # Styles
        style = ttk.Style()
        style.configure("TButton", font=("Segoe UI", 10), padding=5)
        style.configure("TLabel", background='#f0f4f7', font=("Segoe UI", 10))
        style.configure("Header.TLabel", font=("Segoe UI", 16, "bold"), foreground="#2c3e50")

        self.create_widgets()

    def create_widgets(self):
        # Header
        header = ttk.Label(self.root, text="AI Medical Specialist Recommendation System", style="Header.TLabel")
        header.pack(pady=20)

        main_frame = ttk.Frame(self.root)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=30, pady=10)

        # Left Column: Search and All Symptoms
        left_frame = ttk.Frame(main_frame)
        left_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        ttk.Label(left_frame, text="Search Symptoms:").pack(anchor=tk.W)
        self.search_var = tk.StringVar()
        self.search_var.trace("w", self.update_listbox)
        self.search_entry = ttk.Entry(left_frame, textvariable=self.search_var)
        self.search_entry.pack(fill=tk.X, pady=5)

        ttk.Label(left_frame, text="Available Symptoms:").pack(anchor=tk.W)
        self.symptom_listbox = tk.Listbox(left_frame, selectmode=tk.MULTIPLE, height=15, font=("Segoe UI", 10))
        self.symptom_listbox.pack(fill=tk.BOTH, expand=True)
        
        # Populate listbox
        for s in all_symptoms:
            self.symptom_listbox.insert(tk.END, s.replace('_', ' ').title())

        # Middle Buttons
        btn_frame = ttk.Frame(main_frame)
        btn_frame.pack(side=tk.LEFT, padx=10)

        ttk.Button(btn_frame, text="Add >>", command=self.add_symptom).pack(pady=5)
        ttk.Button(btn_frame, text="<< Remove", command=self.remove_symptom).pack(pady=5)

        # Right Column: Selected Symptoms
        right_frame = ttk.Frame(main_frame)
        right_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        ttk.Label(right_frame, text="Selected Symptoms:").pack(anchor=tk.W)
        self.selected_listbox = tk.Listbox(right_frame, height=15, font=("Segoe UI", 10))
        self.selected_listbox.pack(fill=tk.BOTH, expand=True)

        # Bottom Area: Predict and Results
        bottom_frame = ttk.Frame(self.root)
        bottom_frame.pack(fill=tk.X, padx=30, pady=20)

        self.predict_btn = ttk.Button(bottom_frame, text="GET RECOMMENDATION", command=self.predict)
        self.predict_btn.pack(pady=10)

        self.result_label = tk.Label(bottom_frame, text="", bg='#f0f4f7', font=("Segoe UI", 12, "bold"), justify=tk.CENTER)
        self.result_label.pack()

        self.confidence_label = tk.Label(bottom_frame, text="", bg='#f0f4f7', font=("Segoe UI", 10), foreground="#7f8c8d")
        self.confidence_label.pack()

    def update_listbox(self, *args):
        search_term = self.search_var.get().lower()
        self.symptom_listbox.delete(0, tk.END)
        for s in all_symptoms:
            if search_term in s.lower():
                self.symptom_listbox.insert(tk.END, s.replace('_', ' ').title())

    def add_symptom(self):
        selections = self.symptom_listbox.curselection()
        for idx in selections:
            display_name = self.symptom_listbox.get(idx)
            internal_name = display_name.lower().replace(' ', '_')
            if internal_name not in self.selected_symptoms:
                self.selected_symptoms.add(internal_name)
                self.selected_listbox.insert(tk.END, display_name)
        self.symptom_listbox.selection_clear(0, tk.END)

    def remove_symptom(self):
        selections = self.selected_listbox.curselection()
        for idx in reversed(selections):
            display_name = self.selected_listbox.get(idx)
            internal_name = display_name.lower().replace(' ', '_')
            if internal_name in self.selected_symptoms:
                self.selected_symptoms.remove(internal_name)
            self.selected_listbox.delete(idx)

    def predict(self):
        if not self.selected_symptoms:
            messagebox.showwarning("Input Error", "Please select at least one symptom.")
            return

        # Prepare input vector
        input_vector = np.zeros(len(all_symptoms))
        for s in self.selected_symptoms:
            if s in symptom_idx:
                input_vector[symptom_idx[s]] = 1
        
        input_vector = input_vector.reshape(1, -1)

        # Predict
        prediction = model.predict(input_vector)[0]
        probabilities = model.predict_proba(input_vector)
        max_prob = np.max(probabilities) * 100

        specialist = specialist_map.get(prediction, "General Physician")

        # Update UI
        self.result_label.config(text=f"RECOMMENDED SPECIALIST:\n{specialist.upper()}", foreground="#27ae60")
        self.confidence_label.config(text=f"Confidence Score: {max_prob:.2f}%")
        
        # Note: We hide the disease name as per project objectives
        print(f"DEBUG: Predicted disease is {prediction}")

if __name__ == "__main__":
    root = tk.Tk()
    app = ImprovedApp(root)
    root.mainloop()

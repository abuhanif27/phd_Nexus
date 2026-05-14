import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier

df = pd.read_csv('Symptom.csv')
all_symptoms = pd.unique(df.iloc[:, 1:].values.ravel('K'))
all_symptoms = sorted([str(s).strip() for s in all_symptoms if str(s).lower() != 'nan' and str(s) != ''])

X = np.zeros((len(df), len(all_symptoms)))
y = df['Disease'].values
symptom_idx = {symptom: i for i, symptom in enumerate(all_symptoms)}

for i in range(len(df)):
    row_symptoms = df.iloc[i, 1:18].dropna().values
    for s in row_symptoms:
        s_clean = str(s).strip()
        if s_clean in symptom_idx:
            X[i, symptom_idx[s_clean]] = 1

model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X, y)

# Sample Input (Dengue symptoms)
test_symptoms = ['skin_rash', 'headache', 'high_fever', 'vomiting', 'nausea']
vector = np.zeros(len(all_symptoms))
for s in test_symptoms:
    vector[symptom_idx[s]] = 1

probs = model.predict_proba(vector.reshape(1, -1))[0]
top_idx = np.argsort(probs)[::-1][:5]
for idx in top_idx:
    print(f"{model.classes_[idx]}: {probs[idx]*100:.2f}%")

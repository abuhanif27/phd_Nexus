import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier

df = pd.read_csv('Symptom.csv')
df_severity = pd.read_csv('Symptom Severity.csv')
severity_map = dict(zip(df_severity['Symptom'], df_severity['weight']))

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
            # USE WEIGHT INSTEAD OF 1
            weight = severity_map.get(s_clean, 1)
            X[i, symptom_idx[s_clean]] = weight

model = RandomForestClassifier(n_estimators=200, random_state=42) # Increased estimators
model.fit(X, y)

# Sample Input (Dengue symptoms)
test_symptoms = ['skin_rash', 'headache', 'high_fever', 'vomiting', 'nausea']
vector = np.zeros(len(all_symptoms))
for s in test_symptoms:
    weight = severity_map.get(s, 1)
    vector[symptom_idx[s]] = weight

probs = model.predict_proba(vector.reshape(1, -1))[0]
top_idx = np.argsort(probs)[::-1][:5]
print("--- WITH WEIGHTING ---")
for idx in top_idx:
    print(f"{model.classes_[idx]}: {probs[idx]*100:.2f}%")

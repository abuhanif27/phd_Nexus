import pandas as pd
import numpy as np

df = pd.read_csv('Symptom.csv')
diseases = df['Disease'].unique()
disease_symptoms = {}

for d in diseases:
    s = set()
    rows = df[df['Disease'] == d].iloc[:, 1:].values
    for row in rows:
        for item in row:
            if pd.notna(item):
                s.add(item.strip())
    disease_symptoms[d] = s

# Check overlap between first 5
for i in range(len(diseases)):
    for j in range(i + 1, min(i + 5, len(diseases))):
        d1 = diseases[i]
        d2 = diseases[j]
        common = disease_symptoms[d1].intersection(disease_symptoms[d2])
        if common:
            print(f"Overlap between '{d1}' and '{d2}': {common}")

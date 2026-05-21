import os
import csv
import logging
from django.conf import settings
from .models import ReinforcedKnowledge

logger = logging.getLogger(__name__)

class ReinforcementEngine:
    """
    Lightweight medical intelligence engine using Reinforced Learning.
    Based strictly on local datasets with a penalty/reward system.
    """
    
    def __init__(self):
        self.dataset_path = os.path.join(settings.BASE_DIR, 'chating system', 'Dataset', 'Symptom.csv')
        self.specialist_map_path = os.path.join(settings.BASE_DIR, 'chating system', 'Dataset', 'Disease Specialist.csv')

    def initialize_from_csv(self):
        """Seed the database with initial weights from the CSV dataset."""
        if ReinforcedKnowledge.objects.exists():
            return

        logger.info("Initializing Reinforced Knowledge from CSV...")
        with open(self.dataset_path, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            knowledge = []
            seen = set()
            
            for row in reader:
                disease = row['Disease'].strip()
                # Gather all symptoms (Symptom_1 to Symptom_17)
                symptoms = [row[f'Symptom_{i}'].strip().replace('_', ' ') 
                           for i in range(1, 18) if row.get(f'Symptom_{i}') and row[f'Symptom_{i}'].strip()]
                
                for sym in symptoms:
                    if (sym, disease) not in seen:
                        knowledge.append(ReinforcedKnowledge(symptom=sym, disease=disease, weight=1.0))
                        seen.add((sym, disease))
            
            ReinforcedKnowledge.objects.bulk_create(knowledge, ignore_conflicts=True)
        logger.info(f"Initialized {len(knowledge)} knowledge pairs.")

    def predict(self, symptoms: list, top_k=3):
        """
        Predict disease based on current weighted knowledge.
        Zero CPU pressure - just database lookups and basic math.
        """
        # Ensure data is loaded
        if not ReinforcedKnowledge.objects.exists():
            self.initialize_from_csv()

        scores = {}
        # Normalize input symptoms
        clean_symptoms = [s.strip().lower() for s in symptoms]
        
        # Get all related knowledge for these symptoms
        knowledges = ReinforcedKnowledge.objects.filter(symptom__in=clean_symptoms)
        
        for k in knowledges:
            if k.disease not in scores:
                scores[k.disease] = 0
            # Score = sum of weights
            scores[k.disease] += k.weight
        
        # Sort by score descending
        sorted_diseases = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        return sorted_diseases[:top_k]

    def reward(self, symptoms: list, confirmed_disease: str, reward_value=0.1):
        """
        REINFORCEMENT: Increase weights for symptoms that led to a correct diagnosis.
        """
        for sym in symptoms:
            obj, created = ReinforcedKnowledge.objects.get_or_create(
                symptom=sym.strip().lower(),
                disease=confirmed_disease.strip(),
                defaults={'weight': 1.0, 'occurrences': 1}
            )
            if not created:
                obj.weight += reward_value
                obj.occurrences += 1
                obj.save()
        logger.info(f"Rewarded disease '{confirmed_disease}' for symptoms {symptoms}")

    def penalize(self, symptoms: list, wrong_disease: str, penalty_value=0.05):
        # ... (keep existing penalize)
        for sym in symptoms:
            try:
                obj = ReinforcedKnowledge.objects.get(symptom=sym.strip().lower(), disease=wrong_disease)
                obj.weight = max(0.1, obj.weight - penalty_value)
                obj.save()
            except ReinforcedKnowledge.DoesNotExist:
                pass

    def get_contained_symptoms(self, text: str) -> list:
        """
        Find which known symptoms from the database are present in the given text.
        This is used as a highly efficient fallback when NER models are unavailable.
        """
        text = text.lower()
        # Get all unique symptom names from DB (cached or optimized)
        # For small datasets, this is extremely fast.
        known_symptoms = ReinforcedKnowledge.objects.values_list('symptom', flat=True).distinct()
        
        found = []
        for sym in known_symptoms:
            if sym in text:
                found.append(sym)
        return found

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nexuscare.settings')
django.setup()

from apps.ai.reinforcement import ReinforcementEngine
from apps.ai.models import ReinforcedKnowledge

def test_rl_engine():
    engine = ReinforcementEngine()
    
    # 1. Initialize
    print("Testing Initialization...")
    engine.initialize_from_csv()
    count = ReinforcedKnowledge.objects.count()
    print(f"Total knowledge pairs loaded: {count}")
    assert count > 0

    # 2. Predict
    print("\nTesting Prediction...")
    symptoms = ["itching", "skin rash"]
    predictions = engine.predict(symptoms)
    print(f"Predictions for {symptoms}: {predictions}")
    assert len(predictions) > 0

    # 3. Reward
    print("\nTesting Reward...")
    best_disease = predictions[0][0]
    initial_weight = ReinforcedKnowledge.objects.get(symptom="itching", disease=best_disease).weight
    engine.reward(["itching"], best_disease, reward_value=0.5)
    new_weight = ReinforcedKnowledge.objects.get(symptom="itching", disease=best_disease).weight
    print(f"Weight for '{best_disease}' updated from {initial_weight} to {new_weight}")
    assert new_weight > initial_weight

    print("\n✅ RL Engine Verification Successful!")

if __name__ == "__main__":
    test_rl_engine()

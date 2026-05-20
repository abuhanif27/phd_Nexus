import os
import django
import sys

# Add backend to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nexuscare.settings')
django.setup()

from apps.ai.services import AIService

def verify_ai():
    print("🧪 Verifying AI Specialist Prediction...")
    
    # Initialize service in local mode (disable remote brain for testing)
    from django.conf import settings
    original_remote_url = getattr(settings, 'REMOTE_BRAIN_URL', None)
    settings.REMOTE_BRAIN_URL = None # Force local mode
    
    ai_service = AIService(model_type='pytorch')
    
    test_cases = [
        "I have persistent chest pain and my heart is racing",
        "There is a weird rash on my arm that is very itchy",
        "I have severe stomach pain and feel nauseous",
        "My child has a high fever and is coughing"
    ]
    
    for text in test_cases:
        print(f"\nInput: {text}")
        result = ai_service.predict_specialist(text)
        print(f"Result: {result['specialist']} (Confidence: {result['confidence']:.2%})")
        print(f"Model Type: {result.get('model_type', 'unknown')}")

    # Restore remote url if it was set
    settings.REMOTE_BRAIN_URL = original_remote_url

if __name__ == "__main__":
    verify_ai()

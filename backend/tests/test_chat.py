import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.chat.models import Conversation, Message

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def patient_user(db):
    return User.objects.create_user(email='patient@test.com', password='password123', role='patient')

@pytest.fixture
def doctor_user(db):
    return User.objects.create_user(email='doctor@test.com', password='password123', role='doctor')

@pytest.fixture
def provider_user(db):
    return User.objects.create_user(email='provider@test.com', password='password123', role='provider')

@pytest.mark.django_db
def test_create_conversation_patient_to_doctor(api_client, patient_user, doctor_user):
    api_client.force_authenticate(user=patient_user)
    
    # Create conversation
    response = api_client.post('/api/chat/conversations/', {'participant_id': doctor_user.id})
    assert response.status_code == 201
    assert response.data['participants'][0]['id'] in [patient_user.id, doctor_user.id]
    assert response.data['participants'][1]['id'] in [patient_user.id, doctor_user.id]
    
    # Try creating same conversation again
    response = api_client.post('/api/chat/conversations/', {'participant_id': doctor_user.id})
    assert response.status_code == 200 # Should return existing
    assert Conversation.objects.count() == 1

@pytest.mark.django_db
def test_get_conversations(api_client, patient_user, doctor_user):
    conv = Conversation.objects.create()
    conv.participants.add(patient_user, doctor_user)
    
    api_client.force_authenticate(user=patient_user)
    response = api_client.get('/api/chat/conversations/')
    assert response.status_code == 200
    assert len(response.data['results']) == 1
    assert response.data['results'][0]['id'] == conv.id

@pytest.mark.django_db
def test_send_message_via_api(api_client, patient_user, doctor_user):
    conv = Conversation.objects.create()
    conv.participants.add(patient_user, doctor_user)
    
    api_client.force_authenticate(user=patient_user)
    # Note: Messages are usually sent via WebSocket, but let's check if we have an API endpoint if needed
    # (The current viewset doesn't have a create message endpoint, it's handled by consumer)
    pass

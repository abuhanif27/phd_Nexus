import pytest
from channels.testing import WebsocketCommunicator
from nexuscare.asgi import application
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from apps.chat.models import Conversation

User = get_user_model()

@pytest.mark.asyncio
@pytest.mark.django_db
async def test_chat_websocket_auth():
    user = await User.objects.acreate(email='ws_test@test.com', password='password123', role='patient')
    token = str(AccessToken.for_user(user))
    
    communicator = WebsocketCommunicator(application, f"/ws/chat/?token={token}")
    connected, subprotocol = await communicator.connect()
    assert connected
    await communicator.disconnect()

@pytest.mark.asyncio
@pytest.mark.django_db
async def test_chat_message_exchange():
    user1 = await User.objects.acreate(email='user1@test.com', password='password123', role='patient')
    user2 = await User.objects.acreate(email='user2@test.com', password='password123', role='doctor')
    
    conv = await Conversation.objects.acreate()
    await conv.participants.aadd(user1, user2)
    
    token1 = str(AccessToken.for_user(user1))
    token2 = str(AccessToken.for_user(user2))
    
    # Connect user 1
    comm1 = WebsocketCommunicator(application, f"/ws/chat/?token={token1}")
    await comm1.connect()
    
    # Connect user 2
    comm2 = WebsocketCommunicator(application, f"/ws/chat/?token={token2}")
    await comm2.connect()
    
    # User 1 sends message
    await comm1.send_json_to({
        'type': 'chat_message',
        'conversation_id': conv.id,
        'content': 'Hello from user 1'
    })
    
    # User 2 should receive it
    # Note: We might get 'status_update' messages first
    response = await comm2.receive_json_from()
    while response['type'] == 'status_update':
        response = await comm2.receive_json_from()
        
    assert response['type'] == 'new_message'
    assert response['message']['content'] == 'Hello from user 1'
    assert response['message']['sender'] == user1.id
    
    await comm1.disconnect()
    await comm2.disconnect()

import asyncio
import websockets
import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nexuscare.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

async def main():
    User = get_user_model()
    user = await User.objects.afirst()
    refresh = RefreshToken.for_user(user)
    token = str(refresh.access_token)
    
    uri = f"ws://localhost:8001/ws/chat/?token={token}"
    print(f"Connecting to {uri}")
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected!")
            payload = json.dumps({"type": "chat_message", "conversation_id": 1, "content": "hello from python"})
            await websocket.send(payload)
            print("Sent message")
            while True:
                response = await websocket.recv()
                print("Received:", response)
    except Exception as e:
        print("Error:", e)

asyncio.run(main())

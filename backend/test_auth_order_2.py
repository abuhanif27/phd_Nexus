import os
import sys
import django
import asyncio

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "nexuscare.settings")
from django.conf import settings
settings.CHANNEL_LAYERS['default'] = {'BACKEND': 'channels.layers.InMemoryChannelLayer'}

django.setup()

from channels.testing import WebsocketCommunicator
from nexuscare.asgi import application
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken

User = get_user_model()

async def main():
    user = await User.objects.aget_or_create(email="test_ws_auth2@example.com")
    user = user[0]
    token = AccessToken.for_user(user)
    
    communicator = WebsocketCommunicator(application, f"/ws/chat/?token={token}")
    connected, subprotocol = await communicator.connect()
    print("Connected:", connected)
    
    if connected:
        # Check if the user is authenticated in the consumer
        # Actually communicator doesn't expose the scope easily, but we know it connected
        print("Success!")
        await communicator.disconnect()
    else:
        print("Failed to connect")

asyncio.run(main())

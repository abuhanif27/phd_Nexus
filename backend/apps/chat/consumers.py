import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model

User = get_user_model()

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        print(f"WS Connection Attempt: {self.user}")
        
        if self.user.is_anonymous:
            print("WS Connection Rejected: Anonymous")
            await self.close()
            return

        print(f"WS Connection Accepted: {self.user.email}")
        # Group for this user to receive personal notifications/messages
        self.user_group_name = f"user_{self.user.id}"
        await self.channel_layer.group_add(
            self.user_group_name,
            self.channel_name
        )
        
        # Global group for online status tracking
        await self.channel_layer.group_add(
            "online_users",
            self.channel_name
        )

        await self.accept()
        
        # Broadcast online status
        await self.channel_layer.group_send(
            "online_users",
            {
                "type": "user_status",
                "user_id": self.user.id,
                "status": "online"
            }
        )

    async def disconnect(self, close_code):
        if hasattr(self, 'user_group_name'):
            await self.channel_layer.group_discard(
                self.user_group_name,
                self.channel_name
            )
            
            await self.channel_layer.group_discard(
                "online_users",
                self.channel_name
            )
            
            # Broadcast offline status
            await self.channel_layer.group_send(
                "online_users",
                {
                    "type": "user_status",
                    "user_id": self.user.id,
                    "status": "offline"
                }
            )

    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get("type")
        
        if message_type == "chat_message":
            conversation_id = data.get("conversation_id")
            content = data.get("content")
            
            if not conversation_id or not content:
                return

            # Save message to DB
            message = await self.save_message(conversation_id, content)
            
            if message:
                message_data = await self.serialize_message(message)
                
                # Get participants to notify
                participants = await self.get_conversation_participants(conversation_id)
                
                # Send to all participants
                for participant_id in participants:
                    await self.channel_layer.group_send(
                        f"user_{participant_id}",
                        {
                            "type": "chat_message",
                            "message": message_data
                        }
                    )

    @database_sync_to_async
    def serialize_message(self, message):
        from .serializers import MessageSerializer
        serializer = MessageSerializer(message)
        return serializer.data

    @database_sync_to_async
    def save_message(self, conversation_id, content):
        from .models import Conversation, Message
        try:
            conversation = Conversation.objects.get(id=conversation_id, participants=self.user)
            message = Message.objects.create(
                conversation=conversation,
                sender=self.user,
                content=content
            )
            # Update conversation updated_at
            conversation.save() 
            return message
        except Conversation.DoesNotExist:
            return None

    @database_sync_to_async
    def get_conversation_participants(self, conversation_id):
        from .models import Conversation
        try:
            conversation = Conversation.objects.get(id=conversation_id)
            return list(conversation.participants.values_list('id', flat=True))
        except Conversation.DoesNotExist:
            return []

    async def user_status(self, event):
        # Send status update to the client
        await self.send(text_data=json.dumps({
            "type": "status_update",
            "user_id": event["user_id"],
            "status": event["status"]
        }))

    async def chat_message(self, event):
        # Send message to the client
        await self.send(text_data=json.dumps({
            "type": "new_message",
            "message": event["message"]
        }))

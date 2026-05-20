"""
ASGI config for nexuscare project.
"""
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from apps.chat.routing import websocket_urlpatterns
from apps.chat.middleware import JWTAuthMiddleware

from channels.security.websocket import AllowedHostsOriginValidator, OriginValidator

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nexuscare.settings')

# Initialize Django ASGI application early to ensure the AppRegistry
# is populated before importing consumers and routing.
django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        OriginValidator(
            JWTAuthMiddleware(
                URLRouter(
                    websocket_urlpatterns
                )
            ),
            ["*"]
        )
    ),
})

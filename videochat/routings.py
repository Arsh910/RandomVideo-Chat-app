from django.urls import path
from .consumers import VideoChatConsumers

websocket_urlpatterns=[
    path('video_chat/',VideoChatConsumers.as_asgi()),
]
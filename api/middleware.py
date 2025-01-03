from urllib.parse import parse_qs
from channels.middleware import BaseMiddleware 
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model
import jwt

User = get_user_model()

@database_sync_to_async
def get_user_from_token(token):
    try:
        # Decode the token to get the user id
        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload['user_id']
        return User.objects.get(id=user_id)
    except (jwt.ExpiredSignatureError, jwt.DecodeError, User.DoesNotExist):
        return AnonymousUser()

class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = scope['query_string'].decode()
        query_params = parse_qs(query_string)
        token = query_params.get('token', [None])[0]
        if token:
            scope['user'] = await get_user_from_token(token)
        
        return await super().__call__(scope, receive, send)

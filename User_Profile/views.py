from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from dj_rest_auth.registration.views import SocialLoginView
from rest_framework.views import APIView 
from rest_framework.permissions import AllowAny
from django.conf import settings
import requests
from rest_framework.response import Response
from google.oauth2 import id_token as google_id_token
from rest_framework_simplejwt.tokens import RefreshToken
from User_Profile.models import Profile
import random
# Import google.oauth2 id_token
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import string

def generate_random_string(length=12, include_symbols=True):
    char_pool = string.ascii_letters + string.digits
    if include_symbols:
        char_pool += string.punctuation
    random_string = ''.join(random.choice(char_pool) for _ in range(length))
    return random_string

class GoogleLogin(SocialLoginView):
    adapter_class = GoogleOAuth2Adapter
    callback_url = 'http://localhost:8000/login'
    client_class = OAuth2Client

class GoogleLoginCallback(APIView):
    permission_classes = [AllowAny]
    def get(self, request, *args, **kwargs):
        code = request.GET.get('code')
        if not code:
            return Response({'error': 'No code provided'}, status=400)

        # Exchange the authorization code for a token
        token_url = 'https://oauth2.googleapis.com/token'
        token_data = {
            'code': code,
            'client_id': settings.YOUR_CLIENT_ID,
            'client_secret': settings.YOUR_SECRET_KEY,
            'redirect_uri': 'http://localhost:5173/login/',
            'grant_type': 'authorization_code',
        }
        token_response = requests.post(token_url, data=token_data)
        token_json = token_response.json()

        if 'error' in token_json:
            return Response({'error': token_json.get('error_description', 'Unknown error')}, status=400)
        # Verify the ID token
        try:
            id_info = google_id_token.verify_oauth2_token(
                token_json['id_token'],
                google_requests.Request(),
                settings.YOUR_CLIENT_ID
            )
        except ValueError:
            return Response({'error': 'Invalid ID token'}, status=400)

        # Extract user information from id_info 
        
        email = id_info['email']
        name = id_info.get('name', '')
        prof_image = id_info.get('picture','')
        first_name, last_name = name.split(' ', 1) if ' ' in name else (name, '')
        
        # generate random string
        k = ''
        flag = True
        while(flag):
            if not Profile.objects.filter(username = f'{first_name}{k}'):
                k = generate_random_string(length=5, include_symbols=False)
                flag = False
        # iif exist then login , if not then signup and login
        user = None
        if Profile.objects.filter(email = email):
            user = Profile.objects.get(email = email)
        else:
            user = Profile.objects.create(
                username = f'{first_name}#{k}',
                email = email,
                first_name = first_name,
                last_name = last_name,
                prof_image = prof_image
            )
            user.save()

        # Create your own JWT token
        refresh = RefreshToken.for_user(user)    
        
        # Attach any additional information to the payload if needed
        access_token = refresh.access_token
        refresh_token = str(refresh)
        # send request to home page
        

        # Return your own JWT tokens to the frontend
        return Response({
            'access_token': str(access_token),
            'refresh_token': refresh_token,
            'g_type' : 'eco-google-login-for-user'
        })

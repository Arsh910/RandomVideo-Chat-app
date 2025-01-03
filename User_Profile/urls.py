from django.urls import path
from.views import GoogleLoginCallback,GoogleLogin

urlpatterns = [
    path('dj-rest-auth/google/', GoogleLogin.as_view(), name='google_login'),
    path("dj-rest-auth/google/callback/",GoogleLoginCallback.as_view(),name="google_login_callback")
]

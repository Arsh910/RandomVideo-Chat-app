from django.urls import path
from .views import Signup_User,LogoutUser,Login_User,UserProfileView,Change_Pass,SendPassResetEmail,UserPasswordResetView,Home,CheckUsername

urlpatterns = [
    path('',Home.as_view(),name='home'),
    path('signup/',Signup_User.as_view(),name='signup'),
    path('exists/',CheckUsername.as_view(),name='exists'),
    path('logou_t/',LogoutUser.as_view(),name="loguot"),
    path('logi_n/',Login_User.as_view(),name='login'),
    path('users/',UserProfileView.as_view(),name='users'),
    path('change_password/',Change_Pass.as_view(),name='change_password'),
    path('send/password-reset/email/',SendPassResetEmail.as_view(),name='send_password_reset_email'),
    path('user/reset/<uid>/<token>/',UserPasswordResetView.as_view(),name='user_password_reset')
]
from django.shortcuts import render , get_list_or_404 ,get_object_or_404
from rest_framework.views import APIView 
from rest_framework.permissions import AllowAny ,IsAuthenticated
from django.contrib.auth import authenticate
from django.views.generic import TemplateView
from .serializer import  User_Reg_Serializer ,Login_User_Serializer ,UserProfileSerializer,UserChangePassword ,SendPassResetEmailSerializer ,UserPasswordRestSerializer
from rest_framework.response import Response
from User_Profile.models import Profile
from rest_framework.permissions import BasePermission ,SAFE_METHODS
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.decorators import login_required
# from .renderers import UserRenderers
from rest_framework import status
from django.contrib.auth.mixins import LoginRequiredMixin

def create_jwt_token(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


# permission for posts 
class CustomPermission(BasePermission):  
    message = "something is wrong"
    #renderer_classes = [UserRenderers]
    def has_permission(self, request, view):
        if bool(request.user.is_authenticated) and request.method in SAFE_METHODS:
            return True
        elif not bool(request.user.is_authenticated) and request.method not in SAFE_METHODS :
            return True
        return False

# user view here
class Signup_User(APIView):
    permission_classes = [AllowAny]
    #renderer_classes = [UserRenderers]
    def get(self, requests,format = None):
        return Response({"msg":"signup"})
    def post(self, request,format = None):
        serializer = User_Reg_Serializer(data = request.data)
        if serializer.is_valid(raise_exception=True):
            obj = serializer.save()
            if obj:
                token = create_jwt_token(obj)
                return Response({"msg":"Done" ,"token":token})
        return Response({"msg":"something wrong","error":serializer.errors})
    
class Login_User(APIView):
    permission_classes = [AllowAny]
    #renderer_classes = [UserRenderers]
    def post(self, request , format = None): 
        # print(f"{request.data} , {type(request.data)}")
        serializer = Login_User_Serializer(data = request.data)
        if serializer.is_valid(raise_exception=True):
            email = serializer.validated_data['email']
            password = serializer.validated_data['password']
            obj = authenticate(email = email , password = password)
        
            if obj is not None:
                token = create_jwt_token(obj) 
                return Response({"msg":f"login done" ,"token":token})
            else:
                return Response({"error": "wrong credentials"},status=status.HTTP_400_BAD_REQUEST)

class LogoutUser(APIView):
    permission_classes = [AllowAny]
    def post(self,request):
        try:
            refresh_token = request.data['refresh_token']
            if refresh_token:
                token = RefreshToken(refresh_token)
                if token:
                    token.blacklist()
                    return Response(status=status.HTTP_200_OK)
        except Exception as e:
            return Response(status=status.HTTP_400_BAD_REQUEST)
            
class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]
    #renderer_classes = [UserRenderers]
    def get(self, request, format=None):
        data = Profile.objects.filter(username = request.user.username)
        serializer = UserProfileSerializer(data, many=True)
        return Response(serializer.data)

class Change_Pass(APIView):
    permission_classes = [IsAuthenticated]
    #renderer_classes = [UserRenderers]
    def post(self, request, format=None):
        serializer = UserChangePassword(data=request.data)
        if serializer.is_valid(raise_exception=True):
            email = serializer.validated_data.get('email')
            try:
                profile = Profile.objects.get(email=email)
                serializer.update(profile, serializer.validated_data)
                return Response({'msg': 'Password changed successfully'})
            except Profile.DoesNotExist:
                return Response({'error': 'User does not exist'})
        return Response(serializer.errors)


class SendPassResetEmail(APIView):
    permission_classes = [AllowAny]
    # #renderer_classes = [UserRenderers]
    def post(self,request,format = None):
        serializer = SendPassResetEmailSerializer(data = request.data)
        if serializer.is_valid(raise_exception=True):
            return Response({'msg':'we have sent you an email to reset password'})
        
class UserPasswordResetView(APIView):
    permission_classes = [AllowAny]
    # #renderer_classes = [UserRenderers]
    def post(self,request,uid,token,format = None):
        serializer = UserPasswordRestSerializer(data = request.data , context = {'uid':uid , 'token':token})
        if serializer.is_valid(raise_exception=True):
            return Response({'msg' : 'password changed sucessfully'})
        else:
            return Response({'error':'some error happend'})


class Home(APIView):
    permission_classes = [IsAuthenticated]
    def get(self,request,format = None):
        prof_image = str(request.user.prof_image)

        if prof_image and str(prof_image).startswith('http'):
            pass
        else:
            prof_image = f"http://127.0.0.1:8000/media/{prof_image}"
        
        user_data = {
            'user': {
                'id':request.user.id,
                'username': request.user.username,
                'prof_image': prof_image,
            }
        }
        return Response(user_data)

class CheckUsername(APIView):
    permission_classes = [AllowAny]
    def post(self,request,format = None):
        username = request.data['username']
        email  = request.data['email']
        if username:
            if Profile.objects.filter(username=username):
                return Response({"exists":True})
            else:
                return Response({"exists":False})
        if email:
            if Profile.objects.filter(email=email):
                return Response({"exists":True})
            else:
                return Response({"exists":False})
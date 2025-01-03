from rest_framework import serializers
from .models import Posts
from User_Profile.models import Profile
from django.contrib.auth import authenticate
from django.utils.encoding import smart_str,force_bytes,DjangoUnicodeDecodeError
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.http import urlsafe_base64_decode , urlsafe_base64_encode
from .utils import Util

class User_Reg_Serializer(serializers.ModelSerializer):
    
    password2 = serializers.CharField(style={'input_type':'password'},write_only = True)
    
    class Meta:
        model = Profile
        fields = ['username','email','bio','first_name','prof_image','password' , 'password2']
        extra_kwargs = {'password':{'write_only':True}}

    def validate(self, attrs):
        password = attrs.get('password')
        password2 = attrs.get('password2')
        if password != password2:
            raise serializers.ValidationError("password does not match")
        return attrs
    
    def create(self, validated_data):
        password2 = validated_data.pop("password2")
        password = validated_data.pop("password")
        obj  = Profile.objects.create(**validated_data)
        obj.set_password(password)
        obj.save()
        return obj
    
class Login_User_Serializer(serializers.ModelSerializer):
    email = serializers.EmailField(max_length = 255)
    class Meta:
        model = Profile
        fields = ['email','password']
        extra_kwargs = {'password':{'write_only':True}}
    
class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ['username','email']

class UserChangePassword(serializers.Serializer):
    email = serializers.EmailField(max_length=60)
    password = serializers.CharField(write_only=True, max_length=128)
    newpassword = serializers.CharField(style={'input_type': 'password'}, write_only=True)

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        newpassword = attrs.get('newpassword')
        
        if password == newpassword:
            raise serializers.ValidationError("New password cannot be the same as the old password")

        user = authenticate(email=email, password=password)
        if user is None:
            raise serializers.ValidationError("Invalid email or password")
        
        return attrs

    def update(self, instance, validated_data):
        instance.set_password(validated_data['newpassword'])
        instance.save()
        return instance
    
class SendPassResetEmailSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length = 30)
    
    def validate(self, attrs):
        email = attrs.get('email')
        if email:
            obj = Profile.objects.get(email=email)
            if obj:
                uid = urlsafe_base64_encode(force_bytes(obj.id))
                token = PasswordResetTokenGenerator().make_token(obj)
                link = 'http://172.16.167.62:5173/user/reset/'+uid+'/'+token
                
                data = {
                    'subject' : 'Reset Your Password',
                    'body' : f'This is an email send to reset password . click on the link : {link}',
                    'to_email': email
                }

                Util.send_email(data)
                return attrs
            else:
                raise serializers.ValidationError("User with email does not exits")
        else:
            raise serializers.ValidationError("Need an email")
        
class UserPasswordRestSerializer(serializers.Serializer):
    password = serializers.CharField(style={'input_type': 'password'}, write_only=True)
    confirm_password = serializers.CharField(style={'input_type': 'password'}, write_only=True)

    class Meta:
        fields = ['password', 'confirm_password']

    def validate(self, attrs):
        password = attrs.get('password')
        confirm_password = attrs.get('confirm_password')

        if password != confirm_password:
            raise serializers.ValidationError('Password and confirm password do not match')

        uid = self.context.get('uid')
        token = self.context.get('token')
        
        try:
            id = smart_str(urlsafe_base64_decode(uid))
            user = Profile.objects.get(id=id)
            
            if not PasswordResetTokenGenerator().check_token(user, token):
                raise serializers.ValidationError('Token is either wrong or expired')
            
            user.set_password(password)
            user.save()

            return attrs
        
        except Profile.DoesNotExist:
            raise serializers.ValidationError('User not found')
        except DjangoUnicodeDecodeError:
            raise serializers.ValidationError('Something went wrong with the decoding process')





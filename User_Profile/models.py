from django.db import models
from django.contrib.auth.models import AbstractBaseUser , BaseUserManager ,PermissionsMixin


# manager here 

class Profile_Manager(BaseUserManager):

    def create_user(self,email,username,password=None):
        if not email:
            raise ValueError('Email required')
        if not username:
            raise ValueError('Username required')
        
        user = self.model(
            email = self.normalize_email(email),
            username = username,
        )
        user.set_password(password)
        user.save(using = self.db)
        return user 

    def create_superuser(self,email,username,password):
        
        if not email:
            raise ValueError('Email required')
        if not username:
            raise ValueError('Username required')
        if not password:
            raise ValueError('Username required')

        user = self.create_user(
            email=self.normalize_email(email),
            username=username,
            password=password,
        )

        user.is_admin = True
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True

        user.save(using = self.db)
        return user

# models here.

def set_profile_image(self,filename):
    return f'profile_images/{self.pk}/profile_image.png'

class Profile(AbstractBaseUser , PermissionsMixin):

    id              = models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')

    email           = models.EmailField(verbose_name = 'email' , unique = True , max_length = 60)
    first_name      = models.CharField(verbose_name = 'first name' , max_length = 20 , null = True , default='User')
    last_name       = models.CharField(verbose_name = 'last name' , max_length = 20, null = True ,blank=True)
    username        = models.CharField(verbose_name = 'username' , unique = True , max_length = 30 )
    prof_image      = models.ImageField(max_length = 1000 , upload_to = set_profile_image , default = '/profile_images/user.png')

    bio             = models.CharField(max_length=300 ,null=True, default ='Hello')
    
    date_joined     = models.DateTimeField(verbose_name = 'date joined', auto_now_add = True)
    last_login      = models.DateTimeField(verbose_name='last login',auto_now=True)

    is_admin        = models.BooleanField(default=False)
    is_active       = models.BooleanField(default=True)
    is_staff        = models.BooleanField(default=False)
    is_superuser    = models.BooleanField(default=False)
    hide_email      = models.BooleanField(default=False)

    private_account = models.BooleanField(default=False)
    
    objects = Profile_Manager()

    USERNAME_FIELD ='email'
    REQUIRED_FIELDS =['username']

    def __str__(self):
        return self.username
    
    def get_profile_image_name(self):
        # selecting two substrings between indexies 
        return str(self.prof_image)[str(self.prof_image).index(f'profile_images/{self.pk}/'):]

    def has_perm(self , perm , obj =None):
        return self.is_admin
    
    def has_module_perms(self,app_label):
        return True

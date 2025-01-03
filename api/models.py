from django.db import models
import shortuuid
from User_Profile.models import Profile

# Create your models here.
class Posts(models.Model):
    name = models.CharField(max_length=30 , verbose_name='name' , unique=True , default=shortuuid.uuid)
    author = models.ForeignKey(Profile , related_name='post_auth' ,null=False, on_delete=models.CASCADE)
    bio = models.CharField(max_length=200 , verbose_name='bio' , blank=True , unique=False)
    likes = models.IntegerField(verbose_name='likes' , blank=True , null= True)
    date_created = models.DateTimeField(auto_now=True)
    image = models.ImageField(upload_to='posts',blank=True)

    def __str__(self):
        return self.name
    




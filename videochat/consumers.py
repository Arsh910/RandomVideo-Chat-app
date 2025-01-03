from django.template.loader import render_to_string
from channels.generic.websocket import WebsocketConsumer,AsyncWebsocketConsumer
from asgiref.sync import async_to_sync
from django.core.files.base import ContentFile
import json
from django.core.cache import cache
import base64
import json
import random
from rest_framework.response import Response
import os
import re 
from django.shortcuts import get_object_or_404
from api.models import Profile
from urllib.parse import parse_qs


class VideoChatConsumers(WebsocketConsumer):
    
    def connect(self):
        self.user = self.scope['user'] if 'user' in self.scope else None
        self.room_name = 'qekjQKIvj3ZPGIhmj'

        if self.user:
            try:
                print(f"video connection for {self.user}")
                async_to_sync(self.channel_layer.group_add)(
                    self.room_name , self.channel_name   
                )
                self.update_user_list(self.room_name,self.user.id)
                self.accept()

                online_users = self.get_user_list(self.room_name)

                event ={
                    'type': 'handle_list',
                    'typeof': 'list_online',
                    'list': online_users,
                }

                async_to_sync(self.channel_layer.group_send)(
                    self.room_name , event
                )

            except:
                return Response({'error' : 'something is wrong while connecting to socket'})

    def disconnect(self,code):
        if self.user:
            self.update_user_list(self.room_name ,self.user.id, remove = True)
            online_users = self.get_user_list(self.room_name)

            if len(online_users) > 0:
                event ={
                    'type': 'handle_list',
                    'typeof': 'list_online',
                    'list': online_users
                }

                async_to_sync(self.channel_layer.group_send)(
                    self.room_name , event
                )

            print(f"disconnected for user {self.user}")
            async_to_sync(self.channel_layer.group_discard)(
                self.room_name,self.channel_name
            )

    def handle_list(self,event):
        self.send(json.dumps({
            'typeof': 'list_online',
            'list':event['list']
        }))


    def update_user_list(self ,room_name , user_id , remove = False):
        key = f"noto_video_users_{room_name}"
        users = cache.get(key, set())
        if remove:
            users.discard(user_id)
        else:
            users.add(user_id)

        cache.set(key, users)

    def get_user_list(self,room_name):
        key = f"noto_video_users_{room_name}"
        return list(cache.get(key,[]))

    def receive(self,text_data = None):
        exchange_data_dict = json.loads(text_data)
        typeof = exchange_data_dict.get('typeof')

        if typeof == "check_match":
            user_data = {'id' : self.user.id, 'prof_image':f'{self.user.prof_image}'}
            other_user = exchange_data_dict.get('other_user')
            
            other = get_object_or_404(Profile,id=other_user)
            other_user = {'id' : other.id, 'prof_image':f'{other.prof_image}'}
            print(f"from {self.user.username} to {other.username}")

            event = {
                    'type' : 'video_mess_handler',
                    'typeof':typeof,
                    'user_data' : user_data,
                    'other_user' : other_user,
            }
                
            async_to_sync(self.channel_layer.group_send)(
                    self.room_name,event
            )

        elif typeof == "offer":

            to_user = exchange_data_dict.get('to')
            from_user = exchange_data_dict.get('from')
            offer = exchange_data_dict.get('offer')
            event = {
                    'type' : 'offer_handler',
                    'typeof':typeof,
                    'to' : to_user,
                    'from' : from_user,
                    'offer':offer
            }   
            async_to_sync(self.channel_layer.group_send)(
                    self.room_name,event
            )

        elif typeof == "answer":

            to_user = exchange_data_dict.get('to')
            from_user = exchange_data_dict.get('from')
            answer = exchange_data_dict.get('answer')
            event = {
                    'type' : 'answer_handler',
                    'typeof':typeof,
                    'to' : to_user,
                    'from' : from_user,
                    'answer':answer 
            }   
            async_to_sync(self.channel_layer.group_send)(
                    self.room_name,event
            )

        elif typeof == "ice_candidate":

            to_user = exchange_data_dict.get('to')
            from_user = exchange_data_dict.get('from')
            candidate = exchange_data_dict.get('candidate')
            event = {
                    'type' : 'ice_handler',
                    'typeof':typeof,
                    'to' : to_user,
                    'from' : from_user,
                    'candidate':candidate
            }   
            async_to_sync(self.channel_layer.group_send)(
                    self.room_name,event
            )

        elif typeof == "endcall":

            to_user = exchange_data_dict.get('to')
            from_user = exchange_data_dict.get('from')
            event = {
                    'type' : 'endcall_handler',
                    'typeof':typeof,
                    'to' : to_user,
                    'from' : from_user,
            }   
            async_to_sync(self.channel_layer.group_send)(
                    self.room_name,event
            )


    def video_mess_handler(self,event):
        typeof = event['typeof']
        user_data = event['user_data']
        other_user = event['other_user']

        self.send(
            json.dumps({
                'typeof' : typeof,
                'user_data' : user_data,
                'other_user' : other_user,
            })
        )
    
    def offer_handler(self , event):
        typeof = event['typeof']
        from_user = event['from']
        to_user = event['to']
        offer = event['offer']
        self.send(
            json.dumps({
                'typeof':typeof,
                'from':from_user,
                'to':to_user,
                'offer':offer
            })
        )

    def answer_handler(self , event):
        typeof = event['typeof']
        from_user = event['from']
        to_user = event['to']
        answer = event['answer']
        self.send(
            json.dumps({
                'typeof':typeof,
                'from':from_user,
                'to':to_user,
                'answer':answer
            })
        )

    def ice_handler(self , event):
        typeof = event['typeof']
        from_user = event['from']
        to_user = event['to']
        candidate = event['candidate']
        self.send(
            json.dumps({
                'typeof':typeof,
                'from':from_user,
                'to':to_user,
                'candidate':candidate
            })
        )
    
    def endcall_handler(self , event):
        typeof = event['typeof']
        from_user = event['from']
        to_user = event['to']
        self.send(
            json.dumps({
                'typeof':typeof,
                'from':from_user,
                'to':to_user,
            })
        )




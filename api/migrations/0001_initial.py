# Generated by Django 5.1 on 2024-11-10 07:16

import django.db.models.deletion
import shortuuid.main
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Posts',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(default=shortuuid.main.ShortUUID.uuid, max_length=30, unique=True, verbose_name='name')),
                ('bio', models.CharField(blank=True, max_length=200, verbose_name='bio')),
                ('likes', models.IntegerField(blank=True, null=True, verbose_name='likes')),
                ('date_created', models.DateTimeField(auto_now=True)),
                ('image', models.ImageField(blank=True, upload_to='posts')),
                ('author', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='post_auth', to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
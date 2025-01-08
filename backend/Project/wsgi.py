"""
WSGI config for Project project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/wsgi/
"""

import os
from django.core.wsgi import get_wsgi_application
from whitenoise import WhiteNoise
from pathlib import Path

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Project.settings')

# Define BASE_DIR
BASE_DIR = Path(__file__).resolve().parent.parent

application = get_wsgi_application()
application = WhiteNoise(application, root=os.path.join(BASE_DIR, 'static_cdn'))

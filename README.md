# RandomVideo-Chat-app

Run the followring commands 

Create a virtual environment  : python -m venv random-video-chat-app
Clone the files (in repo not repo filder ) : git clone 

Activate the virtual env : random-video-chat-app/Scripts/activate
Go into folder random-video-chat-app : cd random-video-chat-app

Install the python modules : pip install -r requirements.txt
Make migrations : python manage.py makemigrations
Migrate : python manage.py migrate 

There is some issue with JWT so run the following commands for that 
pip uninstall PyJWT
pip install "PyJWT>=2,<3"
pip install -U djangorestframework-simplejwt

Runserver : python manage.py runserver

Make sure it is running on this 
http://127.0.0.1:8000/


In another terminal 

Go into folder react-chat-app : cd react-chat-app 
Install the node modules : npm i 
Start the app : npm start 

Make sure it is running on this 
http://127.0.0.1:3000/

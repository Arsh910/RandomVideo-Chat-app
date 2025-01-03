# RandomVideo-Chat-App

Follow these steps to set up the project:

---

## Backend Setup (Django)

1. **Create a Virtual Environment**  
   ```bash
   python -m venv random-video-chat-app
   ```

2. **Clone the Repository**  
   Clone the project files **inside the virtual environment folder (not the folder itself)**:  
   ```bash
   git clone <repository-url>
   ```

3. **Activate the Virtual Environment**  
   On Windows:  
   ```bash
   random-video-chat-app\Scripts\activate
   ```  
   On macOS/Linux:  
   ```bash
   source random-video-chat-app/bin/activate
   ```

4. **Navigate to the Backend Folder**  
   ```bash
   cd random-video-chat-app
   ```

5. **Install Python Dependencies**  
   ```bash
   pip install -r requirements.txt
   ```

6. **Database Setup**  
   - Make migrations:  
     ```bash
     python manage.py makemigrations
     ```  
   - Apply migrations:  
     ```bash
     python manage.py migrate
     ```

7. **Fix JWT Dependency Issue** (if necessary)  
   If you encounter issues with JWT, run these commands:  
   ```bash
   pip uninstall PyJWT
   pip install "PyJWT>=2,<3"
   pip install -U djangorestframework-simplejwt
   ```

8. **Run the Django Server**  
   ```bash
   python manage.py runserver
   ```  
   Make sure it is running on:  
   [http://127.0.0.1:8000/](http://127.0.0.1:8000/)

---

## Frontend Setup (React)

1. **Open a New Terminal**  
   Leave the Django server running in the first terminal.

2. **Navigate to the React App Folder**  
   ```bash
   cd react-chat-app
   ```

3. **Install Node Modules**  
   ```bash
   npm install
   ```

4. **Start the React App**  
   ```bash
   npm start
   ```  
   Make sure it is running on:  
   [http://127.0.0.1:3000/](http://127.0.0.1:3000/)

---

## Final Notes

- Ensure the backend is running on [http://127.0.0.1:8000/](http://127.0.0.1:8000/) before starting the frontend.  
- Open both the Django server and React app in different terminals.  
- For any issues, check the error logs in the respective terminal.


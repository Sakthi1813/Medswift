import firebase_admin
from firebase_admin import credentials, firestore
import os

_db = None
_initialized = False

// For Firebase JS SDK v7.20.0 and later, measurementId is optional

FIREBASE_CONFIG = {
  "apiKey": "AIzaSyB8KAqzjTMC28Swted-NdZ3p-5myI7oLAs",
  "authDomain": "medswift-35193.firebaseapp.com",
  "projectId": "medswift-35193",
  "storageBucket": "medswift-35193.firebasestorage.app",
  "messagingSenderId": "663262393300",
  "appId": "1:663262393300:web:f7a13e047e532436685c41",
  "measurementId": "G-FWG702LK8F"
}

def get_db():
    global _db, _initialized
    if not _initialized:
        try:
            if not firebase_admin._apps:
                cred_path = os.environ.get("FIREBASE_CREDENTIALS", "firebase-credentials.json")
                if os.path.exists(cred_path):
                    cred = credentials.Certificate(cred_path)
                    firebase_admin.initialize_app(cred)
                else:
                    firebase_admin.initialize_app()
            _db = firestore.client()
            _initialized = True
        except Exception as e:
            print(f"Firebase init error: {e}")
            _db = None
    return _db

def get_firebase_web_config():
    return FIREBASE_CONFIG


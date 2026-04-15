from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from dotenv import load_dotenv
import os
import uuid
import threading
import time
from datetime import datetime

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "medswift_secret_2024")

# Enable CORS
CORS(app, resources={r"/*": {"origins": "*"}})

# ✅ Updated SocketIO (Production-ready with eventlet)
socketio = SocketIO(app, cors_allowed_origins="*")

# Import services
from services.hospital_finder import find_nearest_hospitals
from services.ambulance_dispatcher import (
    find_nearest_ambulance,
    find_nearby_ambulances,
    update_ambulance_status,
    load_ambulances,
)
from services.route_service import get_full_route
from services.email_service import send_booking_confirmation
from firebase_config import get_firebase_web_config

# Temporary in-memory storage
bookings_store = {}

# ──────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────

@app.route("/")
def landing():
    return render_template("landing.html")

@app.route("/login")
def login():
    return render_template("login.html", firebase_config=get_firebase_web_config())

@app.route("/signup")
def signup():
    return render_template("signup.html", firebase_config=get_firebase_web_config())

@app.route("/dashboard")
def dashboard():
    return render_template("dashboard.html", firebase_config=get_firebase_web_config())

@app.route("/api/firebase-config")
def firebase_config_endpoint():
    return jsonify(get_firebase_web_config())

# ──────────────────────────────────────────────
# APIs
# ──────────────────────────────────────────────

@app.route("/api/find-hospitals", methods=["POST"])
def api_find_hospitals():
    data = request.get_json()
    lat = float(data.get("latitude"))
    lon = float(data.get("longitude"))
    emergency_type = data.get("emergency_type", "general")

    hospitals = find_nearest_hospitals(lat, lon, 5, emergency_type)

    return jsonify({
        "success": True,
        "hospitals": hospitals,
        "timestamp": datetime.now().isoformat()
    })


@app.route("/api/find-ambulance", methods=["POST"])
def api_find_ambulance():
    data = request.get_json()
    lat = float(data.get("latitude"))
    lon = float(data.get("longitude"))

    ambulance = find_nearest_ambulance(lat, lon)

    if ambulance:
        return jsonify({"success": True, "ambulance": ambulance})
    return jsonify({"success": False}), 503


@app.route("/api/create-booking", methods=["POST"])
def api_create_booking():
    data = request.get_json()

    booking_id = "MS" + str(uuid.uuid4()).replace("-", "")[:8].upper()

    ambulance = data.get("ambulance")
    hospital = data.get("hospital")

    user_lat = float(data.get("user_lat"))
    user_lon = float(data.get("user_lon"))

    user_email = data.get("user_email", "")
    user_name = data.get("user_name", "User")

    route_data = {}

    if ambulance and hospital:
        try:
            route_data = get_full_route(
                float(ambulance["latitude"]), float(ambulance["longitude"]),
                user_lat, user_lon,
                float(hospital["latitude"]), float(hospital["longitude"])
            )
        except:
            pass

    booking = {
        "booking_id": booking_id,
        "status": "confirmed",
        "user_name": user_name,
        "user_email": user_email,
        "ambulance": ambulance,
        "hospital": hospital,
        "route": route_data,
        "timestamp": datetime.now().isoformat()
    }

    bookings_store[booking_id] = booking

    if ambulance:
        update_ambulance_status(ambulance["id"], "dispatched")

    if user_email:
        try:
            send_booking_confirmation(user_email, booking)
        except Exception as e:
            print("Email error:", e)

    return jsonify({"success": True, "booking": booking})


@app.route("/api/booking/<booking_id>")
def get_booking(booking_id):
    booking = bookings_store.get(booking_id)
    if booking:
        return jsonify({"success": True, "booking": booking})
    return jsonify({"success": False}), 404


@app.route("/api/ambulances")
def api_ambulances():
    return jsonify(load_ambulances())

# ──────────────────────────────────────────────
# WebSocket
# ──────────────────────────────────────────────

clients = {}

@socketio.on("connect")
def connect():
    print("Client connected:", request.sid)

@socketio.on("disconnect")
def disconnect():
    clients.pop(request.sid, None)

@socketio.on("subscribe")
def subscribe(data):
    lat = float(data.get("lat"))
    lon = float(data.get("lon"))

    clients[request.sid] = {"lat": lat, "lon": lon}

def broadcast():
    while True:
        time.sleep(5)
        for sid, loc in clients.items():
            ambulances = find_nearby_ambulances(loc["lat"], loc["lon"])
            socketio.emit("update", {"ambulances": ambulances}, to=sid)

threading.Thread(target=broadcast, daemon=True).start()

# ──────────────────────────────────────────────
# ❗ ONLY for local development
# ──────────────────────────────────────────────

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)

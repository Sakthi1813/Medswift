from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import uuid
from datetime import datetime

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "medswift_secret_2024")

CORS(app, resources={r"/*": {"origins": "*"}})


# In-memory storage
bookings_store = {}

# ✅ FIXED ROOT ROUTE
@app.route("/")
def home():
    return {"status": "Medswift API running 🚀"}


# 🔹 Firebase config
@app.route("/api/firebase-config")
def firebase_config_endpoint():
    from firebase_config import get_firebase_web_config
    return jsonify(get_firebase_web_config())


# 🔹 Find hospitals
@app.route("/api/find-hospitals", methods=["POST"])
def api_find_hospitals():
    from services.hospital_finder import find_nearest_hospitals

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


# 🔹 Find ambulance
@app.route("/api/find-ambulance", methods=["POST"])
def api_find_ambulance():
    from services.ambulance_dispatcher import find_nearest_ambulance

    data = request.get_json()
    lat = float(data.get("latitude"))
    lon = float(data.get("longitude"))

    ambulance = find_nearest_ambulance(lat, lon)

    if ambulance:
        return jsonify({"success": True, "ambulance": ambulance})
    return jsonify({"success": False}), 503


# 🔹 Create booking
@app.route("/api/create-booking", methods=["POST"])
def api_create_booking():
    from services.route_service import get_full_route
    from services.email_service import send_booking_confirmation
    from services.ambulance_dispatcher import update_ambulance_status

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


# 🔹 Get booking
@app.route("/api/booking/<booking_id>")
def get_booking(booking_id):
    booking = bookings_store.get(booking_id)
    if booking:
        return jsonify({"success": True, "booking": booking})
    return jsonify({"success": False}), 404


# 🔹 Load ambulances
@app.route("/api/ambulances")
def api_ambulances():
    from services.ambulance_dispatcher import load_ambulances
    return jsonify(load_ambulances())


# 🔹 WebSocket (basic)
@socketio.on("connect")
def connect():
    print("Client connected")


# 🔹 Run app
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
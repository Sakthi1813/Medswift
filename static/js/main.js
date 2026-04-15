// ═══════════════════════════════════════════════════════════════
//  MedSwift – main.js (FIXED FOR DEPLOYMENT)
// ═══════════════════════════════════════════════════════════════

// ✅ YOUR LIVE BACKEND
const BASE_URL = "https://medswift-production.up.railway.app";

let currentUser  = null;
let userLat      = null;
let userLon      = null;
let selectedType = "General";
let currentBooking = null;
let trackingInterval = null;

let socket = null;
let pollingInterval = null;
let selectedAmbulance = null;


// ───────────────────────────────────────────
// Auth
// ───────────────────────────────────────────
auth.onAuthStateChanged(user => {
  if (!user) { window.location.href = "/login"; return; }
  currentUser = user;
  document.getElementById("user-display").textContent =
    user.displayName || user.email.split("@")[0];
  detectLocation();
});

function handleLogout() {
  auth.signOut().then(() => window.location.href = "/login");
}


// ───────────────────────────────────────────
// Location
// ───────────────────────────────────────────
function detectLocation() {
  if (!navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(
    pos => {
      userLat = pos.coords.latitude;
      userLon = pos.coords.longitude;
      setUserMarker(userLat, userLon);
      loadNearestHospitals();
      loadNearbyAmbulances();
    },
    () => {
      userLat = 28.6139;
      userLon = 77.2090;
      setUserMarker(userLat, userLon);
      loadNearestHospitals();
      loadNearbyAmbulances();
    }
  );
}


// ───────────────────────────────────────────
// Hospitals
// ───────────────────────────────────────────
async function loadNearestHospitals() {
  if (!userLat || !userLon) return;

  try {
    const res = await fetch(`${BASE_URL}/api/find-hospitals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude: userLat, longitude: userLon, count: 5 })
    });

    const data = await res.json();

    if (data.success) {
      showNearestHospitals(data.hospitals);
    }

  } catch (e) {
    console.error("Hospital error:", e);
  }
}


// ───────────────────────────────────────────
// Ambulances
// ───────────────────────────────────────────
async function loadNearbyAmbulances() {
  if (!userLat || !userLon) return;

  try {
    const res = await fetch(`${BASE_URL}/api/nearby-ambulances`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude: userLat, longitude: userLon })
    });

    const data = await res.json();

    if (data.success) {
      renderNearbyAmbulances(data.ambulances);
    }

  } catch (e) {
    console.error("Ambulance error:", e);
  }
}


// ───────────────────────────────────────────
// Booking
// ───────────────────────────────────────────
async function initiateBooking() {

  const res = await fetch(`${BASE_URL}/api/find-ambulance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ latitude: userLat, longitude: userLon })
  });

  const data = await res.json();

  if (!data.success) {
    alert("No ambulance available");
    return;
  }

  proceedToBooking(data.ambulance);
}


async function proceedToBooking(ambulance) {

  const hospRes = await fetch(`${BASE_URL}/api/find-hospitals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      latitude: userLat,
      longitude: userLon,
      count: 1
    })
  });

  const hospData = await hospRes.json();
  const hospital = hospData.hospitals[0];

  const bookRes = await fetch(`${BASE_URL}/api/create-booking`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ambulance,
      hospital,
      user_lat: userLat,
      user_lon: userLon,
      user_email: currentUser.email,
      user_name: currentUser.displayName || currentUser.email
    })
  });

  const booking = await bookRes.json();

  if (booking.success) {
    alert("Booking Confirmed!");
  }
}

// ═══════════════════════════════════════════
// MedSwift – CLEAN SIMPLE VERSION
// ═══════════════════════════════════════════

const BASE_URL = "https://medswift-production.up.railway.app";

let currentUser = null;
let userLat = null;
let userLon = null;
let currentBooking = null;

// ───────────────────────────────────────────
// AUTH
// ───────────────────────────────────────────
auth.onAuthStateChanged(user => {
  if (!user) {
    window.location.href = "/login";
    return;
  }

  currentUser = user;
  document.getElementById("user-display").textContent =
    user.displayName || user.email.split("@")[0];

  detectLocation();
});

function handleLogout() {
  auth.signOut().then(() => window.location.href = "/login");
}

// ───────────────────────────────────────────
// LOCATION
// ───────────────────────────────────────────
function detectLocation() {
  navigator.geolocation.getCurrentPosition(
    pos => {
      userLat = pos.coords.latitude;
      userLon = pos.coords.longitude;

      setUserMarker(userLat, userLon);
      loadNearestHospitals();
    },
    () => {
      // fallback
      userLat = 28.6139;
      userLon = 77.2090;

      setUserMarker(userLat, userLon);
      loadNearestHospitals();
    }
  );
}

// ───────────────────────────────────────────
// HOSPITALS
// ───────────────────────────────────────────
async function loadNearestHospitals() {
  try {
    const res = await fetch(`${BASE_URL}/api/find-hospitals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude: userLat, longitude: userLon })
    });

    const data = await res.json();
    if (data.success) showNearestHospitals(data.hospitals);

  } catch (err) {
    console.error("Hospital error:", err);
  }
}

// ───────────────────────────────────────────
// BOOKING
// ───────────────────────────────────────────
async function initiateBooking() {
  try {
    // 🚑 get ambulance
    const ambRes = await fetch(`${BASE_URL}/api/find-ambulance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude: userLat, longitude: userLon })
    });

    const ambData = await ambRes.json();
    if (!ambData.success) {
      alert("No ambulance available");
      return;
    }

    const ambulance = ambData.ambulance;

    // 🏥 get hospital
    const hospRes = await fetch(`${BASE_URL}/api/find-hospitals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude: userLat, longitude: userLon })
    });

    const hospital = (await hospRes.json()).hospitals[0];

    // 📦 create booking
    const bookRes = await fetch(`${BASE_URL}/api/create-booking`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ambulance,
        hospital,
        user_lat: userLat,
        user_lon: userLon,
        user_email: currentUser.email,
        user_name: currentUser.displayName || "User"
      })
    });

    const data = await bookRes.json();

    if (data.success) {
      currentBooking = data.booking;

      showBookingDetails(currentBooking);
      startLiveTracking(currentBooking);
    }

  } catch (err) {
    console.error("Booking error:", err);
  }
}

// ───────────────────────────────────────────
// LIVE TRACKING (SIMPLIFIED)
// ───────────────────────────────────────────
function startLiveTracking(b) {
  if (!b.ambulance) return;

  document.getElementById("b-status").innerText = "En Route 🚑";

  animateAmbulance(
    b.ambulance.latitude,
    b.ambulance.longitude,
    userLat,
    userLon
  );
}

// ───────────────────────────────────────────
// UI
// ───────────────────────────────────────────
function showBookingDetails(b) {
  document.getElementById("booking-panel").style.display = "block";

  document.getElementById("b-id").innerText = "ID: " + b.booking_id;
  document.getElementById("b-driver").innerText =
    b.ambulance?.driver_name || "-";
  document.getElementById("b-vehicle").innerText =
    b.ambulance?.vehicle_number || "-";
}

// ───────────────────────────────────────────
// CANCEL BOOKING
// ───────────────────────────────────────────
function cancelBooking() {
  currentBooking = null;

  document.getElementById("booking-panel").style.display = "none";

  alert("Booking Cancelled ❌");
}

// ───────────────────────────────────────────
// SHOW HOSPITALS
// ───────────────────────────────────────────
function showNearestHospitals(hospitals) {

  const panel = document.getElementById("hospitals-panel");
  const list = document.getElementById("hospitals-list");

  panel.style.display = "block";
  list.innerHTML = "";

  hospitals.forEach((h, index) => {

    const item = document.createElement("div");
    item.className = "hospital-item";

    item.innerHTML = `
      <strong>${index + 1}. ${h.name}</strong><br/>
      Distance: ${h.distance_km?.toFixed(2) || "-"} km
    `;

    list.appendChild(item);
  });
}
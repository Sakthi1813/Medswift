// ═══════════════════════════════════════════════════════════════
// MedSwift – main.js (FINAL PRO VERSION)
// ═══════════════════════════════════════════════════════════════

const BASE_URL = "https://medswift-production.up.railway.app";

let currentUser = null;
let userLat = null;
let userLon = null;

let currentBooking = null;
let trackingInterval = null;

// ───────────────────────────────────────────
// AUTH
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
  const res = await fetch(`${BASE_URL}/api/find-hospitals`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ latitude:userLat, longitude:userLon })
  });

  const data = await res.json();
  if (data.success) showNearestHospitals(data.hospitals);
}

// ───────────────────────────────────────────
// BOOKING
// ───────────────────────────────────────────
async function initiateBooking() {

  const ambRes = await fetch(`${BASE_URL}/api/find-ambulance`, {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ latitude:userLat, longitude:userLon })
  });

  const ambData = await ambRes.json();
  if (!ambData.success) return alert("No ambulance");

  const ambulance = ambData.ambulance;

  const hospRes = await fetch(`${BASE_URL}/api/find-hospitals`, {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ latitude:userLat, longitude:userLon })
  });

  const hospital = (await hospRes.json()).hospitals[0];

  const bookRes = await fetch(`${BASE_URL}/api/create-booking`, {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      ambulance,
      hospital,
      user_lat:userLat,
      user_lon:userLon,
      user_email:currentUser.email,
      user_name:currentUser.displayName || "User"
    })
  });

  const booking = await bookRes.json();

  if (booking.success) {
    currentBooking = booking.booking;

    showBookingDetails(currentBooking);
    startLiveTracking(currentBooking);
  }
}

// ───────────────────────────────────────────
// SHOW BOOKING UI
// ───────────────────────────────────────────
function showBookingDetails(b) {
  document.getElementById("booking-panel").style.display = "block";

  document.getElementById("b-id").innerText = "ID: " + b.booking_id;
  document.getElementById("b-driver").innerText =
    "Driver: " + (b.ambulance?.driver_name || "-");
  document.getElementById("b-vehicle").innerText =
    "Vehicle: " + (b.ambulance?.vehicle_number || "-");

  drawRouteFromBooking(b);
}

// ───────────────────────────────────────────
// DRAW ROUTE
// ───────────────────────────────────────────
function drawRouteFromBooking(b) {
  if (!b.route || !b.route.route) return;

  const coords = b.route.route.map(p => [p[0], p[1]]);
  drawRoute(coords);

  setAmbulanceMarker(
    b.ambulance.latitude,
    b.ambulance.longitude,
    b.ambulance.driver_name
  );

  setHospitalMarker(
    b.hospital.latitude,
    b.hospital.longitude,
    b.hospital.name
  );
}

// ───────────────────────────────────────────
// LIVE TRACKING (SIMULATION)
// ───────────────────────────────────────────
function startLiveTracking(b) {

  const route = b.route?.route;
  if (!route) return;

  let i = 0;

  trackingInterval = setInterval(() => {
    if (i >= route.length) return clearInterval(trackingInterval);

    const [lat, lon] = route[i];
    updateAmbulancePosition(lat, lon);

    i++;
  }, 1000);
}

// ───────────────────────────────────────────
// CANCEL BOOKING
// ───────────────────────────────────────────
function cancelBooking() {
  if (!currentBooking) return;

  clearInterval(trackingInterval);
  clearRoute();

  document.getElementById("booking-panel").style.display = "none";

  alert("Booking Cancelled ❌");
}

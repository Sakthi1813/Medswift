// ═══════════════════════════════════════════════════════════════
// MedSwift – map.js (FINAL WORKING VERSION)
// ═══════════════════════════════════════════════════════════════

let map;
let userMarker;
let ambulanceMarker;
let hospitalMarker;
let routePolyline;

// ───────────────────────────────────────────
// INIT MAP
// ───────────────────────────────────────────
function initMap(lat = 28.6139, lon = 77.2090) {

  if (map) return;

  map = L.map("map").setView([lat, lon], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);
}

// ───────────────────────────────────────────
// USER MARKER
// ───────────────────────────────────────────
function setUserMarker(lat, lon) {

  if (!map) {
    initMap(lat, lon); // 🔥 THIS FIXES YOUR ISSUE
  }

  if (userMarker) {
    userMarker.setLatLng([lat, lon]);
  } else {
    userMarker = L.marker([lat, lon])
      .addTo(map)
      .bindPopup("📍 You are here");
  }

  map.setView([lat, lon], 14);
}

// ───────────────────────────────────────────
// AMBULANCE
// ───────────────────────────────────────────
function setAmbulanceMarker(lat, lon, label) {

  if (!map) return;

  if (ambulanceMarker) {
    ambulanceMarker.setLatLng([lat, lon]);
  } else {
    ambulanceMarker = L.marker([lat, lon])
      .addTo(map)
      .bindPopup(`🚑 ${label}`);
  }
}

// ───────────────────────────────────────────
// HOSPITAL
// ───────────────────────────────────────────
function setHospitalMarker(lat, lon, name) {

  if (!map) return;

  if (hospitalMarker) {
    hospitalMarker.setLatLng([lat, lon]);
  } else {
    hospitalMarker = L.marker([lat, lon])
      .addTo(map)
      .bindPopup(`🏥 ${name}`);
  }
}

// ───────────────────────────────────────────
// ROUTE
// ───────────────────────────────────────────
function drawRoute(coords) {

  if (!map) return;

  if (routePolyline) {
    map.removeLayer(routePolyline);
  }

  routePolyline = L.polyline(coords, {
    color: "blue",
    weight: 5
  }).addTo(map);

  map.fitBounds(routePolyline.getBounds());
}

// ───────────────────────────────────────────
// UPDATE AMBULANCE
// ───────────────────────────────────────────
function updateAmbulancePosition(lat, lon) {

  if (ambulanceMarker) {
    ambulanceMarker.setLatLng([lat, lon]);
  }
}

// ───────────────────────────────────────────
// CLEAR
// ───────────────────────────────────────────
function clearRoute() {

  if (routePolyline) {
    map.removeLayer(routePolyline);
    routePolyline = null;
  }

  if (ambulanceMarker) {
    map.removeLayer(ambulanceMarker);
    ambulanceMarker = null;
  }

  if (hospitalMarker) {
    map.removeLayer(hospitalMarker);
    hospitalMarker = null;
  }
}
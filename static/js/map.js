// ═══════════════════════════════════════════════════════════════
// MedSwift – map.js (FINAL CLEAN + STABLE VERSION)
// ═══════════════════════════════════════════════════════════════

let map = null;
let userMarker = null;
let ambulanceMarker = null;
let hospitalMarker = null;
let routePolyline = null;

let hospitalMarkers = [];
let nearbyAmbulanceMarkers = {};

// ───────────────────────────────────────────
// ICONS
// ───────────────────────────────────────────
const ICONS = {
  user: L.divIcon({
    className: "",
    html: '<div style="width:18px;height:18px;background:#6366f1;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 3px #6366f1;"></div>',
    iconSize: [18,18], iconAnchor: [9,9]
  }),

  ambulance: L.divIcon({
    className: "",
    html: '<div style="width:30px;height:30px;background:#ef4444;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;border:2px solid #fff;">🚑</div>',
    iconSize: [30,30], iconAnchor: [15,15]
  }),

  ambulanceBusy: L.divIcon({
    className: "",
    html: '<div style="width:26px;height:26px;background:#94a3b8;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;border:2px solid #fff;">🚑</div>',
    iconSize: [26,26], iconAnchor: [13,13]
  }),

  hospital: L.divIcon({
    className: "",
    html: '<div style="width:28px;height:28px;background:#10b981;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;">H</div>',
    iconSize: [28,28], iconAnchor: [14,14]
  }),

  hospitalSmall: L.divIcon({
    className: "",
    html: '<div style="width:14px;height:14px;background:#10b981;border-radius:50%;border:2px solid #fff;"></div>',
    iconSize: [14,14], iconAnchor: [7,7]
  })
};


// ───────────────────────────────────────────
// INIT MAP
// ───────────────────────────────────────────
function initMap(lat, lon) {
  if (map) {
    map.setView([lat, lon], 13);
    return;
  }

  map = L.map("map").setView([lat, lon], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);
}


// ───────────────────────────────────────────
// USER LOCATION
// ───────────────────────────────────────────
function setUserMarker(lat, lon) {
  if (!map) initMap(lat, lon);

  if (userMarker) {
    userMarker.setLatLng([lat, lon]);
  } else {
    userMarker = L.marker([lat, lon], { icon: ICONS.user })
      .addTo(map)
      .bindPopup("📍 Your Location");
  }

  map.setView([lat, lon], 14);
}


// ───────────────────────────────────────────
// SELECTED AMBULANCE
// ───────────────────────────────────────────
function setAmbulanceMarker(lat, lon, label) {
  if (ambulanceMarker) map.removeLayer(ambulanceMarker);

  ambulanceMarker = L.marker([lat, lon], { icon: ICONS.ambulance })
    .addTo(map)
    .bindPopup(`🚑 ${label || "Assigned Ambulance"}`);
}


// ───────────────────────────────────────────
// SELECTED HOSPITAL
// ───────────────────────────────────────────
function setHospitalMarker(lat, lon, name) {
  if (hospitalMarker) map.removeLayer(hospitalMarker);

  hospitalMarker = L.marker([lat, lon], { icon: ICONS.hospital })
    .addTo(map)
    .bindPopup(`🏥 ${name}`);
}


// ───────────────────────────────────────────
// SHOW NEAREST HOSPITALS
// ───────────────────────────────────────────
function showNearestHospitals(hospitals) {

  hospitalMarkers.forEach(m => map.removeLayer(m));
  hospitalMarkers = [];

  hospitals.forEach((h, i) => {
    const icon = i === 0 ? ICONS.hospital : ICONS.hospitalSmall;

    const marker = L.marker([h.latitude, h.longitude], { icon })
      .addTo(map)
      .bindPopup(`🏥 ${h.name}`);

    hospitalMarkers.push(marker);
  });

  document.getElementById("hospitals-panel").style.display = "block";
}


// ───────────────────────────────────────────
// SHOW NEARBY AMBULANCES (REAL-TIME)
// ───────────────────────────────────────────
function showNearbyAmbulancesOnMap(ambulances) {
  if (!map) return;

  const incoming = {};
  ambulances.forEach(a => incoming[a.id] = a);

  // Remove old markers
  Object.keys(nearbyAmbulanceMarkers).forEach(id => {
    if (!incoming[id]) {
      map.removeLayer(nearbyAmbulanceMarkers[id]);
      delete nearbyAmbulanceMarkers[id];
    }
  });

  // Add/update markers
  ambulances.forEach(a => {
    const lat = parseFloat(a.latitude);
    const lon = parseFloat(a.longitude);

    const icon = a.status === "available"
      ? ICONS.ambulance
      : ICONS.ambulanceBusy;

    const popup = `
      <strong>${a.driver_name}</strong><br/>
      🚑 ${a.vehicle_number}<br/>
      ${a.status === "available" ? "✅ Available" : "🔴 Busy"}
    `;

    if (nearbyAmbulanceMarkers[a.id]) {
      nearbyAmbulanceMarkers[a.id]
        .setLatLng([lat, lon])
        .setIcon(icon)
        .setPopupContent(popup);
    } else {
      nearbyAmbulanceMarkers[a.id] =
        L.marker([lat, lon], { icon })
          .addTo(map)
          .bindPopup(popup);
    }
  });
}


// ───────────────────────────────────────────
// DRAW ROUTE
// ───────────────────────────────────────────
function drawRoute(coords) {
  if (routePolyline) map.removeLayer(routePolyline);

  if (!coords || coords.length < 2) return;

  routePolyline = L.polyline(coords, {
    color: "#6366f1",
    weight: 5
  }).addTo(map);

  map.fitBounds(routePolyline.getBounds());
}


// ───────────────────────────────────────────
// UPDATE AMBULANCE POSITION
// ───────────────────────────────────────────
function updateAmbulancePosition(lat, lon) {
  if (ambulanceMarker) {
    ambulanceMarker.setLatLng([lat, lon]);
  }
}


// ───────────────────────────────────────────
// CLEAR EVERYTHING
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

  hospitalMarkers.forEach(m => map.removeLayer(m));
  hospitalMarkers = [];
}

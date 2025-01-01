var map = L.map("map").setView([0, 0], 2); // Initialize the map

// Add OpenStreetMap tiles
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

var standardLayer = L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    attribution: "&copy; OpenStreetMap contributors",
  }
).addTo(map);

// Satellite Map Layer
var satelliteLayer = L.tileLayer(
  "https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
  {
    subdomains: ["mt0", "mt1", "mt2", "mt3"],
    attribution: "&copy; Google Maps",
  }
);

var isSatellite = false; // Track current map type

// Toggle Map Type Function
function toggleMapType() {
  var button = document.getElementById("map-toggle");

  if (isSatellite) {
    map.removeLayer(satelliteLayer);
    standardLayer.addTo(map);
    button.textContent = "Switch to Satellite View";
  } else {
    map.removeLayer(standardLayer);
    satelliteLayer.addTo(map);
    button.textContent = "Switch to Standard View";
  }

  isSatellite = !isSatellite; // Toggle the state
}


var marker,
  circle,
  closestFacility = null,
  closestDistance = Infinity;
var facilityMarkers = L.layerGroup(); // Layer group for facility markers
var routeLayer = null; // Layer to display the route
var selectedFacility = null; // Store the selected facility's coordinates

function clearFacilityMarkers() {
  facilityMarkers.clearLayers();
  if (routeLayer) {
    map.removeLayer(routeLayer); // Clear the route layer
    routeLayer = null;
  }
  selectedFacility = null; // Reset selected facility
}
function getRoute() {
  if (!marker || !closestFacility) {
    console.error("User location or facility location not set.");
    return;
  }


  const apiKey = "5b3ce3597851110001cf6248a573d2964b6f46deb63e472aa297b2c9"; 
  const url = `https://api.openrouteservice.org/v2/directions/foot-walking?api_key=${apiKey}&start=${
    marker.getLatLng().lng
  },${marker.getLatLng().lat}&end=${closestFacility.lng},${
    closestFacility.lat
  }`;


  fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      if (!data.features || data.features.length === 0) {
        throw new Error("No route found in API response.");
      }

      if (routeLayer) {
        map.removeLayer(routeLayer); // Clear existing route
      }

      // Display the route on the map
      const coordinates = data.features[0].geometry.coordinates.map((coord) => [
        coord[1],
        coord[0],
      ]);
      routeLayer = L.polyline(coordinates, { color: "blue", weight: 4 }).addTo(
        map
      );
      map.fitBounds(routeLayer.getBounds()); // Adjust map view to route

      // Display step-by-step directions
      const steps = data.features[0].properties.segments[0].steps; // Steps from the route
      const directionsList = document.getElementById("directions-list");
      directionsList.innerHTML = ""; // Clear existing directions

      steps.forEach((step, index) => {
        const li = document.createElement("li");
        li.className = "list-group-item";
        li.textContent = `${index + 1}. ${step.instruction}`;
        directionsList.appendChild(li);
      });
    })
    .catch((error) => console.error("Error fetching route:", error));
}

function updateClosestFacilityInfo() {
  const getRouteButton = document.getElementById("get-route");
  if (closestFacility) {
    document.getElementById("closest-facility").textContent =
      closestFacilityName || "Unknown Facility";
    document.getElementById("distance").textContent =
      (closestDistance / 1000).toFixed(2) + " km";
    getRouteButton.disabled = false; // Enable the "Get Route" button
  } else {
    document.getElementById("closest-facility").textContent = "Not found";
    document.getElementById("distance").textContent = "N/A";
    getRouteButton.disabled = true; // Disable the "Get Route" button
  }
}

function loadFacility() {
  var facilityType = document.getElementById("facility-type").value;

  clearFacilityMarkers();
  closestFacility = null;
  closestDistance = Infinity;
  closestFacilityName = null; // Initialize closest facility name
  if (facilityType === "toilets") {
    loadToilets();
  } else if (facilityType === "parks") {
    loadParks();
  } else {
    fetchOverpassAPI(facilityType);
  }
}
// Function to fetch facilities using Overpass API
function fetchOverpassAPI(facilityType) {
  var radius = 2000; // Radius in meters
  var lat = 53.349805; // O'Connell Street Latitude
  var lon = -6.26031; // O'Connell Street Longitude

  // Define tags for Overpass API queries
  const amenityTags = {
    museums: ["tourism=museum", "amenity=museum"],
    churches: [
        "amenity=place_of_worship", 
        "building=church",          
        "historic=church",         
        "religion=christian",       
        "building=cathedral",       
        "amenity=monastery",        

    ],
    shopping_centres: [
        "shop=mall",
        "amenity=shopping_center",
        "landuse=retail",     
        "building=retail",    
        "shop=supermarket",     
        "shop=department_store" 
    ],
};


  const tags = amenityTags[facilityType];
  if (!tags) {
    console.error("Invalid facility type selected.");
    return;
  }

  // Generate Overpass API query for multiple tags
  var queries = tags
    .map((tag) => `node[${tag}](around:${radius}, ${lat}, ${lon});`)
    .join("");
  var query = `[out:json];(${queries});out body;`;

  var overpassUrl = "https://overpass-api.de/api/interpreter";

  fetch(overpassUrl, {
    method: "POST",
    body: "data=" + encodeURIComponent(query),
  })
    .then((response) => response.json())
    .then((data) => {
      if (!data.elements || data.elements.length === 0) {
        console.warn("No results found for the selected facility type.");
        return;
      }

      data.elements.forEach((poi) => {
        
        if (poi.lat && poi.lon) {
          var poiName = poi.tags.name || "Unnamed Facility";
          var poiType = poi.tags.amenity || poi.tags.tourism || "Facility";
          const userLocation = marker ? marker.getLatLng() : L.latLng(lat, lon);
          const distance = userLocation.distanceTo([poi.lat, poi.lon]);
          const isFavorite = userFavorites.some(
            (fav) => fav.latitude === poi.lat && fav.longitude === poi.lon
          );
          if (distance < closestDistance) {
            closestDistance = distance;
            closestFacility = L.latLng(poi.lat, poi.lon);
            closestFacilityName = poiName;
          }

          var poiMarker = L.marker([poi.lat, poi.lon]).bindPopup(`
                                <b>${poiName}</b><br>
                                <i>${poiType}</i><br>
            <button class="btn btn-${isFavorite ? "danger" : "primary"} btn-sm" 
              onclick="toggleFavorite(${poi.lat}, ${poi.lon}, '${poiName}')">
              ${isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            </button>
                                <button class="btn btn-primary btn-sm" onclick="searchOnGoogle('${poiName}')">Search on Google</button>
                            `);
          facilityMarkers.addLayer(poiMarker);

          // Add click event for routing
          poiMarker.on("click", function () {
            selectedFacility = [poi.lat, poi.lon];
            calculateRoute(L.latLng(poi.lat, poi.lon));
          });
        }
      });

      facilityMarkers.addTo(map);
      updateClosestFacilityInfo();
    })
    .catch((error) =>
      console.error("Error fetching Overpass API data:", error)
    );
}

// Function to search for a facility on Google
function searchOnGoogle(query) {
  var encodedQuery = encodeURIComponent(query);
  var googleSearchUrl = `https://www.google.com/search?q=${encodedQuery}`;
  window.open(googleSearchUrl, "_blank");
}

function loadToilets() {
  fetch(urls.toiletGeojson)
    .then((response) => response.json())
    .then((data) => {
      L.geoJSON(data, {
        onEachFeature: function (feature, layer) {
          const toiletName = feature.properties.location || "Unnamed Toilet";
          const isFavorite = userFavorites.some(
            (fav) =>
              fav.latitude === feature.geometry.coordinates[1] &&
              fav.longitude === feature.geometry.coordinates[0]
          );
          // Bind popup with the "Add to Favorites" button
          layer.bindPopup(`
                            <b>${toiletName}</b><br>
                            <i>Opening Hours:</i> ${
                              feature.properties.opening_hours || "N/A"
                            }<br>
            <button class="btn btn-${isFavorite ? "danger" : "primary"} btn-sm" 
              onclick="toggleFavorite(${feature.geometry.coordinates[1]}, ${feature.geometry.coordinates[0]}, '${toiletName}')">
              ${isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            </button>
                        `);

          facilityMarkers.addLayer(layer);

          // Calculate the closest facility
          if (marker) {
            const distance = marker.getLatLng().distanceTo(layer.getLatLng());
            const closesttoiletname = feature.properties.location;
            if (distance < closestDistance) {
              closestDistance = distance;
              closestFacility = layer.getLatLng();
              closestFacilityName = closesttoiletname;
            }
          }

          // Add click event to calculate route
          layer.on("click", function () {
            selectedFacility = layer.getLatLng();
            calculateRoute(selectedFacility);
          });
        },
      }).addTo(facilityMarkers);

      facilityMarkers.addTo(map);
      updateClosestFacilityInfo();
    })
    .catch((error) => console.error("Error loading toilets:", error));
}

function loadParks() {
  fetch(urls.parksGeojson)
  
    .then((response) => response.json())
    .then((data) => {
      L.geoJSON(data, {
        style: function () {
          return {
            color: "green",
            fillOpacity: 0.5,
          };
        },
        onEachFeature: function (feature, layer) {
          const isFavorite = userFavorites.some(
            (fav) =>
              fav.latitude === center.lat && fav.longitude === center.lng

          );
          const parkName = feature.properties.Name || "Unnamed Park";
          const center = layer.getBounds().getCenter(); // Get the center of the polygon
          // Bind popup with the "Add to Favorites" button
          layer.bindPopup(`
                            <b>${parkName}</b><br>
                            <i>Typology:</i> ${
                              feature.properties.Typology || "N/A"
                            }<br>
                            <i>Area:</i> ${
                              feature.properties.Area_Acre || "N/A"
                            } acres<br>
            <button class="btn btn-${isFavorite ? "danger" : "primary"} btn-sm" 
              onclick="toggleFavorite(${center.lat}, ${center.lng}, '${parkName}')">
              ${isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            </button>
                                        <button class="btn btn-primary btn-sm" onclick="searchOnGoogle('${parkName}')">
              Search on Google
            </button>
                        `);

          facilityMarkers.addLayer(layer);

          // Calculate the closest facility
          if (marker) {
            const distance = marker.getLatLng().distanceTo(center);
            const closestParkName = feature.properties.Name;
            if (distance < closestDistance) {
              closestDistance = distance;
              closestFacility = center;
              closestFacilityName = closestParkName;
            }
          }

          layer.on("click", function () {
            selectedFacility = center;
            calculateRoute(selectedFacility);
          });
        },
      }).addTo(facilityMarkers);

      facilityMarkers.addTo(map);
      updateClosestFacilityInfo();
    })
    .catch((error) => console.error("Error loading parks:", error));
}

function updateMap(latitude, longitude, accuracy) {
  if (marker) {
    map.removeLayer(marker);
  }
  if (circle) {
    map.removeLayer(circle);
  }

  marker = L.marker([latitude, longitude]).addTo(map);
  circle = L.circle([latitude, longitude], { radius: accuracy }).addTo(map);
  map.setView([latitude, longitude], 13);

  loadFacility();
}

function updateLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function (position) {
        var latitude = position.coords.latitude;
        var longitude = position.coords.longitude;
        var accuracy = position.coords.accuracy;

        updateMap(latitude, longitude, accuracy);

        fetch(urls.updateLocation, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "X-CSRFToken": getCSRFToken(),
          },
          body: "latitude=" + latitude + "&longitude=" + longitude,
        })
          .then((response) => response.json())
          .catch((error) => console.error("Error updating location:", error));
      },
      function (error) {
        console.error("Error getting location:", error);
      }
    );
  } else {
    console.error("Geolocation is not supported by this browser.");
  }
}

// Function to calculate and display route
function calculateRoute(destination) {
  if (!marker || !destination) {
    console.error("User location or facility location not set.");
    return;
  }

  const apiKey = "5b3ce3597851110001cf6248a573d2964b6f46deb63e472aa297b2c9"; // Replace with your API key
  const url = `https://api.openrouteservice.org/v2/directions/foot-walking?api_key=${apiKey}&start=${
    marker.getLatLng().lng
  },${marker.getLatLng().lat}&end=${destination.lng},${destination.lat}`;

  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      if (routeLayer) {
        map.removeLayer(routeLayer); // Clear existing route
      }

      // Display route on the map
      const coordinates = data.features[0].geometry.coordinates.map((coord) => [
        coord[1],
        coord[0],
      ]);
      routeLayer = L.polyline(coordinates, { color: "blue", weight: 4 }).addTo(
        map
      );
      map.fitBounds(routeLayer.getBounds());

      // Display directions in the panel
      const steps = data.features[0].properties.segments[0].steps; // Steps of the route
      const directionsList = document.getElementById("directions-list");
      directionsList.innerHTML = ""; // Clear existing directions

      steps.forEach((step, index) => {
        const li = document.createElement("li");
        li.className = "list-group-item";
        li.textContent = `${index + 1}. ${step.instruction}`;
        directionsList.appendChild(li);
      });
    })
    .catch((error) => console.error("Error fetching route:", error));
}

// On page load, update the location
document.addEventListener("DOMContentLoaded", function () {
  updateLocation();
});

let showingFavorites = false; // Track whether we're showing only favorites
function toggleFavoritesView() {
  const button = document.getElementById("toggle-favorites");

  if (showingFavorites) {
    // Load all amenities
    loadFacility();
    button.textContent = "Show Favorites";
    button.classList.remove("btn-danger");
    button.classList.add("btn-info");
  } else {
    // Load only favorites
    loadFavorites();
    button.textContent = "Show All";
    button.classList.remove("btn-info");
    button.classList.add("btn-danger");
  }

  showingFavorites = !showingFavorites; // Toggle the state
  selectedFacility = null; // Reset selected facility when toggling
}
function toggleFavorite(lat, lng, name) {
  fetch(urls.toggleFavorite, {
      method: "POST",
      headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCSRFToken(), 
      },
      body: JSON.stringify({ latitude: lat, longitude: lng, name: name }),
  })
      .then((response) => {
          if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
      })
      .then((data) => {
          if (data.success) {
              alert(
                  `${name} has been ${
                      data.action === "added" ? "added to" : "removed from"
                  } your favorites.`
              );
              
              if (showingFavorites) {
                loadFavorites(); // If in "Favorites" view, refresh the favorites
              } else {
                loadFacility(); // If in regular view, refresh the facilities
              }
            } else {
              alert("Error toggling favorite: " + data.error);
            }
      })
      .catch((error) => console.error("Error toggling favorite:", error));
}

// Helper function to get CSRF token from cookies
function getCSRFToken() {
  const name = "csrftoken";
  const cookies = document.cookie.split(";");

  for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.startsWith(name + "=")) {
          return decodeURIComponent(cookie.substring(name.length + 1));
      }
  }
  return null; // Return null if CSRF token is not found
}
let userFavorites = [];

function loadFavorites() {
  fetch(urls.getFavorites)
    .then((response) => response.json())
    .then((data) => {
      userFavorites = data.favorites; 
      clearFacilityMarkers(); // Clear all existing markers

      // Loop through favorite amenities and display them
      data.favorites.forEach((fav) => {
        const favMarker = L.marker([fav.latitude, fav.longitude]).bindPopup(`
                            <b>${fav.name}</b><br>
                            <button class="btn btn-danger btn-sm" onclick="toggleFavorite(${fav.latitude}, ${fav.longitude}, '${fav.name}')">
                                Remove from Favorites
                            </button>
                                                    <button class="btn btn-primary btn-sm" onclick="calculateRoute(L.latLng(${fav.latitude}, ${fav.longitude}))">
                            Get Route
                        </button>
                        `);

        favMarker.on("click", function () {
          selectedFacility = L.latLng(fav.latitude, fav.longitude);
        });

        facilityMarkers.addLayer(favMarker);
      });

      facilityMarkers.addTo(map);
    })
    .catch((error) => console.error("Error loading favorites:", error));
}


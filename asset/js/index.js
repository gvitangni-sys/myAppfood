// ========================================
// GESTION DE LA GÉOLOCALISATION (HEADER)
// ========================================

let userLocation = {
  lat: null,
  lng: null,
  city: "Votre position",
  country: "",
};

// Fonction pour obtenir le nom de la ville via géocodage inverse
async function getCityName(lat, lng) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
      {
        headers: {
          "Accept-Language": "fr",
        },
      }
    );

    const data = await response.json();
    let cityName = "Votre position";

    if (data.address) {
      cityName =
        data.address.city ||
        data.address.town ||
        data.address.village ||
        data.address.municipality ||
        data.address.country ||
        data.address.state ||
        "Votre position";
    }

    return {
      city: cityName,
      country: data.address.country || "",
      fullAddress: data.display_name || "",
    };
  } catch (error) {
    console.error("Erreur lors du géocodage:", error);
    return {
      city: "Votre position",
      country: "",
      fullAddress: "",
    };
  }
}

// Fonction pour mettre à jour l'affichage de la position
function updateLocationDisplay(cityName) {
  const locationText = document.getElementById("location-text");
  const locationIcon = document.querySelector(
    "#location-selector i.fa-location-dot"
  );

  if (locationText) {
    locationText.textContent = cityName;
    locationText.style.transition = "all 0.4s ease";
    locationText.style.color = "#f97316";

    setTimeout(() => {
      locationText.style.color = "";
    }, 1000);
  }

  if (locationIcon) {
    locationIcon.classList.add("animate-pulse");
    setTimeout(() => {
      locationIcon.classList.remove("animate-pulse");
    }, 1500);
  }
}

// Fonction pour afficher une notification
function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.className = `fixed top-24 right-6 z-50 px-6 py-4 rounded-lg shadow-xl transform transition-all duration-300 translate-x-full ${
    type === "success" ? "bg-green-500" : "bg-orange-500"
  } text-white font-medium`;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.transform = "translateX(0)";
  }, 100);

  setTimeout(() => {
    notification.style.transform = "translateX(150%)";
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

// Fonction principale de géolocalisation
function requestLocation() {
  const locationText = document.getElementById("location-text");

  if (!navigator.geolocation) {
    alert(
      "Désolé, la géolocalisation n'est pas supportée par votre navigateur."
    );
    return;
  }

  locationText.textContent = "Localisation...";
  locationText.classList.add("animate-pulse");

  navigator.geolocation.getCurrentPosition(
    async function (position) {
      userLocation.lat = position.coords.latitude;
      userLocation.lng = position.coords.longitude;

      console.log("Position obtenue:", userLocation.lat, userLocation.lng);

      const locationInfo = await getCityName(
        userLocation.lat,
        userLocation.lng
      );
      userLocation.city = locationInfo.city;
      userLocation.country = locationInfo.country;

      locationText.classList.remove("animate-pulse");
      updateLocationDisplay(userLocation.city);
      showNotification(`Position détectée: ${userLocation.city}`, "success");

      // Déclencher l'événement pour la carte
      const locationEvent = new CustomEvent("locationUpdated", {
        detail: userLocation,
      });
      document.dispatchEvent(locationEvent);
    },
    function (error) {
      locationText.classList.remove("animate-pulse");
      locationText.textContent = "Votre position";

      let errorMessage = "";
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage =
            "Permission refusée.\n\nVeuillez autoriser l'accès à votre position.";
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = "Position indisponible.";
          break;
        case error.TIMEOUT:
          errorMessage = "Délai dépassé.";
          break;
        default:
          errorMessage = "Erreur inconnue.";
      }

      alert(errorMessage);
      console.error("Erreur de géolocalisation:", error);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    }
  );
}

// Event listener sur le sélecteur de localisation
document
  .getElementById("location-selector")
  .addEventListener("click", function () {
    requestLocation();
  });

// ========================================
// GESTION DE LA CARTE ET DES ÉTABLISSEMENTS
// ========================================

let map = L.map("map").setView([6.8775, -6.3585], 13); // Daloa par défaut
let userMarker = null;
let currentLocation = null;
let markers = [];
let routeLayer = null;
let currentFilter = "all";
let places = []; // Sera rempli par l'API Overpass

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
  maxZoom: 19,
}).addTo(map);

// ========================================
// INTÉGRATION OVERPASS API (DONNÉES RÉELLES)
// ========================================

async function loadRealPlaces(lat, lng, radius = 5000) {
  const placesList = document.getElementById("places-list");
  const loadingMessage = document.getElementById("loading-message");

  // Afficher le spinner de chargement
  loadingMessage.innerHTML = `
    <div class="flex flex-col items-center justify-center py-20">
      <div class="loading-spinner mb-4"></div>
      <p class="text-gray-600 text-center">Recherche des établissements à proximité...</p>
    </div>
  `;
  loadingMessage.classList.remove("hidden");

  try {
    // Requête Overpass pour restaurants et pharmacies
    const overpassQuery = `
      [out:json][timeout:25];
      (
        node["amenity"="restaurant"](around:${radius},${lat},${lng});
        node["amenity"="fast_food"](around:${radius},${lat},${lng});
        node["amenity"="cafe"](around:${radius},${lat},${lng});
        node["amenity"="pharmacy"](around:${radius},${lat},${lng});
      );
      out body;
    `;

    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: overpassQuery,
    });

    const data = await response.json();

    // Transformer les données Overpass en format utilisable
    places = data.elements.map((element, index) => {
      const isPharmacy = element.tags.amenity === "pharmacy";
      const name =
        element.tags.name || (isPharmacy ? "Pharmacie" : "Restaurant");

      return {
        id: element.id || index,
        name: name,
        type: isPharmacy ? "pharmacy" : "restaurant",
        lat: element.lat,
        lng: element.lon,
        image: isPharmacy
          ? "https://images.unsplash.com/photo-1576602975581-e646dfc7e769?w=400"
          : "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400",
        description: element.tags.cuisine
          ? `Cuisine: ${element.tags.cuisine}`
          : isPharmacy
          ? "Pharmacie de proximité"
          : "Restaurant local",
        status: element.tags.opening_hours || "Horaires non disponibles",
        isOpen: true,
        rating: 4.0,
        phone:
          element.tags.phone ||
          element.tags["contact:phone"] ||
          "Non disponible",
        address: element.tags["addr:street"] || "",
      };
    });

    console.log(`${places.length} établissements trouvés via Overpass API`);

    if (places.length === 0) {
      loadingMessage.innerHTML = `
        <div class="flex flex-col items-center justify-center py-20">
          <i class="fas fa-search text-gray-400 text-5xl mb-4"></i>
          <p class="text-gray-600 text-center">Aucun établissement trouvé dans cette zone.</p>
          <p class="text-gray-500 text-sm text-center mt-2">Essayez de zoomer sur une autre zone ou augmentez le rayon de recherche.</p>
        </div>
      `;
    } else {
      displayPlaces(currentFilter);
    }
  } catch (error) {
    console.error("Erreur lors du chargement des données:", error);
    loadingMessage.innerHTML = `
      <div class="flex flex-col items-center justify-center py-20">
        <i class="fas fa-exclamation-triangle text-red-500 text-5xl mb-4"></i>
        <p class="text-gray-600 text-center">Erreur lors du chargement des données.</p>
        <button onclick="loadRealPlaces(${lat}, ${lng})" class="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
          Réessayer
        </button>
      </div>
    `;
  }
}

// Calcul de distance
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Créer icône personnalisée
function createCustomIcon(type) {
  const iconClass =
    type === "restaurant" ? "restaurant-marker" : "pharmacy-marker";
  const icon = type === "restaurant" ? "fa-utensils" : "fa-pills";

  return L.divIcon({
    html: `<div class="custom-marker ${iconClass} pulse-animation"><i class="fas ${icon}"></i></div>`,
    className: "custom-marker-wrapper",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

// Afficher les établissements
function displayPlaces(filterType = "all") {
  const placesList = document.getElementById("places-list");
  const loadingMessage = document.getElementById("loading-message");

  if (!currentLocation || places.length === 0) {
    return;
  }

  loadingMessage.classList.add("hidden");
  placesList.innerHTML = "";

  const filteredPlaces = places
    .filter((place) => filterType === "all" || place.type === filterType)
    .map((place) => ({
      ...place,
      distance: calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        place.lat,
        place.lng
      ),
    }))
    .sort((a, b) => a.distance - b.distance);

  filteredPlaces.forEach((place) => {
    const card = document.createElement("div");
    card.className =
      "place-card bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 mb-4";
    card.id = `place-${place.id}`;

    const stars = "★".repeat(Math.floor(place.rating));
    card.innerHTML = `
      <div class="flex">
        <div class="w-1/3 flex-shrink-0">
          <img src="${place.image}" alt="${
      place.name
    }" class="w-full h-full object-cover rounded-l-2xl">
        </div>
        <div class="w-2/3 p-4 flex flex-col">
          <div class="flex items-start justify-between mb-2">
            <h4 class="text-lg font-semibold text-gray-800">${place.name}</h4>
            <span class="text-2xl">${
              place.type === "restaurant" ? "🍽️" : "💊"
            }</span>
          </div>
          <div class="flex items-center gap-2 mb-2 flex-wrap">
            <p class="text-gray-600 text-sm">${place.distance.toFixed(1)} km</p>
            <span class="${
              place.isOpen ? "bg-green-400" : "bg-red-400"
            } text-white px-2 py-1 rounded-full text-xs font-medium">
              ${place.status}
            </span>
          </div>
          <div class="text-sm text-gray-600 mb-2">${stars} ${place.rating}</div>
          <p class="text-gray-500 text-sm mb-3 line-clamp-2">${
            place.description
          }</p>
          <button onclick="showRoute(${
            place.id
          })" class="mt-auto bg-orange-500 rounded-lg px-4 py-2 text-white text-sm font-bold hover:bg-orange-600 transition-all duration-200">
            <i class="fas fa-route mr-2"></i>Voir itinéraire
          </button>
        </div>
      </div>
    `;

    card.addEventListener("click", (e) => {
      if (!e.target.closest("button")) {
        focusOnPlace(place.id);
      }
    });

    placesList.appendChild(card);
  });

  addMarkersToMap(filteredPlaces);
}

// Ajouter marqueurs sur la carte
function addMarkersToMap(filteredPlaces) {
  markers.forEach((marker) => map.removeLayer(marker));
  markers = [];

  filteredPlaces.forEach((place) => {
    const marker = L.marker([place.lat, place.lng], {
      icon: createCustomIcon(place.type),
    }).addTo(map);

    marker.bindPopup(`
      <div class="p-3">
        <h5 class="font-bold text-gray-800 mb-2">${place.name}</h5>
        <p class="text-sm text-gray-600 mb-2">${place.distance.toFixed(
          1
        )} km de vous</p>
        <button onclick="focusOnPlace(${
          place.id
        })" class="w-full bg-orange-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-orange-600 transition-colors">
          Voir détails
        </button>
      </div>
    `);

    marker.on("click", () => {
      focusOnPlace(place.id);
    });

    markers.push(marker);
  });
}

// Centrer sur un établissement
function focusOnPlace(placeId) {
  const place = places.find((p) => p.id === placeId);
  if (!place) return;

  document.querySelectorAll(".place-card").forEach((card) => {
    card.classList.remove("selected");
  });

  const card = document.getElementById(`place-${placeId}`);
  if (card) {
    card.classList.add("selected");
    card.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  map.setView([place.lat, place.lng], 16);

  const marker = markers.find(
    (m) => m.getLatLng().lat === place.lat && m.getLatLng().lng === place.lng
  );

  if (marker) {
    marker.openPopup();
  }
}

// Afficher l'itinéraire
async function showRoute(placeId) {
  const place = places.find((p) => p.id === placeId);
  if (!place || !currentLocation) return;

  if (routeLayer) {
    map.removeLayer(routeLayer);
  }

  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${currentLocation.lng},${currentLocation.lat};${place.lng},${place.lat}?overview=full&geometries=geojson`
    );

    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      routeLayer = L.geoJSON(route.geometry, {
        style: {
          color: "#074a9cff",
          weight: 5,
          opacity: 0.8,
        },
      }).addTo(map);

      map.fitBounds(routeLayer.getBounds(), { padding: [50, 50] });

      const distance = (route.distance / 1000).toFixed(1);
      const duration = Math.round(route.duration / 60);

      L.popup()
        .setLatLng([place.lat, place.lng])
        .setContent(
          `
          <div class="p-3 text-center">
            <h5 class="font-bold text-gray-800 mb-2">${place.name}</h5>
            <p class="text-sm text-gray-600"><i class="fas fa-route text-orange-500"></i> ${distance} km</p>
            <p class="text-sm text-gray-600"><i class="fas fa-clock text-orange-500"></i> ${duration} min</p>
          </div>
        `
        )
        .openOn(map);
    }
  } catch (error) {
    console.error("Erreur lors du calcul de l'itinéraire:", error);
    alert("Impossible de calculer l'itinéraire pour le moment");
  }
}

// Filtres
document.querySelectorAll(".filter-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    document.querySelectorAll(".filter-btn").forEach((b) => {
      b.classList.remove("active", "bg-orange-500", "text-white");
      b.classList.add("bg-gray-200");
    });

    btn.classList.add("active", "bg-orange-500", "text-white");
    btn.classList.remove("bg-gray-200");

    if (btn.id === "filter-all") {
      currentFilter = "all";
    } else if (btn.id === "filter-restaurant") {
      currentFilter = "restaurant";
    } else if (btn.id === "filter-pharmacy") {
      currentFilter = "pharmacy";
    }

    displayPlaces(currentFilter);
  });
});

// Écouter l'événement de mise à jour de localisation depuis le header
document.addEventListener("locationUpdated", async function (event) {
  const location = event.detail;
  console.log("Position mise à jour depuis le header:", location);

  currentLocation = {
    lat: location.lat,
    lng: location.lng,
  };

  if (userMarker) {
    map.removeLayer(userMarker);
  }

  userMarker = L.marker([currentLocation.lat, currentLocation.lng], {
    icon: L.divIcon({
      html: '<div class="custom-marker user-marker pulse-animation"><i class="fas fa-user"></i></div>',
      className: "custom-marker-wrapper",
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    }),
  }).addTo(map);

  userMarker.bindPopup(
    '<div class="p-2 text-center font-semibold">Vous êtes ici</div>'
  );
  map.setView([currentLocation.lat, currentLocation.lng], 14);

  // Charger les établissements réels autour de cette position
  await loadRealPlaces(currentLocation.lat, currentLocation.lng);
});

// ========================================
// CHATBOT AVEC OPENAI API
// ========================================

async function callOpenAIBackend(userMessage) {
  try {
    const response = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: userMessage,
        userLocation: currentLocation,
        currentPlaces: places,
      }),
    });

    if (!response.ok) {
      throw new Error(`Erreur backend: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Erreur API OpenAI:", error);
    return {
      response: "Désolé, service temporairement indisponible.",
      action: "none",
      targetId: null,
      message: "Erreur de connexion",
    };
  }
}

// Exécuter les actions sur l'interface
function executeBotAction(action, targetId) {
  switch (action) {
    case "filter_restaurants":
      currentFilter = "restaurant";
      document.getElementById("filter-restaurant").click();
      setTimeout(() => {
        if (places.length > 0) {
          const closestRestaurant = places
            .filter((p) => p.type === "restaurant")
            .sort((a, b) => a.distance - b.distance)[0];
          if (closestRestaurant) focusOnPlace(closestRestaurant.id);
        }
      }, 1000);
      break;

    case "filter_pharmacies":
      currentFilter = "pharmacy";
      document.getElementById("filter-pharmacy").click();
      setTimeout(() => {
        if (places.length > 0) {
          const closestPharmacy = places
            .filter((p) => p.type === "pharmacy")
            .sort((a, b) => a.distance - b.distance)[0];
          if (closestPharmacy) focusOnPlace(closestPharmacy.id);
        }
      }, 1000);
      break;

    case "show_route":
      if (targetId && places.find((p) => p.id === targetId)) {
        setTimeout(() => showRoute(targetId), 500);
      } else if (places.length > 0) {
        const closest = places.sort((a, b) => a.distance - b.distance)[0];
        setTimeout(() => showRoute(closest.id), 500);
      }
      break;
  }
}

// Fonction de réponse intelligente locale
function intelligentResponse(userMessage) {
  const message = userMessage.toLowerCase();

  // Détecter les demandes de restaurants
  if (
    message.includes("restaurant") ||
    message.includes("manger") ||
    message.includes("resto")
  ) {
    if (places.length === 0) {
      return "Pour voir les restaurants, veuillez d'abord activer votre localisation en cliquant sur 'Votre position' en haut de la page.";
    }

    const restaurants = places.filter((p) => p.type === "restaurant");
    if (restaurants.length === 0) {
      return "Aucun restaurant trouvé dans votre zone. Essayez d'élargir la recherche.";
    }

    // Afficher les restaurants sur la carte
    currentFilter = "restaurant";
    document.getElementById("filter-restaurant").click();
    const closest = restaurants.sort(
      (a, b) =>
        calculateDistance(
          currentLocation.lat,
          currentLocation.lng,
          a.lat,
          a.lng
        ) -
        calculateDistance(
          currentLocation.lat,
          currentLocation.lng,
          b.lat,
          b.lng
        )
    )[0];
    setTimeout(() => focusOnPlace(closest.id), 500);

    return `J'ai trouvé ${
      restaurants.length
    } restaurant(s) près de vous ! Le plus proche est "${
      closest.name
    }" à ${calculateDistance(
      currentLocation.lat,
      currentLocation.lng,
      closest.lat,
      closest.lng
    ).toFixed(1)} km. Je l'ai affiché sur la carte.`;
  }

  // Détecter les demandes de pharmacies
  if (
    message.includes("pharmacie") ||
    message.includes("médicament") ||
    message.includes("santé")
  ) {
    if (places.length === 0) {
      return "Pour voir les pharmacies, veuillez d'abord activer votre localisation en cliquant sur 'Votre position' en haut de la page.";
    }

    const pharmacies = places.filter((p) => p.type === "pharmacy");
    if (pharmacies.length === 0) {
      return "Aucune pharmacie trouvée dans votre zone. Essayez d'élargir la recherche.";
    }

    currentFilter = "pharmacy";
    document.getElementById("filter-pharmacy").click();
    const closest = pharmacies.sort(
      (a, b) =>
        calculateDistance(
          currentLocation.lat,
          currentLocation.lng,
          a.lat,
          a.lng
        ) -
        calculateDistance(
          currentLocation.lat,
          currentLocation.lng,
          b.lat,
          b.lng
        )
    )[0];
    setTimeout(() => focusOnPlace(closest.id), 500);

    return `J'ai trouvé ${
      pharmacies.length
    } pharmacie(s) près de vous ! La plus proche est "${
      closest.name
    }" à ${calculateDistance(
      currentLocation.lat,
      currentLocation.lng,
      closest.lat,
      closest.lng
    ).toFixed(1)} km. Je l'ai affichée sur la carte.`;
  }

  if (
    message.includes("itinéraire") ||
    message.includes("chemin") ||
    message.includes("route") ||
    message.includes("direction")
  ) {
    if (places.length > 0) {
      const closest = places.sort(
        (a, b) =>
          calculateDistance(
            currentLocation.lat,
            currentLocation.lng,
            a.lat,
            a.lng
          ) -
          calculateDistance(
            currentLocation.lat,
            currentLocation.lng,
            b.lat,
            b.lng
          )
      )[0];
      setTimeout(() => showRoute(closest.id), 500);

      return `Je calcule l'itinéraire vers "${closest.name}"... Regardez la carte !`;
    }
    return "Veuillez d'abord activer votre localisation pour calculer un itinéraire.";
  }

  if (
    message.includes("bonjour") ||
    message.includes("salut") ||
    message.includes("hello")
  ) {
    return "Bonjour ! Je suis AskBot, votre assistant intelligent. Je peux vous montrer les restaurants et pharmacies sur la carte avec les itinéraires. Que cherchez-vous ? 😊";
  }

  if (message.includes("merci")) {
    return "Avec plaisir ! N'hésitez pas si vous avez besoin d'autre chose. 😊";
  }

  return "Je peux vous aider à trouver des restaurants ou pharmacies près de vous et afficher les itinéraires sur la carte. Essayez de me demander : 'Montre-moi les restaurants' ou 'Trouve une pharmacie'";
}

// ========================================
// GESTION DU CHATBOT INTELLIGENT
// ========================================

const openChatBtn = document.getElementById("open-chat");
const closeChatBtn = document.getElementById("close-chat");
const chatbot = document.getElementById("chatbot");
const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message-input");
const chatMessages = document.querySelector(".chat-messages");

openChatBtn.addEventListener("click", () => {
  chatbot.classList.remove("hidden");
  chatbot.classList.add("chat-open");
  openChatBtn.style.display = "none";
  messageInput.focus();
});

closeChatBtn.addEventListener("click", () => {
  chatbot.classList.add("chat-close");
  setTimeout(() => {
    chatbot.classList.add("hidden");
    chatbot.classList.remove("chat-close", "chat-open");
    openChatBtn.style.display = "flex";
  }, 300);
});

function showTypingIndicator() {
  const typingDiv = document.createElement("div");
  typingDiv.className = "flex gap-2 items-start message-bubble";
  typingDiv.innerHTML = `
    <div class="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
      <i class="fas fa-robot text-white text-sm"></i>
    </div>
    <div class="bg-white rounded-2xl rounded-tl-sm shadow-sm p-3">
      <div class="typing-indicator">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  `;
  chatMessages.appendChild(typingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return typingDiv;
}

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = messageInput.value.trim();
  if (message) {
    const userMessageDiv = document.createElement("div");
    userMessageDiv.className =
      "flex gap-2 items-start justify-end message-bubble";
    userMessageDiv.innerHTML = `
      <div class="flex-1 flex justify-end">
        <div class="bg-orange-500 rounded-2xl rounded-tr-sm shadow-sm p-3 max-w-[85%]">
          <p class="text-sm text-white">${message}</p>
        </div>
      </div>
    `;
    chatMessages.appendChild(userMessageDiv);
    messageInput.value = "";
    chatMessages.scrollTop = chatMessages.scrollHeight;

    const typingIndicator = showTypingIndicator();

    try {
      // Utiliser OpenAI au lieu de la réponse locale
      const apiResponse = await callOpenAIBackend(message);
      typingIndicator.remove();

      // Exécuter les actions si demandé
      if (apiResponse.action !== "none") {
        executeBotAction(apiResponse.action, apiResponse.targetId);
      }

      const botMessageDiv = document.createElement("div");
      botMessageDiv.className = "flex gap-2 items-start message-bubble";
      botMessageDiv.innerHTML = `
        <div class="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
          <i class="fas fa-robot text-white text-sm"></i>
        </div>
        <div class="flex-1">
          <div class="bg-white rounded-2xl rounded-tl-sm shadow-sm p-3 max-w-[85%]">
            <p class="text-sm text-gray-800">${apiResponse.response}</p>
          </div>
          <span class="text-xs text-gray-500 ml-2 mt-1 block">Maintenant</span>
        </div>
      `;
      chatMessages.appendChild(botMessageDiv);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch (error) {
      typingIndicator.remove();
      // Fallback vers l'ancien système
      const fallbackResponse = intelligentResponse(message);
      const botMessageDiv = document.createElement("div");
      botMessageDiv.className = "flex gap-2 items-start message-bubble";
      botMessageDiv.innerHTML = `
        <div class="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
          <i class="fas fa-robot text-white text-sm"></i>
        </div>
        <div class="flex-1">
          <div class="bg-white rounded-2xl rounded-tl-sm shadow-sm p-3 max-w-[85%]">
            <p class="text-sm text-gray-800">${fallbackResponse}</p>
          </div>
          <span class="text-xs text-gray-500 ml-2 mt-1 block">Maintenant</span>
        </div>
      `;
      chatMessages.appendChild(botMessageDiv);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }
});

messageInput.addEventListener("focus", () => {
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

// ========================================
// NEWSLETTER FONCTIONNEL
// ========================================

document
  .getElementById("newsletter-form")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = document.getElementById("newsletter-email").value;
    const button = this.querySelector('button[type="submit"]');
    const originalText = button.textContent;

    if (!validateEmail(email)) {
      showNotification("Veuillez entrer une adresse email valide", "error");
      return;
    }

    // Désactiver le bouton pendant l'envoi
    button.disabled = true;
    button.textContent = "Inscription...";
    button.classList.add("opacity-50");

    try {
      // Simulation d'envoi vers un service d'email
      // En production, remplacez par votre endpoint réel
      await new Promise((resolve) => setTimeout(resolve, 1500));

      showNotification(
        "Merci pour votre inscription à la newsletter!",
        "success"
      );
      document.getElementById("newsletter-email").value = "";
    } catch (error) {
      console.error("Erreur newsletter:", error);
      showNotification(
        "Erreur lors de l'inscription. Veuillez réessayer.",
        "error"
      );
    } finally {
      // Réactiver le bouton
      button.disabled = false;
      button.textContent = originalText;
      button.classList.remove("opacity-50");
    }
  });

// Validation email
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

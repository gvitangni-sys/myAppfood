// ========================================
// GESTION DE LA GÉOLOCALISATION (HEADER)
// ========================================

let positionUtilisateur = {
  lat: null,
  lng: null,
  ville: "Votre position",
  pays: "",
};

// Fonction pour obtenir le nom de la ville via géocodage inverse
async function obtenirNomVille(lat, lng) {
  try {
    const reponse = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
      {
        headers: {
          "Accept-Language": "fr",
        },
      }
    );

    const donnees = await reponse.json();
    let nomVille = "Votre position";

    if (donnees.address) {
      nomVille =
        donnees.address.city ||
        donnees.address.town ||
        donnees.address.village ||
        donnees.address.municipality ||
        donnees.address.country ||
        donnees.address.state ||
        "Votre position";
    }

    return {
      ville: nomVille,
      pays: donnees.address.country || "",
      adresseComplete: donnees.display_name || "",
    };
  } catch (erreur) {
    console.error("Erreur lors du géocodage:", erreur);
    return {
      ville: "Votre position",
      pays: "",
      adresseComplete: "",
    };
  }
}

// Fonction pour mettre à jour l'affichage de la position
function mettreAJourAffichagePosition(nomVille) {
  const textePosition = document.getElementById("location-text");
  const iconePosition = document.querySelector(
    "#location-selector i.fa-location-dot"
  );

  if (textePosition) {
    textePosition.textContent = nomVille;
    textePosition.style.transition = "all 0.4s ease";
    textePosition.style.color = "#f97316";

    setTimeout(() => {
      textePosition.style.color = "";
    }, 1000);
  }

  if (iconePosition) {
    iconePosition.classList.add("animate-pulse");
    setTimeout(() => {
      iconePosition.classList.remove("animate-pulse");
    }, 1500);
  }
}

// Fonction pour afficher une notification
function afficherNotification(message, type = "info") {
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
function demanderLocalisation() {
  const textePosition = document.getElementById("location-text");

  if (!navigator.geolocation) {
    alert(
      "Désolé, la géolocalisation n'est pas supportée par votre navigateur."
    );
    return;
  }

  textePosition.textContent = "Localisation...";
  textePosition.classList.add("animate-pulse");

  const options = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
  };

  navigator.geolocation.getCurrentPosition(
    async function (position) {
      positionUtilisateur.lat = position.coords.latitude;
      positionUtilisateur.lng = position.coords.longitude;

      const infosPosition = await obtenirNomVille(
        positionUtilisateur.lat,
        positionUtilisateur.lng
      );
      positionUtilisateur.ville = infosPosition.ville;
      positionUtilisateur.pays = infosPosition.pays;

      textePosition.classList.remove("animate-pulse");
      mettreAJourAffichagePosition(positionUtilisateur.ville);
      afficherNotification(
        `Position détectée: ${positionUtilisateur.ville}`,
        "success"
      );

      const evenementPosition = new CustomEvent("positionMiseAJour", {
        detail: positionUtilisateur,
      });
      document.dispatchEvent(evenementPosition);
    },
    function (erreur) {
      textePosition.classList.remove("animate-pulse");
      textePosition.textContent = "Votre position";

      let messageErreur = "";
      switch (erreur.code) {
        case erreur.PERMISSION_DENIED:
          messageErreur =
            "Permission refusée. Veuillez autoriser l'accès à votre position.";
          break;
        case erreur.POSITION_UNAVAILABLE:
          messageErreur = "Position indisponible.";
          break;
        case erreur.TIMEOUT:
          messageErreur = "Délai dépassé.";
          break;
        default:
          messageErreur = "Erreur inconnue.";
      }

      afficherNotification(messageErreur, "error");
      console.error("Erreur de géolocalisation:", erreur);
    },
    options
  );
}

// Event listener sur le sélecteur de localisation
document
  .getElementById("location-selector")
  .addEventListener("click", function () {
    demanderLocalisation();
  });

// ========================================
// GESTION DE LA CARTE ET DES RESTAURANTS
// ========================================

let carte = L.map("map").setView([6.8775, -6.3585], 13);
let marqueurUtilisateur = null;
let positionActuelle = null;
let marqueurs = [];
let coucheItineraire = null;
let restaurants = [];

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
  maxZoom: 19,
}).addTo(carte);

// ========================================
// CHARGEMENT DES RESTAURANTS
// ========================================

async function chargerRestaurantsReels(lat, lng, rayon = 5000) {
  const listeRestaurants = document.getElementById("places-list");
  const messageChargement = document.getElementById("loading-message");

  messageChargement.innerHTML = `
        <div class="flex flex-col items-center justify-center py-20">
            <div class="loading-spinner mb-4"></div>
            <p class="text-gray-600 text-center">Recherche des restaurants à proximité...</p>
        </div>
    `;
  messageChargement.classList.remove("hidden");

  try {
    const requeteOverpass = `
            [out:json][timeout:25];
            (
                node["amenity"="restaurant"](around:${rayon},${lat},${lng});
                node["amenity"="fast_food"](around:${rayon},${lat},${lng});
                node["amenity"="cafe"](around:${rayon},${lat},${lng});
            );
            out body;
        `;

    const reponse = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: requeteOverpass,
    });

    const donnees = await reponse.json();

    restaurants = donnees.elements.map((element, index) => {
      const nom = element.tags.name || "Restaurant";

      return {
        id: element.id || index,
        nom: nom,
        type: "restaurant",
        lat: element.lat,
        lng: element.lon,
        image:
          "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400",
        description: element.tags.cuisine
          ? `Cuisine: ${element.tags.cuisine}`
          : "Restaurant local",
        statut: element.tags.opening_hours || "Horaires non disponibles",
        estOuvert: true,
        note: 4.0,
        telephone:
          element.tags.phone ||
          element.tags["contact:phone"] ||
          "Non disponible",
        adresse: element.tags["addr:street"] || "",
      };
    });

    console.log(`${restaurants.length} restaurants trouvés via Overpass API`);

    if (restaurants.length === 0) {
      messageChargement.innerHTML = `
                <div class="flex flex-col items-center justify-center py-20">
                    <i class="fas fa-search text-gray-400 text-5xl mb-4"></i>
                    <p class="text-gray-600 text-center">Aucun restaurant trouvé dans cette zone.</p>
                    <p class="text-gray-500 text-sm text-center mt-2">Essayez de zoomer sur une autre zone ou augmentez le rayon de recherche.</p>
                </div>
            `;
    } else {
      afficherRestaurants();
    }
  } catch (erreur) {
    console.error("Erreur lors du chargement des données:", erreur);
    messageChargement.innerHTML = `
            <div class="flex flex-col items-center justify-center py-20">
                <i class="fas fa-exclamation-triangle text-red-500 text-5xl mb-4"></i>
                <p class="text-gray-600 text-center">Erreur lors du chargement des données.</p>
                <button onclick="chargerRestaurantsReels(${lat}, ${lng})" class="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
                    Réessayer
                </button>
            </div>
        `;
  }
}

// Calcul de distance
function calculerDistance(lat1, lon1, lat2, lon2) {
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
function creerIconePersonnalisee() {
  return L.divIcon({
    html: `<div class="custom-marker restaurant-marker pulse-animation"><i class="fas fa-utensils"></i></div>`,
    className: "custom-marker-wrapper",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

// ========================================
// SYSTÈME DE RECHERCHE DE RESTAURANTS
// ========================================

const formulaireRecherche = document.getElementById("search-form");
const champRecherche = document.getElementById("search-input");

formulaireRecherche.addEventListener("submit", function (e) {
  e.preventDefault();
  executerRecherche();
});

champRecherche.addEventListener("input", function () {
  if (this.value.trim() === "") {
    afficherRestaurants();
  }
});

function executerRecherche() {
  const termeRecherche = champRecherche.value.trim().toLowerCase();

  if (!termeRecherche) {
    afficherRestaurants();
    return;
  }

  if (!positionActuelle || restaurants.length === 0) {
    afficherNotification(
      "Veuillez d'abord activer votre localisation",
      "error"
    );
    return;
  }

  const restaurantsFiltres = restaurants.filter((restaurant) => {
    const texteRecherche = `
            ${restaurant.nom || ""} 
            ${restaurant.description || ""} 
            ${restaurant.adresse || ""}
        `.toLowerCase();

    return texteRecherche.includes(termeRecherche);
  });

  if (restaurantsFiltres.length === 0) {
    const listeRestaurants = document.getElementById("places-list");
    listeRestaurants.innerHTML = `
            <div class="flex flex-col items-center justify-center py-20">
                <i class="fas fa-search text-gray-400 text-5xl mb-4"></i>
                <p class="text-gray-600 text-center">Aucun restaurant trouvé pour "${termeRecherche}"</p>
                <button onclick="document.getElementById('search-input').value=''; executerRecherche();" 
                        class="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
                    Voir tous les restaurants
                </button>
            </div>
        `;

    marqueurs.forEach((marqueur) => carte.removeLayer(marqueur));
    marqueurs = [];

    afficherNotification(`Aucun résultat pour "${termeRecherche}"`, "error");
  } else {
    afficherRestaurants(restaurantsFiltres);
    afficherNotification(
      `${restaurantsFiltres.length} restaurant(s) trouvé(s)`,
      "success"
    );
  }
}

// Afficher les restaurants
function afficherRestaurants(restaurantsPersonnalises = null) {
  const listeRestaurants = document.getElementById("places-list");
  const messageChargement = document.getElementById("loading-message");

  if (!positionActuelle || restaurants.length === 0) {
    return;
  }

  messageChargement.classList.add("hidden");
  listeRestaurants.innerHTML = "";

  const restaurantsAAfficher = restaurantsPersonnalises || restaurants;

  const restaurantsFiltres = restaurantsAAfficher
    .map((restaurant) => ({
      ...restaurant,
      distance: calculerDistance(
        positionActuelle.lat,
        positionActuelle.lng,
        restaurant.lat,
        restaurant.lng
      ),
    }))
    .sort((a, b) => a.distance - b.distance);

  restaurantsFiltres.forEach((restaurant) => {
    const carteRestaurant = document.createElement("div");
    carteRestaurant.className =
      "place-card bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 mb-4";
    carteRestaurant.id = `restaurant-${restaurant.id}`;

    const etoiles = "★".repeat(Math.floor(restaurant.note));
    carteRestaurant.innerHTML = `
            <div class="flex">
                <div class="w-1/3 flex-shrink-0">
                    <img src="${restaurant.image}" alt="${
      restaurant.nom
    }" class="w-full h-full object-cover rounded-l-2xl">
                </div>
                <div class="w-2/3 p-4 flex flex-col">
                    <div class="flex items-start justify-between mb-2">
                        <h4 class="text-lg font-semibold text-gray-800">${
                          restaurant.nom
                        }</h4>
                        <span class="text-xl">🍽️</span>
                    </div>
                    <div class="flex items-center gap-2 mb-2 flex-wrap">
                        <p class="text-gray-600 text-sm">${restaurant.distance.toFixed(
                          1
                        )} km</p>
                        <span class="${
                          restaurant.estOuvert ? "bg-green-400" : "bg-red-400"
                        } text-white px-2 py-1 rounded-full text-xs font-medium">
                            ${restaurant.statut}
                        </span>
                    </div>
                    <div class="text-sm text-gray-600 mb-2">${etoiles} ${
      restaurant.note
    }</div>
                    <p class="text-gray-500 text-sm mb-3 line-clamp-2">${
                      restaurant.description
                    }</p>
                    <button onclick="afficherItineraire(${
                      restaurant.id
                    })" class="mt-auto bg-orange-500 rounded-lg px-4 py-2 text-white text-sm font-bold hover:bg-orange-600 transition-all duration-200">
                        <i class="fas fa-route mr-2"></i>Voir itinéraire
                    </button>
                </div>
            </div>
        `;

    carteRestaurant.addEventListener("click", (e) => {
      if (!e.target.closest("button")) {
        centrerSurRestaurant(restaurant.id);
      }
    });

    listeRestaurants.appendChild(carteRestaurant);
  });

  ajouterMarqueursCarte(restaurantsFiltres);
}

// Ajouter marqueurs sur la carte
function ajouterMarqueursCarte(restaurantsFiltres) {
  marqueurs.forEach((marqueur) => carte.removeLayer(marqueur));
  marqueurs = [];

  restaurantsFiltres.forEach((restaurant) => {
    const marqueur = L.marker([restaurant.lat, restaurant.lng], {
      icon: creerIconePersonnalisee(),
    }).addTo(carte);

    marqueur.bindPopup(`
            <div class="p-3">
                <h5 class="font-bold text-gray-800 mb-2">${restaurant.nom}</h5>
                <p class="text-sm text-gray-600 mb-2">${restaurant.distance.toFixed(
                  1
                )} km de vous</p>
                <button onclick="centrerSurRestaurant(${
                  restaurant.id
                })" class="w-full bg-orange-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-orange-600 transition-colors">
                    Voir détails
                </button>
            </div>
        `);

    marqueur.on("click", () => {
      centrerSurRestaurant(restaurant.id);
    });

    marqueurs.push(marqueur);
  });
}

// Centrer sur un restaurant
function centrerSurRestaurant(restaurantId) {
  const restaurant = restaurants.find((r) => r.id === restaurantId);
  if (!restaurant) return;

  document.querySelectorAll(".place-card").forEach((carte) => {
    carte.classList.remove("selected");
  });

  const carteRestaurant = document.getElementById(`restaurant-${restaurantId}`);
  if (carteRestaurant) {
    carteRestaurant.classList.add("selected");
    carteRestaurant.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  carte.setView([restaurant.lat, restaurant.lng], 16);

  const marqueur = marqueurs.find(
    (m) =>
      m.getLatLng().lat === restaurant.lat &&
      m.getLatLng().lng === restaurant.lng
  );

  if (marqueur) {
    marqueur.openPopup();
  }
}

// Afficher l'itinéraire
async function afficherItineraire(restaurantId) {
  const restaurant = restaurants.find((r) => r.id === restaurantId);
  if (!restaurant || !positionActuelle) return;

  if (coucheItineraire) {
    carte.removeLayer(coucheItineraire);
  }

  try {
    const reponse = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${positionActuelle.lng},${positionActuelle.lat};${restaurant.lng},${restaurant.lat}?overview=full&geometries=geojson`
    );

    const donnees = await reponse.json();

    if (donnees.routes && donnees.routes.length > 0) {
      const itineraire = donnees.routes[0];
      coucheItineraire = L.geoJSON(itineraire.geometry, {
        style: {
          color: "#074a9cff",
          weight: 5,
          opacity: 0.8,
        },
      }).addTo(carte);

      carte.fitBounds(coucheItineraire.getBounds(), { padding: [50, 50] });

      const distance = (itineraire.distance / 1000).toFixed(1);
      const duree = Math.round(itineraire.duration / 60);

      L.popup()
        .setLatLng([restaurant.lat, restaurant.lng])
        .setContent(
          `
                    <div class="p-3 text-center">
                        <h5 class="font-bold text-gray-800 mb-2">${restaurant.nom}</h5>
                        <p class="text-sm text-gray-600"><i class="fas fa-route text-orange-500"></i> ${distance} km</p>
                        <p class="text-sm text-gray-600"><i class="fas fa-clock text-orange-500"></i> ${duree} min</p>
                    </div>
                `
        )
        .openOn(carte);
    }
  } catch (erreur) {
    console.error("Erreur lors du calcul de l'itinéraire:", erreur);
    afficherNotification(
      "Impossible de calculer l'itinéraire pour le moment",
      "error"
    );
  }
}

// Écouter l'événement de mise à jour de localisation
document.addEventListener("positionMiseAJour", async function (evenement) {
  const position = evenement.detail;

  positionActuelle = {
    lat: position.lat,
    lng: position.lng,
  };

  if (marqueurUtilisateur) {
    carte.removeLayer(marqueurUtilisateur);
  }

  marqueurUtilisateur = L.marker([positionActuelle.lat, positionActuelle.lng], {
    icon: L.divIcon({
      html: '<div class="custom-marker user-marker pulse-animation"><i class="fas fa-user"></i></div>',
      className: "custom-marker-wrapper",
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    }),
  }).addTo(carte);

  marqueurUtilisateur.bindPopup(
    '<div class="p-2 text-center font-semibold">Vous êtes ici</div>'
  );
  carte.setView([positionActuelle.lat, positionActuelle.lng], 14);

  await chargerRestaurantsReels(positionActuelle.lat, positionActuelle.lng);
});

// ========================================
// CHATBOT SIMPLIFIÉ
// ========================================

const boutonOuvrirChat = document.getElementById("open-chat");
const boutonFermerChat = document.getElementById("close-chat");
const chatbot = document.getElementById("chatbot");
const formulaireChat = document.getElementById("chat-form");
const champMessage = document.getElementById("message-input");
const messagesChat = document.querySelector(".chat-messages");

boutonOuvrirChat.addEventListener("click", () => {
  chatbot.classList.remove("hidden");
  boutonOuvrirChat.style.display = "none";
  champMessage.focus();
});

boutonFermerChat.addEventListener("click", () => {
  chatbot.classList.add("hidden");
  boutonOuvrirChat.style.display = "flex";
});

// Fonction de réponse intelligente locale
function obtenirReponseIntelligente(messageUtilisateur) {
  const message = messageUtilisateur.toLowerCase();

  if (
    message.includes("restaurant") ||
    message.includes("manger") ||
    message.includes("resto")
  ) {
    if (restaurants.length === 0) {
      return "Pour voir les restaurants, veuillez d'abord activer votre localisation en cliquant sur 'Votre position' en haut de la page.";
    }

    const plusProche = restaurants.sort((a, b) => a.distance - b.distance)[0];
    setTimeout(() => centrerSurRestaurant(plusProche.id), 500);

    return `J'ai trouvé ${
      restaurants.length
    } restaurant(s) près de vous ! Le plus proche est "${
      plusProche.nom
    }" à ${plusProche.distance.toFixed(1)} km. Je l'ai affiché sur la carte.`;
  }

  if (
    message.includes("itinéraire") ||
    message.includes("chemin") ||
    message.includes("route")
  ) {
    if (restaurants.length > 0) {
      const plusProche = restaurants.sort((a, b) => a.distance - b.distance)[0];
      setTimeout(() => afficherItineraire(plusProche.id), 500);

      return `Je calcule l'itinéraire vers "${plusProche.nom}"... Regardez la carte !`;
    }
    return "Veuillez d'abord activer votre localisation pour calculer un itinéraire.";
  }

  if (message.includes("bonjour") || message.includes("salut")) {
    return "Bonjour ! Je suis AskBot, votre assistant. Je peux vous montrer les restaurants sur la carte avec les itinéraires. Que cherchez-vous ?";
  }

  if (message.includes("merci")) {
    return "Avec plaisir ! N'hésitez pas si vous avez besoin d'autre chose.";
  }

  return "Je peux vous aider à trouver des restaurants près de vous et afficher les itinéraires sur la carte. Essayez de me demander : 'Montre-moi les restaurants' ou 'Trouve un restaurant'";
}

formulaireChat.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = champMessage.value.trim();

  if (message) {
    // Message utilisateur
    const messageUtilisateur = document.createElement("div");
    messageUtilisateur.className =
      "flex gap-2 items-start justify-end message-bubble";
    messageUtilisateur.innerHTML = `
            <div class="flex-1 flex justify-end">
                <div class="bg-orange-500 rounded-2xl rounded-tr-sm shadow-sm p-3 max-w-[85%]">
                    <p class="text-sm text-white">${message}</p>
                </div>
            </div>
        `;
    messagesChat.appendChild(messageUtilisateur);
    champMessage.value = "";
    messagesChat.scrollTop = messagesChat.scrollHeight;

    // Indicateur de frappe
    const indicateurFrappe = document.createElement("div");
    indicateurFrappe.className = "flex gap-2 items-start message-bubble";
    indicateurFrappe.innerHTML = `
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
    messagesChat.appendChild(indicateurFrappe);
    messagesChat.scrollTop = messagesChat.scrollHeight;

    // Réponse après délai
    setTimeout(() => {
      indicateurFrappe.remove();

      const reponse = obtenirReponseIntelligente(message);
      const messageBot = document.createElement("div");
      messageBot.className = "flex gap-2 items-start message-bubble";
      messageBot.innerHTML = `
                <div class="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <i class="fas fa-robot text-white text-sm"></i>
                </div>
                <div class="flex-1">
                    <div class="bg-white rounded-2xl rounded-tl-sm shadow-sm p-3 max-w-[85%]">
                        <p class="text-sm text-gray-800">${reponse}</p>
                    </div>
                    <span class="text-xs text-gray-500 ml-2 mt-1 block">Maintenant</span>
                </div>
            `;
      messagesChat.appendChild(messageBot);
      messagesChat.scrollTop = messagesChat.scrollHeight;
    }, 1500);
  }
});

champMessage.addEventListener("focus", () => {
  messagesChat.scrollTop = messagesChat.scrollHeight;
});

// ========================================
// NEWSLETTER
// ========================================

document
  .getElementById("newsletter-form")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = document.getElementById("newsletter-email").value;
    const bouton = this.querySelector('button[type="submit"]');
    const texteOriginal = bouton.textContent;

    if (!validerEmail(email)) {
      afficherNotification("Veuillez entrer une adresse email valide", "error");
      return;
    }

    bouton.disabled = true;
    bouton.textContent = "Inscription...";
    bouton.classList.add("opacity-50");

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      afficherNotification(
        "Merci pour votre inscription à la newsletter!",
        "success"
      );
      document.getElementById("newsletter-email").value = "";
    } catch (erreur) {
      console.error("Erreur newsletter:", erreur);
      afficherNotification(
        "Erreur lors de l'inscription. Veuillez réessayer.",
        "error"
      );
    } finally {
      bouton.disabled = false;
      bouton.textContent = texteOriginal;
      bouton.classList.remove("opacity-50");
    }
  });

// Validation email
function validerEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

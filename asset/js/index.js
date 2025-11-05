// GESTION DE LA GÉOLOCALISATION

let positionUtilisateur = {
  lat: null,
  lng: null,
  ville: "Votre position",
  pays: "",
};

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
    type === "success"
      ? "bg-green-500"
      : type === "error"
      ? "bg-red-500"
      : "bg-orange-500"
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
// FONCTION POUR OBTENIR L'IMAGE RÉELLE DU RESTAURANT
// ========================================

async function obtenirImageRestaurantReelle(restaurant) {
  // D'abord essayer les images existantes dans OpenStreetMap
  if (restaurant.tags && restaurant.tags.image) {
    return restaurant.tags.image;
  }

  if (restaurant.tags && restaurant.tags["wikimedia_commons"]) {
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${restaurant.tags["wikimedia_commons"]}`;
  }

  try {
    const nomRecherche = encodeURIComponent(restaurant.nom);
    const reponse = await fetch(
      `https://fr.wikipedia.org/api/rest_v1/page/summary/${nomRecherche}`
    );
    const donnees = await reponse.json();

    if (donnees.thumbnail && donnees.thumbnail.source) {
      return donnees.thumbnail.source;
    }
  } catch (erreur) {
    console.log("Aucune image trouvée sur Wikipedia pour:", restaurant.nom);
  }

  try {
    const reponsePlaces = await fetch(
      `/api/places?lat=${restaurant.lat}&lng=${
        restaurant.lng
      }&name=${encodeURIComponent(restaurant.nom)}`
    );
    if (reponsePlaces.ok) {
      const donneesPlaces = await reponsePlaces.json();
      if (donneesPlaces.photos && donneesPlaces.photos.length > 0) {
        return `/api/places/photo?photoreference=${donneesPlaces.photos[0].photo_reference}&maxwidth=400`;
      }
    }
  } catch (erreur) {
    console.log("API Places non disponible, utilisation des images par défaut");
  }

  // En dernier recours, utiliser des images par type de cuisine
  const cuisine =
    restaurant.tags?.cuisine?.toLowerCase() || restaurant.type || "";

  if (cuisine.includes("pizza") || restaurant.type === "pizza") {
    return "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&auto=format&fit=crop";
  } else if (cuisine.includes("burger") || restaurant.type === "fast_food") {
    return "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop";
  } else if (
    cuisine.includes("asie") ||
    cuisine.includes("chinois") ||
    cuisine.includes("japonais")
  ) {
    return "https://images.unsplash.com/photo-1562967914-608f82629710?w=400&auto=format&fit=crop";
  } else if (cuisine.includes("cafe") || restaurant.type === "cafe") {
    return "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&auto=format&fit=crop";
  } else if (cuisine.includes("italien") || cuisine.includes("pasta")) {
    return "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=400&auto=format&fit=crop";
  } else {
    return "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&auto=format&fit=crop";
  }
}

// ========================================
// CHARGEMENT DES RESTAURANTS RÉELS
// ========================================

async function chargerRestaurantsReels(lat, lng, rayon = 2000) {
  const listeRestaurants = document.getElementById("places-list");
  const messageChargement = document.getElementById("loading-message");

  if (messageChargement) {
    messageChargement.innerHTML = `
      <div class="flex flex-col items-center justify-center py-20">
        <div class="loading-spinner mb-4"></div>
        <p class="text-gray-600 text-center">Recherche des restaurants à proximité...</p>
      </div>
    `;
    messageChargement.classList.remove("hidden");
  }

  try {
    // Requête Overpass améliorée pour plus de données
    const requeteOverpass = `
      [out:json][timeout:30];
      (
        node["amenity"="restaurant"](around:${rayon},${lat},${lng});
        node["amenity"="fast_food"](around:${rayon},${lat},${lng});
        node["amenity"="cafe"](around:${rayon},${lat},${lng});
        node["amenity"="bar"](around:${rayon},${lat},${lng});
        way["amenity"="restaurant"](around:${rayon},${lat},${lng});
        way["amenity"="fast_food"](around:${rayon},${lat},${lng});
        way["amenity"="cafe"](around:${rayon},${lat},${lng});
        way["amenity"="bar"](around:${rayon},${lat},${lng});
      );
      out body;
      >;
      out skel qt;
    `;

    const reponse = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: requeteOverpass,
    });

    const donnees = await reponse.json();

    if (!donnees.elements || donnees.elements.length === 0) {
      if (messageChargement) {
        messageChargement.innerHTML = `
          <div class="flex flex-col items-center justify-center py-20">
            <i class="fas fa-search text-gray-400 text-5xl mb-4"></i>
            <p class="text-gray-600 text-center">Aucun restaurant trouvé dans cette zone.</p>
            <button onclick="chargerRestaurantsReels(${lat}, ${lng}, 5000)" 
                    class="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
              Élargir la recherche
            </button>
          </div>
        `;
      }
      return;
    }

    // Traitement des données avec informations réelles
    restaurants = await Promise.all(
      donnees.elements.map(async (element, index) => {
        const tags = element.tags || {};
        const nom = tags.name || `Restaurant ${index + 1}`;
        const type = tags.amenity || "restaurant";

        // Obtenir les coordonnées (différent pour nodes et ways)
        let latElement, lngElement;
        if (element.type === "node") {
          latElement = element.lat;
          lngElement = element.lon;
        } else if (element.type === "way" && element.center) {
          latElement = element.center.lat;
          lngElement = element.center.lon;
        } else {
          // Pour les ways sans center, utiliser le centroid approximatif
          latElement = lat + (Math.random() - 0.5) * 0.01;
          lngElement = lng + (Math.random() - 0.5) * 0.01;
        }

        // Obtenir l'image réelle
        const image = await obtenirImageRestaurantReelle({
          nom: nom,
          tags: tags,
          type: type,
          lat: latElement,
          lng: lngElement,
        });

        // Générer une note réaliste basée sur les données disponibles
        const note = genererNoteRealiste(tags);

        // Déterminer le statut d'ouverture
        const statut = determinerStatutOuverture(tags);

        return {
          id: element.id || `restaurant-${index}`,
          nom: nom,
          type: type,
          lat: latElement,
          lng: lngElement,
          tags: tags,
          image: image,
          description: genererDescription(tags),
          statut: statut.text,
          estOuvert: statut.estOuvert,
          note: note,
          telephone: tags.phone || tags["contact:phone"] || "Non disponible",
          adresse: formaterAdresse(tags),
          siteWeb: tags.website || tags["contact:website"] || "",
          horaires: tags.opening_hours || "Horaires non spécifiés",
        };
      })
    );

    console.log(`${restaurants.length} restaurants réels trouvés`);

    if (restaurants.length > 0) {
      afficherRestaurants();
      afficherNotification(
        `${restaurants.length} restaurants trouvés près de vous`,
        "success"
      );
    }
  } catch (erreur) {
    console.error("Erreur lors du chargement des données:", erreur);
    if (messageChargement) {
      messageChargement.innerHTML = `
        <div class="flex flex-col items-center justify-center py-20">
          <i class="fas fa-exclamation-triangle text-red-500 text-5xl mb-4"></i>
          <p class="text-gray-600 text-center">Erreur lors du chargement des restaurants.</p>
          <button onclick="chargerRestaurantsReels(${lat}, ${lng})" 
                  class="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
            Réessayer
          </button>
        </div>
      `;
    }
  }
}

// Fonction pour générer une note réaliste
function genererNoteRealiste(tags) {
  // Basé sur la présence de certaines tags qui indiquent la qualité
  let noteBase = 3.0;

  if (tags.cuisine) noteBase += 0.3;
  if (tags.website) noteBase += 0.2;
  if (tags.phone) noteBase += 0.1;
  if (tags.opening_hours) noteBase += 0.2;
  if (tags.outdoor_seating) noteBase += 0.1;
  if (tags.delivery) noteBase += 0.1;
  if (tags.takeaway) noteBase += 0.1;

  const variation = Math.random() * 1.5 - 0.75;
  let noteFinale = noteBase + variation;

  return Math.max(1.0, Math.min(5.0, noteFinale)).toFixed(1);
}

// Fonction pour déterminer le statut d'ouverture
function determinerStatutOuverture(tags) {
  const horaires = tags.opening_hours;

  if (!horaires) {
    return { text: "Horaires inconnus", estOuvert: true };
  }

  // Logique simple de détermination d'ouverture
  const maintenant = new Date();
  const heure = maintenant.getHours();
  const jour = maintenant.getDay();

  // Simplification pour l'exemple
  if (horaires.includes("24/7")) {
    return { text: "Ouvert 24h/24", estOuvert: true };
  }

  if (horaires.includes("Mo-Su")) {
    const estOuvert = heure >= 8 && heure < 22;
    return {
      text: estOuvert ? "Ouvert maintenant" : "Fermé",
      estOuvert: estOuvert,
    };
  }

  return { text: horaires, estOuvert: true };
}

// Fonction pour formater l'adresse
function formaterAdresse(tags) {
  const elements = [];
  if (tags["addr:street"]) elements.push(tags["addr:street"]);
  if (tags["addr:housenumber"]) elements.push(tags["addr:housenumber"]);
  if (tags["addr:city"]) elements.push(tags["addr:city"]);

  return elements.length > 0 ? elements.join(", ") : "Adresse non disponible";
}

// Fonction pour générer une description
function genererDescription(tags) {
  const elements = [];

  if (tags.cuisine) {
    elements.push(`Cuisine ${tags.cuisine}`);
  }

  if (tags.amenity === "fast_food") {
    elements.push("Fast-food");
  } else if (tags.amenity === "cafe") {
    elements.push("Café");
  } else if (tags.amenity === "bar") {
    elements.push("Bar");
  } else {
    elements.push("Restaurant");
  }

  if (tags.outdoor_seating === "yes") {
    elements.push("Terrasse");
  }

  if (tags.delivery === "yes") {
    elements.push("Livraison");
  }

  return elements.join(" • ") || "Restaurant local";
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

if (formulaireRecherche) {
  formulaireRecherche.addEventListener("submit", function (e) {
    e.preventDefault();
    executerRecherche();
  });
}

if (champRecherche) {
  champRecherche.addEventListener("input", function () {
    if (this.value.trim() === "") {
      if (positionActuelle && restaurants.length > 0) {
        afficherRestaurants();
      }
    }
  });
}

function executerRecherche() {
  const termeRecherche = champRecherche.value.trim().toLowerCase();

  if (!termeRecherche) {
    if (positionActuelle && restaurants.length > 0) {
      afficherRestaurants();
    }
    return;
  }

  if (!positionActuelle) {
    afficherNotification(
      "Veuillez d'abord activer votre localisation",
      "error"
    );
    return;
  }

  if (restaurants.length === 0) {
    afficherNotification(
      "Aucun restaurant chargé. Activez votre localisation d'abord.",
      "error"
    );
    return;
  }

  const restaurantsFiltres = restaurants.filter((restaurant) => {
    const nom = (restaurant.nom || "").toLowerCase();
    const description = (restaurant.description || "").toLowerCase();
    const adresse = (restaurant.adresse || "").toLowerCase();
    const type = (restaurant.type || "").toLowerCase();
    const cuisine = (restaurant.tags?.cuisine || "").toLowerCase();

    return (
      nom.includes(termeRecherche) ||
      description.includes(termeRecherche) ||
      adresse.includes(termeRecherche) ||
      type.includes(termeRecherche) ||
      cuisine.includes(termeRecherche)
    );
  });

  if (restaurantsFiltres.length === 0) {
    const listeRestaurants = document.getElementById("places-list");
    if (listeRestaurants) {
      listeRestaurants.innerHTML = `
        <div class="flex flex-col items-center justify-center py-20">
          <i class="fas fa-search text-gray-400 text-5xl mb-4"></i>
          <p class="text-gray-600 text-center font-semibold mb-2">Aucun restaurant trouvé pour "${termeRecherche}"</p>
          <p class="text-gray-500 text-sm text-center mb-4">Essayez un autre terme ou vérifiez l'orthographe.</p>
          <button onclick="document.getElementById('search-input').value = ''; executerRecherche();" 
                  class="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
            Voir tous les restaurants
          </button>
        </div>
      `;
    }

    marqueurs.forEach((marqueur) => carte.removeLayer(marqueur));
    marqueurs = [];

    afficherNotification(`Aucun résultat pour "${termeRecherche}"`, "error");
  } else {
    afficherRestaurants(restaurantsFiltres);
    afficherNotification(
      `${restaurantsFiltres.length} restaurant(s) trouvé(s) pour "${termeRecherche}"`,
      "success"
    );

    if (restaurantsFiltres.length > 0) {
      setTimeout(() => centrerSurRestaurant(restaurantsFiltres[0].id), 500);
    }
  }
}

// Fonction utilitaire pour créer les cartes restaurant
function creerCarteRestaurant(restaurant) {
  const carteRestaurant = document.createElement("div");
  carteRestaurant.className =
    "place-card bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 mb-4 cursor-pointer";
  carteRestaurant.id = `restaurant-${restaurant.id}`;

  const etoiles = "★".repeat(Math.floor(restaurant.note));
  const demiEtoile = restaurant.note % 1 >= 0.5 ? "½" : "";

  carteRestaurant.innerHTML = `
    <div class="flex">
      <div class="w-1/3 flex-shrink-0">
        <img src="${restaurant.image}" 
             alt="${restaurant.nom}" 
             class="w-full h-full object-cover rounded-l-2xl"
             onerror="this.src='https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&auto=format&fit=crop'">
      </div>
      <div class="w-2/3 p-4 flex flex-col">
        <div class="flex items-start justify-between mb-2">
          <h4 class="text-lg font-semibold text-gray-800">${restaurant.nom}</h4>
          <span class="text-xl">${
            restaurant.type === "cafe"
              ? "☕"
              : restaurant.type === "fast_food"
              ? "🍔"
              : "🍽️"
          }</span>
        </div>
        <div class="flex items-center gap-2 mb-2 flex-wrap">
          <p class="text-gray-600 text-sm">📍 ${restaurant.distance.toFixed(
            1
          )} km</p>
          <span class="${
            restaurant.estOuvert ? "bg-green-400" : "bg-red-400"
          } text-white px-2 py-1 rounded-full text-xs font-medium">
            ${restaurant.estOuvert ? "Ouvert" : "Fermé"}
          </span>
        </div>
        <div class="text-sm text-gray-600 mb-2">${etoiles}${demiEtoile} ${
    restaurant.note
  }</div>
        <p class="text-gray-500 text-sm mb-3 line-clamp-2">${
          restaurant.description
        }</p>
        <div class="flex gap-2 mt-auto">
          <button onclick="event.stopPropagation(); afficherItineraire(${
            restaurant.id
          })" 
                  class="flex-1 bg-orange-500 rounded-lg px-3 py-2 text-white text-sm font-bold hover:bg-orange-600 transition-all duration-200 shadow-md">
            <i class="fas fa-route mr-1"></i>Itinéraire
          </button>
          ${
            restaurant.telephone !== "Non disponible"
              ? `
          <button onclick="event.stopPropagation(); appelerRestaurant('${restaurant.telephone}')" 
                  class="bg-green-500 rounded-lg px-3 py-2 text-white text-sm font-bold hover:bg-green-600 transition-all duration-200 shadow-md">
            <i class="fas fa-phone mr-1"></i>
          </button>
          `
              : ""
          }
        </div>
      </div>
    </div>
  `;

  carteRestaurant.addEventListener("click", (e) => {
    if (!e.target.closest("button")) {
      centrerSurRestaurant(restaurant.id);
    }
  });

  return carteRestaurant;
}

// Fonction pour appeler un restaurant
function appelerRestaurant(telephone) {
  if (confirm(`Voulez-vous appeler ${telephone} ?`)) {
    window.location.href = `tel:${telephone}`;
  }
}

// Afficher les restaurants
function afficherRestaurants(restaurantsAAfficher = null) {
  const listeRestaurants = document.getElementById("places-list");
  const messageChargement = document.getElementById("loading-message");

  if (!listeRestaurants) return;

  const restaurantsAUtiliser = restaurantsAAfficher || restaurants;

  if (!positionActuelle || restaurantsAUtiliser.length === 0) {
    return;
  }

  if (messageChargement) {
    messageChargement.classList.add("hidden");
  }

  listeRestaurants.innerHTML = "";

  const restaurantsAvecDistances = restaurantsAUtiliser
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

  restaurantsAvecDistances.forEach((restaurant) => {
    const carteRestaurant = creerCarteRestaurant(restaurant);
    listeRestaurants.appendChild(carteRestaurant);
  });

  ajouterMarqueursCarte(restaurantsAvecDistances);
}

// Ajouter marqueurs sur la carte
function ajouterMarqueursCarte(restaurantsAffiches) {
  marqueurs.forEach((marqueur) => carte.removeLayer(marqueur));
  marqueurs = [];

  restaurantsAffiches.forEach((restaurant) => {
    const marqueur = L.marker([restaurant.lat, restaurant.lng], {
      icon: creerIconePersonnalisee(),
    }).addTo(carte);

    marqueur.bindPopup(`
      <div class="p-3 min-w-[200px]">
        <h5 class="font-bold text-gray-800 mb-2">${restaurant.nom}</h5>
        <p class="text-sm text-gray-600 mb-1">${restaurant.description}</p>
        <p class="text-sm text-gray-600 mb-2">📍 ${restaurant.distance.toFixed(
          1
        )} km de vous</p>
        <div class="flex gap-2">
          <button onclick="centrerSurRestaurant(${restaurant.id})" 
                  class="flex-1 bg-orange-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-orange-600 transition-colors">
            Voir détails
          </button>
          ${
            restaurant.telephone !== "Non disponible"
              ? `
          <button onclick="appelerRestaurant('${restaurant.telephone}')" 
                  class="bg-green-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-600 transition-colors">
            <i class="fas fa-phone"></i>
          </button>
          `
              : ""
          }
        </div>
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

if (boutonOuvrirChat) {
  boutonOuvrirChat.addEventListener("click", () => {
    chatbot.classList.remove("hidden");
    boutonOuvrirChat.style.display = "none";
    champMessage.focus();
  });
}

if (boutonFermerChat) {
  boutonFermerChat.addEventListener("click", () => {
    chatbot.classList.add("hidden");
    boutonOuvrirChat.style.display = "flex";
  });
}

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

    const plusProche = [...restaurants]
      .map((r) => ({
        ...r,
        distance: calculerDistance(
          positionActuelle.lat,
          positionActuelle.lng,
          r.lat,
          r.lng
        ),
      }))
      .sort((a, b) => a.distance - b.distance)[0];
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
      const plusProche = [...restaurants]
        .map((r) => ({
          ...r,
          distance: calculerDistance(
            positionActuelle.lat,
            positionActuelle.lng,
            r.lat,
            r.lng
          ),
        }))
        .sort((a, b) => a.distance - b.distance)[0];
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

if (formulaireChat) {
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
}

if (champMessage) {
  champMessage.addEventListener("focus", () => {
    messagesChat.scrollTop = messagesChat.scrollHeight;
  });
}

// ========================================
// NEWSLETTER
// ========================================

const formulaireNewsletter = document.getElementById("newsletter-form");
if (formulaireNewsletter) {
  formulaireNewsletter.addEventListener("submit", async function (e) {
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
}

// Validation email
function validerEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

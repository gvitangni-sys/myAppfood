const API_URL = "https://myappfood-backend.onrender.com/api";

function verifierAuthentificationAdmin() {
  const token = localStorage.getItem("token");
  const utilisateur = localStorage.getItem("utilisateur");

  if (!token || !utilisateur) {
    window.location.href = "/";
    return;
  }

  try {
    const user = JSON.parse(utilisateur);
    if (user.role !== "admin") {
      afficherNotification(
        "Acces refuse. Droits administrateur requis.",
        "error"
      );
      window.location.href = "/";
      return;
    }

    document.querySelectorAll("#user-name, #user-name-mobile").forEach((el) => {
      el.textContent = user.email;
    });
  } catch (error) {
    console.error("Erreur verification admin:", error);
    deconnecterAdmin();
  }
}

function deconnecterAdmin() {
  localStorage.removeItem("token");
  localStorage.removeItem("utilisateur");
  window.location.href = "/";
}

async function appelApiAdmin(url, options = {}) {
  const token = localStorage.getItem("token");

  if (!token) {
    deconnecterAdmin();
    throw new Error("Non authentifie");
  }

  const config = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  };

  const response = await fetch(url, config);

  if (response.status === 401) {
    deconnecterAdmin();
    throw new Error("Session expiree");
  }

  if (response.status === 403) {
    afficherNotification(
      "Acces refuse. Droits administrateur requis.",
      "error"
    );
    window.location.href = "/";
    throw new Error("Acces refuse");
  }

  return await response.json();
}

async function chargerStatistiques() {
  try {
    const data = await appelApiAdmin(`${API_URL}/admin/statistiques`);

    if (data.succes) {
      mettreAJourDashboard(data.data);
    } else {
      console.error("Erreur statistiques:", data.message);
      afficherNotification("Erreur de chargement des statistiques", "error");
    }
  } catch (error) {
    console.error("Erreur chargement statistiques:", error);
    if (!error.message.includes("Acces refuse")) {
      afficherNotification("Erreur de connexion au serveur", "error");
    }
  }
}

function mettreAJourDashboard(data) {
  document.getElementById("total-users").textContent =
    data.totalUtilisateurs.toLocaleString("fr-FR");
  document.getElementById("searches-today").textContent =
    data.utilisateursActifs.toLocaleString("fr-FR");
  document.getElementById("active-users").textContent =
    data.utilisateursSemaine.toLocaleString("fr-FR");

  const pourcentages = document.querySelectorAll('[class*="bg-gray-100"]');
  if (pourcentages.length > 0) {
    const variation =
      ((data.nouveauxUtilisateurs / data.totalUtilisateurs) * 100).toFixed(1) +
      "%";
    pourcentages[0].textContent = variation;

    if (variation.includes("-")) {
      pourcentages[0].className = pourcentages[0].className.replace(
        "bg-gray-100",
        "bg-red-100 text-red-800"
      );
    } else {
      pourcentages[0].className = pourcentages[0].className.replace(
        "bg-gray-100",
        "bg-green-100 text-green-800"
      );
    }
  }

  mettreAJourTableauUtilisateurs(data.derniersUtilisateurs);
  mettreAJourGraphiques(data);
}

function mettreAJourTableauUtilisateurs(utilisateurs) {
  const tbody = document.getElementById("users-table");

  if (utilisateurs.length === 0) {
    tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-8 text-gray-500">
                    <i class="fas fa-users text-4xl mb-3 opacity-50"></i>
                    <p>Aucun utilisateur</p>
                </td>
            </tr>
        `;
    return;
  }

  tbody.innerHTML = utilisateurs
    .map(
      (user) => `
        <tr class="border-b border-gray-200 hover:bg-gray-50">
            <td class="py-4 px-4">
                <div class="flex items-center gap-3">
                    <img src="https://ui-avatars.com/api/?name=${
                      user.email
                    }&background=f97316&color=fff" 
                         alt="${user.email}" class="w-8 h-8 rounded-full">
                    <div>
                        <p class="font-medium text-gray-800">${user.email}</p>
                        <p class="text-xs text-gray-500">${user.role}</p>
                    </div>
                </div>
            </td>
            <td class="py-4 px-4 text-gray-600">${user.email}</td>
            <td class="py-4 px-4 text-gray-600">${new Date(
              user.dateInscription
            ).toLocaleDateString("fr-FR")}</td>
            <td class="py-4 px-4 text-gray-600">${
              user.statut === "Actif" ? "Oui" : "Non"
            }</td>
            <td class="py-4 px-4">
                <span class="px-2 py-1 rounded-full text-xs font-medium ${
                  user.statut === "Actif"
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }">
                    ${user.statut}
                </span>
            </td>
        </tr>
    `
    )
    .join("");
}

function mettreAJourGraphiques(data) {
  const popularRestaurants = document.getElementById("popular-restaurants");
  const peakHours = document.getElementById("peak-hours");

  if (data.derniersUtilisateurs.length > 0) {
    popularRestaurants.innerHTML = data.derniersUtilisateurs
      .map(
        (user) => `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-user text-orange-500 text-sm"></i>
                    </div>
                    <div>
                        <p class="text-sm font-medium text-gray-800">${
                          user.email
                        }</p>
                        <p class="text-xs text-gray-500">Inscrit le ${new Date(
                          user.dateInscription
                        ).toLocaleDateString("fr-FR")}</p>
                    </div>
                </div>
                <span class="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                    ${user.role}
                </span>
            </div>
        `
      )
      .join("");
  }

  peakHours.innerHTML = `
        <div class="space-y-3">
            <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">Utilisateurs totaux</span>
                <span class="font-semibold text-gray-800">${data.totalUtilisateurs}</span>
            </div>
            <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">Nouveaux ce mois</span>
                <span class="font-semibold text-green-600">${data.nouveauxUtilisateurs}</span>
            </div>
            <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">Actifs (24h)</span>
                <span class="font-semibold text-blue-600">${data.utilisateursActifs}</span>
            </div>
            <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">Inscrits cette semaine</span>
                <span class="font-semibold text-orange-600">${data.utilisateursSemaine}</span>
            </div>
        </div>
    `;
}

const navLinks = document.querySelectorAll(".nav-link");
const sections = document.querySelectorAll(".section-content");

const sectionTitles = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Vue d'ensemble de votre activite",
  },
  users: {
    title: "Utilisateurs",
    subtitle: "Gestion des utilisateurs inscrits",
  },
  searches: {
    title: "Recherches",
    subtitle: "Historique et statistiques des recherches",
  },
  locations: {
    title: "Localisations",
    subtitle: "Repartition geographique des utilisateurs",
  },
  settings: {
    title: "Parametres",
    subtitle: "Configuration de votre compte",
  },
};

navLinks.forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const targetSection = link.dataset.section;

    navLinks.forEach((l) => {
      l.classList.remove("bg-orange-500", "text-white");
      l.classList.add("text-gray-300");
    });
    link.classList.add("bg-orange-500", "text-white");
    link.classList.remove("text-gray-300");

    sections.forEach((s) => s.classList.remove("active"));
    document.getElementById(`section-${targetSection}`).classList.add("active");

    document.getElementById("page-title").textContent =
      sectionTitles[targetSection].title;
    document.getElementById("page-subtitle").textContent =
      sectionTitles[targetSection].subtitle;

    if (targetSection === "dashboard") {
      chargerStatistiques();
    }
  });
});

const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (confirm("Voulez-vous vraiment vous deconnecter ?")) {
      deconnecterAdmin();
    }
  });
}

function afficherNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.className = `fixed top-4 right-4 z-[9999] px-6 py-4 rounded-lg shadow-2xl transform transition-all duration-300 translate-x-full`;

  const couleurs = {
    success: "bg-green-500 text-white",
    error: "bg-red-500 text-white",
    info: "bg-blue-500 text-white",
    warning: "bg-orange-500 text-white",
  };

  notification.className += ` ${couleurs[type] || couleurs.info}`;

  const icones = {
    success: "fa-check-circle",
    error: "fa-exclamation-circle",
    info: "fa-info-circle",
    warning: "fa-exclamation-triangle",
  };

  notification.innerHTML = `
        <div class="flex items-center gap-3">
            <i class="fas ${icones[type] || icones.info} text-xl"></i>
            <span class="font-medium">${message}</span>
        </div>
    `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.remove("translate-x-full");
  }, 10);

  setTimeout(() => {
    notification.classList.add("translate-x-full");
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

document.addEventListener("DOMContentLoaded", () => {
  verifierAuthentificationAdmin();
  chargerStatistiques();

  setInterval(chargerStatistiques, 30000);
});

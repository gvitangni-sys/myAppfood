// Gestion de l'authentification avec backend MongoDB
const API_URL = "https://myappfood-backend.onrender.com/api/auth";

document.addEventListener("DOMContentLoaded", function () {
  // Éléments des modales
  const modalConnexion = document.getElementById("login-modal");
  const modalInscription = document.getElementById("register-modal");

  // Boutons d'ouverture
  const boutonAuthMobile = document.getElementById("mobile-auth-btn");
  const boutonAuthDesktop = document.getElementById("desktop-auth-btn");

  // Boutons de fermeture
  const fermerModalConnexion = document.getElementById("close-login-modal");
  const fermerModalInscription = document.getElementById(
    "close-register-modal"
  );

  // Liens de switch
  const afficherInscription = document.getElementById("show-register");
  const afficherConnexion = document.getElementById("show-login");

  // Formulaires
  const formulaireConnexion = document.getElementById("login-form");
  const formulaireInscription = document.getElementById("register-form");

  // Profils utilisateur (DESKTOP ET MOBILE)
  const profilUtilisateur = document.getElementById("user-profile");
  const profilUtilisateurMobile = document.getElementById(
    "user-profile-mobile"
  );

  // Ouvrir modal de connexion
  function ouvrirModalConnexion() {
    if (modalConnexion) {
      modalConnexion.classList.remove("hidden");
    }
  }

  // Ouvrir modal d'inscription
  function ouvrirModalInscription() {
    if (modalInscription) {
      modalInscription.classList.remove("hidden");
    }
  }

  // Fermer les modales
  function fermerModales() {
    if (modalConnexion) modalConnexion.classList.add("hidden");
    if (modalInscription) modalInscription.classList.add("hidden");
  }

  // Event listeners pour ouvrir
  if (boutonAuthMobile) {
    boutonAuthMobile.addEventListener("click", ouvrirModalConnexion);
  }

  if (boutonAuthDesktop) {
    boutonAuthDesktop.addEventListener("click", ouvrirModalConnexion);
  }

  // Event listeners pour fermer
  if (fermerModalConnexion) {
    fermerModalConnexion.addEventListener("click", fermerModales);
  }

  if (fermerModalInscription) {
    fermerModalInscription.addEventListener("click", fermerModales);
  }

  // Switch entre modales
  if (afficherInscription) {
    afficherInscription.addEventListener("click", function (e) {
      e.preventDefault();
      if (modalConnexion) modalConnexion.classList.add("hidden");
      if (modalInscription) modalInscription.classList.remove("hidden");
    });
  }

  if (afficherConnexion) {
    afficherConnexion.addEventListener("click", function (e) {
      e.preventDefault();
      if (modalInscription) modalInscription.classList.add("hidden");
      if (modalConnexion) modalConnexion.classList.remove("hidden");
    });
  }

  // Fermer en cliquant à l'extérieur
  if (modalConnexion) {
    modalConnexion.addEventListener("click", function (e) {
      if (e.target === modalConnexion) {
        fermerModales();
      }
    });
  }

  if (modalInscription) {
    modalInscription.addEventListener("click", function (e) {
      if (e.target === modalInscription) {
        fermerModales();
      }
    });
  }

  // Gestion de la connexion
  if (formulaireConnexion) {
    formulaireConnexion.addEventListener("submit", async function (e) {
      e.preventDefault();

      const email = document.getElementById("login-email").value;
      const motDePasse = document.getElementById("login-password").value;

      try {
        const reponse = await fetch(`${API_URL}/connexion`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, motDePasse }),
        });

        const donnees = await reponse.json();

        if (donnees.succes) {
          gererConnexionReussie(donnees);
        } else {
          afficherNotification(donnees.message, "error");
        }
      } catch (erreur) {
        console.error("Erreur connexion:", erreur);
        afficherNotification("Erreur de connexion au serveur", "error");
      }
    });
  }

  // Gestion de l'inscription
  if (formulaireInscription) {
    formulaireInscription.addEventListener("submit", async function (e) {
      e.preventDefault();

      const email = document.getElementById("register-email").value;
      const motDePasse = document.getElementById("register-password").value;
      const confirmationMotDePasse = document.getElementById(
        "register-password-confirm"
      ).value;

      if (motDePasse !== confirmationMotDePasse) {
        afficherNotification(
          "Les mots de passe ne correspondent pas !",
          "error"
        );
        return;
      }

      if (motDePasse.length < 5) {
        afficherNotification(
          "Le mot de passe doit contenir au moins 5 caractères",
          "error"
        );
        return;
      }

      try {
        const reponse = await fetch(`${API_URL}/inscription`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, motDePasse }),
        });

        const donnees = await reponse.json();

        if (donnees.succes) {
          gererConnexionReussie(donnees);
        } else {
          afficherNotification(donnees.message, "error");
        }
      } catch (erreur) {
        console.error("Erreur inscription:", erreur);
        afficherNotification("Erreur de connexion au serveur", "error");
      }
    });
  }

  function gererConnexionReussie(donnees) {
    fermerModales();

    // Sauvegarder le token et les infos utilisateur
    localStorage.setItem("token", donnees.token);
    localStorage.setItem("utilisateur", JSON.stringify(donnees.utilisateur));

    const nomUtilisateur =
      donnees.utilisateur.nom || donnees.utilisateur.email.split("@")[0];

    // Cacher les boutons de connexion
    if (boutonAuthMobile) boutonAuthMobile.classList.add("hidden");
    if (boutonAuthDesktop) boutonAuthDesktop.classList.add("hidden");

    // Afficher le profil DESKTOP
    if (profilUtilisateur) {
      profilUtilisateur.classList.remove("hidden");
      profilUtilisateur.classList.add("flex");

      const nomUtilisateurDesktop = document.getElementById("user-name");
      if (nomUtilisateurDesktop) {
        nomUtilisateurDesktop.textContent = nomUtilisateur;
      }
    }

    // Afficher le profil MOBILE
    if (profilUtilisateurMobile) {
      profilUtilisateurMobile.classList.remove("hidden");
      profilUtilisateurMobile.classList.add("flex");

      const nomUtilisateurMobile = document.getElementById("user-name-mobile");
      if (nomUtilisateurMobile) {
        nomUtilisateurMobile.textContent = nomUtilisateur;
      }
    }

    afficherNotification(" Connexion réussie !", "success");
  }

  // Vérifier le statut de connexion au chargement
  function verifierStatutConnexion() {
    const token = localStorage.getItem("token");
    const utilisateurStr = localStorage.getItem("utilisateur");

    if (token && utilisateurStr) {
      try {
        const utilisateur = JSON.parse(utilisateurStr);
        const nomUtilisateur =
          utilisateur.nom || utilisateur.email.split("@")[0];

        // Cacher les boutons de connexion
        if (boutonAuthMobile) boutonAuthMobile.classList.add("hidden");
        if (boutonAuthDesktop) boutonAuthDesktop.classList.add("hidden");

        // Afficher le profil DESKTOP
        if (profilUtilisateur) {
          profilUtilisateur.classList.remove("hidden");
          profilUtilisateur.classList.add("flex");

          const nomUtilisateurDesktop = document.getElementById("user-name");
          if (nomUtilisateurDesktop) {
            nomUtilisateurDesktop.textContent = nomUtilisateur;
          }
        }

        // Afficher le profil MOBILE
        if (profilUtilisateurMobile) {
          profilUtilisateurMobile.classList.remove("hidden");
          profilUtilisateurMobile.classList.add("flex");

          const nomUtilisateurMobile =
            document.getElementById("user-name-mobile");
          if (nomUtilisateurMobile) {
            nomUtilisateurMobile.textContent = nomUtilisateur;
          }
        }
      } catch (erreur) {
        console.error("Erreur parsing utilisateur:", erreur);
        deconnecter();
      }
    }
  }

  // Déconnexion
  function deconnecter() {
    localStorage.removeItem("token");
    localStorage.removeItem("utilisateur");
    location.reload();
  }

  // Déconnexion au clic sur le profil DESKTOP
  if (profilUtilisateur) {
    profilUtilisateur.addEventListener("click", function () {
      if (confirm("Voulez-vous vous déconnecter ?")) {
        deconnecter();
      }
    });
  }

  // Déconnexion au clic sur le profil MOBILE
  if (profilUtilisateurMobile) {
    profilUtilisateurMobile.addEventListener("click", function () {
      if (confirm("Voulez-vous vous déconnecter ?")) {
        deconnecter();
      }
    });
  }

  // Vérifier le statut au chargement
  verifierStatutConnexion();
});

// Fonction d'affichage des notifications (doit exister dans index.js)
function afficherNotification(message, type = "info") {
  // Si la fonction showNotification existe dans index.js, l'utiliser
  if (typeof showNotification === "function") {
    showNotification(message, type);
  } else {
    // Sinon, créer une version basique
    const notification = document.createElement("div");
    notification.className = `fixed top-24 right-6 z-50 px-6 py-4 rounded-lg shadow-xl transform transition-all duration-300 translate-x-full ${
      type === "success" ? "bg-green-500" : "bg-red-500"
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
}

// Fonction utilitaire pour les appels API authentifiés
async function appelApiAuthentifie(url, options = {}) {
  const token = localStorage.getItem("token");

  const config = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    ...options,
  };

  const reponse = await fetch(url, config);
  return await reponse.json();
}

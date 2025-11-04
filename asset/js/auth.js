document.addEventListener("DOMContentLoaded", function () {
  // ========================================
  // CONFIGURATION ET VARIABLES GLOBALES
  // ========================================
  const API_URL = "https://myappfood-backend.onrender.com/api/auth";

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

  // Profils utilisateur
  const profilUtilisateur = document.getElementById("user-profile");
  const profilUtilisateurMobile = document.getElementById(
    "user-profile-mobile"
  );

  // ========================================
  // GESTION DE LA CONNEXION OBLIGATOIRE
  // ========================================

  function estConnecte() {
    return localStorage.getItem("token") !== null;
  }

  function bloquerInterface() {
    if (!estConnecte()) {
      let overlay = document.getElementById("blocking-overlay");

      if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "blocking-overlay";
        overlay.className = "fixed inset-0 bg-black bg-opacity-50 z-40";
        overlay.style.backdropFilter = "blur(4px)";
        document.body.appendChild(overlay);
      }

      const mainContent = document.querySelector("main");
      const header = document.querySelector("header");

      if (mainContent) mainContent.style.pointerEvents = "none";
      if (header) header.style.pointerEvents = "none";

      if (modalConnexion) {
        modalConnexion.style.pointerEvents = "auto";
        modalConnexion.style.zIndex = "50";
      }
      if (modalInscription) {
        modalInscription.style.pointerEvents = "auto";
        modalInscription.style.zIndex = "50";
      }
    }
  }

  function debloquerInterface() {
    const overlay = document.getElementById("blocking-overlay");
    if (overlay) {
      overlay.remove();
    }

    const mainContent = document.querySelector("main");
    const header = document.querySelector("header");

    if (mainContent) mainContent.style.pointerEvents = "auto";
    if (header) header.style.pointerEvents = "auto";
  }

  function ouvrirModalConnexionObligatoire() {
    if (modalConnexion) {
      modalConnexion.classList.remove("hidden");

      if (fermerModalConnexion && !estConnecte()) {
        fermerModalConnexion.classList.add("hidden");
      }
    }
  }

  function configurerFermetureModales() {
    if (modalConnexion) {
      modalConnexion.addEventListener("click", function (e) {
        if (e.target === modalConnexion && estConnecte()) {
          fermerModales();
        }
      });
    }

    if (modalInscription) {
      modalInscription.addEventListener("click", function (e) {
        if (e.target === modalInscription && estConnecte()) {
          fermerModales();
        }
      });
    }

    if (fermerModalConnexion) {
      fermerModalConnexion.addEventListener("click", function () {
        if (estConnecte()) {
          fermerModales();
        }
      });
    }

    if (fermerModalInscription) {
      fermerModalInscription.addEventListener("click", function () {
        if (estConnecte()) {
          fermerModales();
        }
      });
    }
  }

  // ========================================
  // FONCTIONS DE GESTION DES MODALES
  // ========================================

  function ouvrirModalConnexion() {
    if (modalConnexion) {
      modalConnexion.classList.remove("hidden");

      if (fermerModalConnexion && estConnecte()) {
        fermerModalConnexion.classList.remove("hidden");
      }
    }
  }

  function ouvrirModalInscription() {
    if (modalInscription) {
      modalInscription.classList.remove("hidden");
    }
  }

  function fermerModales() {
    if (estConnecte()) {
      if (modalConnexion) modalConnexion.classList.add("hidden");
      if (modalInscription) modalInscription.classList.add("hidden");
    }
  }

  // ========================================
  // EVENT LISTENERS DES BOUTONS
  // ========================================

  if (boutonAuthMobile) {
    boutonAuthMobile.addEventListener("click", ouvrirModalConnexion);
  }

  if (boutonAuthDesktop) {
    boutonAuthDesktop.addEventListener("click", ouvrirModalConnexion);
  }

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

  // ========================================
  // GESTION DE LA CONNEXION
  // ========================================

  if (formulaireConnexion) {
    formulaireConnexion.addEventListener("submit", async function (e) {
      e.preventDefault();

      const email = document.getElementById("login-email").value;
      const motDePasse = document.getElementById("login-password").value;

      const boutonSubmit = formulaireConnexion.querySelector(
        'button[type="submit"]'
      );
      if (boutonSubmit) {
        boutonSubmit.disabled = true;
        boutonSubmit.textContent = "Connexion...";
      }

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
          afficherNotification(
            donnees.message || "Erreur de connexion",
            "error"
          );
        }
      } catch (erreur) {
        console.error("Erreur connexion:", erreur);
        afficherNotification("Erreur de connexion au serveur", "error");
      } finally {
        if (boutonSubmit) {
          boutonSubmit.disabled = false;
          boutonSubmit.textContent = "Se connecter";
        }
      }
    });
  }

  // ========================================
  // GESTION DE L'INSCRIPTION
  // ========================================

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

      if (motDePasse.length < 4) {
        afficherNotification(
          "Le mot de passe doit contenir au moins 4 caracteres",
          "error"
        );
        return;
      }

      const boutonSubmit = formulaireInscription.querySelector(
        'button[type="submit"]'
      );
      if (boutonSubmit) {
        boutonSubmit.disabled = true;
        boutonSubmit.textContent = "Inscription...";
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
          afficherNotification(
            donnees.message || "Erreur d'inscription",
            "error"
          );
        }
      } catch (erreur) {
        console.error("Erreur inscription:", erreur);
        afficherNotification("Erreur de connexion au serveur", "error");
      } finally {
        if (boutonSubmit) {
          boutonSubmit.disabled = false;
          boutonSubmit.textContent = "S'inscrire";
        }
      }
    });
  }

  // ========================================
  // GESTION DES CONNEXIONS RÉUSSIES
  // ========================================

  function gererConnexionReussie(donnees) {
    // Sauvegarder le token et les infos utilisateur
    localStorage.setItem("token", donnees.token);
    localStorage.setItem("utilisateur", JSON.stringify(donnees.utilisateur));

    // Débloquer l'interface
    debloquerInterface();

    // Fermer les modales
    fermerModales();

    // RÉDIRECTION AUTOMATIQUE POUR LES ADMINS
    if (donnees.utilisateur.role === "admin") {
      console.log(
        "Utilisateur admin détecté, redirection vers le dashboard..."
      );
      afficherNotification(
        "Connexion admin réussie ! Redirection...",
        "success"
      );
      setTimeout(() => {
        window.location.href = "/admin.html";
      }, 1500);
      return;
    }

    // Réafficher le bouton de fermeture
    if (fermerModalConnexion) {
      fermerModalConnexion.classList.remove("hidden");
    }

    // Masquer les boutons d'authentification
    if (boutonAuthMobile) boutonAuthMobile.classList.add("hidden");
    if (boutonAuthDesktop) boutonAuthDesktop.classList.add("hidden");

    // Afficher le profil utilisateur (Desktop)
    if (profilUtilisateur) {
      profilUtilisateur.classList.remove("hidden");
      profilUtilisateur.classList.add("flex");

      const nomUtilisateur = document.getElementById("user-name");
      if (nomUtilisateur) {
        nomUtilisateur.textContent =
          donnees.utilisateur.nom || donnees.utilisateur.email.split("@")[0];
      }
    }

    // Afficher le profil utilisateur (Mobile)
    if (profilUtilisateurMobile) {
      profilUtilisateurMobile.classList.remove("hidden");
      profilUtilisateurMobile.classList.add("flex");

      const nomUtilisateurMobile = document.getElementById("user-name-mobile");
      if (nomUtilisateurMobile) {
        nomUtilisateurMobile.textContent =
          donnees.utilisateur.nom || donnees.utilisateur.email.split("@")[0];
      }
    }

    afficherNotification(
      "Connexion réussie ! Bienvenue " +
        (donnees.utilisateur.nom || donnees.utilisateur.email.split("@")[0]),
      "success"
    );

    // Réinitialiser les formulaires
    if (formulaireConnexion) formulaireConnexion.reset();
    if (formulaireInscription) formulaireInscription.reset();
  }

  // ========================================
  // VÉRIFICATION DU STATUT DE CONNEXION
  // ========================================

  function verifierStatutConnexion() {
    const token = localStorage.getItem("token");
    const utilisateurStr = localStorage.getItem("utilisateur");

    if (token && utilisateurStr) {
      try {
        const utilisateur = JSON.parse(utilisateurStr);

        // Masquer les boutons d'authentification
        if (boutonAuthMobile) boutonAuthMobile.classList.add("hidden");
        if (boutonAuthDesktop) boutonAuthDesktop.classList.add("hidden");

        // Afficher le profil utilisateur (Desktop)
        if (profilUtilisateur) {
          profilUtilisateur.classList.remove("hidden");
          profilUtilisateur.classList.add("flex");

          const nomUtilisateur = document.getElementById("user-name");
          if (nomUtilisateur) {
            nomUtilisateur.textContent =
              utilisateur.nom || utilisateur.email.split("@")[0];
          }
        }

        // Afficher le profil utilisateur (Mobile)
        if (profilUtilisateurMobile) {
          profilUtilisateurMobile.classList.remove("hidden");
          profilUtilisateurMobile.classList.add("flex");

          const nomUtilisateurMobile =
            document.getElementById("user-name-mobile");
          if (nomUtilisateurMobile) {
            nomUtilisateurMobile.textContent =
              utilisateur.nom || utilisateur.email.split("@")[0];
          }
        }

        // Débloquer l'interface
        debloquerInterface();

        // Réafficher le bouton de fermeture des modales
        if (fermerModalConnexion) {
          fermerModalConnexion.classList.remove("hidden");
        }
      } catch (erreur) {
        console.error("Erreur parsing utilisateur:", erreur);
        deconnecter();
      }
    } else {
      // Utilisateur non connecté : bloquer l'interface
      bloquerInterface();
      ouvrirModalConnexionObligatoire();
      configurerFermetureModales();
    }
  }

  // ========================================
  // DÉCONNEXION
  // ========================================

  function deconnecter() {
    // Supprimer les données de session
    localStorage.removeItem("token");
    localStorage.removeItem("utilisateur");

    // Réinitialiser l'interface
    if (boutonAuthMobile) boutonAuthMobile.classList.remove("hidden");
    if (boutonAuthDesktop) boutonAuthDesktop.classList.remove("hidden");

    if (profilUtilisateur) {
      profilUtilisateur.classList.add("hidden");
      profilUtilisateur.classList.remove("flex");
    }

    if (profilUtilisateurMobile) {
      profilUtilisateurMobile.classList.add("hidden");
      profilUtilisateurMobile.classList.remove("flex");
    }

    afficherNotification("Déconnexion réussie", "success");

    // Recharger la page après un court délai
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }

  // Event listeners pour la déconnexion
  if (profilUtilisateur) {
    profilUtilisateur.addEventListener("click", function () {
      if (confirm("Voulez-vous vous déconnecter ?")) {
        deconnecter();
      }
    });
  }

  if (profilUtilisateurMobile) {
    profilUtilisateurMobile.addEventListener("click", function () {
      if (confirm("Voulez-vous vous déconnecter ?")) {
        deconnecter();
      }
    });
  }

  // ========================================
  // NOTIFICATION SYSTÈME
  // ========================================

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

  // Exposer la fonction globalement
  window.afficherNotification = afficherNotification;

  // ========================================
  // INITIALISATION
  // ========================================

  verifierStatutConnexion();
});

// ========================================
// FONCTION UTILITAIRE POUR APPELS API AUTHENTIFIÉS
// ========================================

async function appelApiAuthentifie(url, options = {}) {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Utilisateur non authentifié");
  }

  const config = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  };

  const reponse = await fetch(url, config);

  if (reponse.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("utilisateur");
    window.location.reload();
  }

  return await reponse.json();
}

// Exposer la fonction globalement
window.appelApiAuthentifie = appelApiAuthentifie;

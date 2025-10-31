// Gestion de l'authentification avec backend
const API_URL = "http://localhost:3000/api/auth";

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

  // Profils utilisateur
  const profilUtilisateur = document.getElementById("user-profile");

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

    // Mettre à jour l'interface
    if (boutonAuthMobile) boutonAuthMobile.classList.add("hidden");
    if (boutonAuthDesktop) boutonAuthDesktop.classList.add("hidden");

    if (profilUtilisateur) {
      profilUtilisateur.classList.remove("hidden");
      profilUtilisateur.classList.add("flex");

      // Mettre à jour le nom
      const nomUtilisateur = document.getElementById("user-name");
      if (nomUtilisateur) {
        nomUtilisateur.textContent =
          donnees.utilisateur.nom || donnees.utilisateur.email.split("@")[0];
      }
    }

    afficherNotification("Connexion réussie !", "success");
  }

  // Vérifier le statut de connexion au chargement
  function verifierStatutConnexion() {
    const token = localStorage.getItem("token");
    const utilisateurStr = localStorage.getItem("utilisateur");

    if (token && utilisateurStr) {
      try {
        const utilisateur = JSON.parse(utilisateurStr);

        if (boutonAuthMobile) boutonAuthMobile.classList.add("hidden");
        if (boutonAuthDesktop) boutonAuthDesktop.classList.add("hidden");

        if (profilUtilisateur) {
          profilUtilisateur.classList.remove("hidden");
          profilUtilisateur.classList.add("flex");

          const nomUtilisateur = document.getElementById("user-name");
          if (nomUtilisateur) {
            nomUtilisateur.textContent =
              utilisateur.nom || utilisateur.email.split("@")[0];
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

  // Déconnexion au clic sur le profil
  if (profilUtilisateur) {
    profilUtilisateur.addEventListener("click", function () {
      if (confirm("Voulez-vous vous déconnecter ?")) {
        deconnecter();
      }
    });
  }

  // Vérifier le statut au chargement
  verifierStatutConnexion();
});

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

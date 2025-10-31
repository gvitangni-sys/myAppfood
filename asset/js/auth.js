// Gestion de l'authentification
document.addEventListener("DOMContentLoaded", function () {
  // Éléments des modales
  const loginModal = document.getElementById("login-modal");
  const registerModal = document.getElementById("register-modal");

  // Boutons d'ouverture
  const mobileAuthBtn = document.getElementById("mobile-auth-btn");
  const desktopAuthBtn = document.getElementById("desktop-auth-btn");

  // Boutons de fermeture
  const closeLoginModal = document.getElementById("close-login-modal");
  const closeRegisterModal = document.getElementById("close-register-modal");

  // Liens de switch
  const showRegister = document.getElementById("show-register");
  const showLogin = document.getElementById("show-login");

  // Formulaires
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");

  // Profils utilisateur
  const userProfile = document.getElementById("user-profile");

  // Ouvrir modal de connexion
  function openLoginModal() {
    if (loginModal) {
      loginModal.classList.remove("hidden");
    }
  }

  // Ouvrir modal d'inscription
  function openRegisterModal() {
    if (registerModal) {
      registerModal.classList.remove("hidden");
    }
  }

  // Fermer les modales
  function closeModals() {
    if (loginModal) loginModal.classList.add("hidden");
    if (registerModal) registerModal.classList.add("hidden");
  }

  // Event listeners pour ouvrir
  if (mobileAuthBtn) {
    mobileAuthBtn.addEventListener("click", openLoginModal);
  }

  if (desktopAuthBtn) {
    desktopAuthBtn.addEventListener("click", openLoginModal);
  }

  // Event listeners pour fermer
  if (closeLoginModal) {
    closeLoginModal.addEventListener("click", closeModals);
  }

  if (closeRegisterModal) {
    closeRegisterModal.addEventListener("click", closeModals);
  }

  // Switch entre modales
  if (showRegister) {
    showRegister.addEventListener("click", function (e) {
      e.preventDefault();
      if (loginModal) loginModal.classList.add("hidden");
      if (registerModal) registerModal.classList.remove("hidden");
    });
  }

  if (showLogin) {
    showLogin.addEventListener("click", function (e) {
      e.preventDefault();
      if (registerModal) registerModal.classList.add("hidden");
      if (loginModal) loginModal.classList.remove("hidden");
    });
  }

  // Fermer en cliquant à l'extérieur
  if (loginModal) {
    loginModal.addEventListener("click", function (e) {
      if (e.target === loginModal) {
        closeModals();
      }
    });
  }

  if (registerModal) {
    registerModal.addEventListener("click", function (e) {
      if (e.target === registerModal) {
        closeModals();
      }
    });
  }

  // Gestion de la connexion
  if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();

      const email = document.getElementById("login-email").value;
      const password = document.getElementById("login-password").value;

      // TODO: Ajouter vraie logique de connexion avec backend
      console.log("Connexion:", email);
      simulateLogin(email);
    });
  }

  // Gestion de l'inscription
  if (registerForm) {
    registerForm.addEventListener("submit", function (e) {
      e.preventDefault();

      const email = document.getElementById("register-email").value;
      const password = document.getElementById("register-password").value;
      const passwordConfirm = document.getElementById(
        "register-password-confirm"
      ).value;

      if (password !== passwordConfirm) {
        alert("Les mots de passe ne correspondent pas !");
        return;
      }

      if (password.length < 6) {
        alert("Le mot de passe doit contenir au moins 6 caractères");
        return;
      }

      // TODO: Ajouter vraie logique d'inscription avec backend
      console.log("Inscription:", email);
      simulateLogin(email);
    });
  }

  function simulateLogin(email) {
    closeModals();

    // Cacher les boutons de connexion
    if (mobileAuthBtn) mobileAuthBtn.classList.add("hidden");
    if (desktopAuthBtn) desktopAuthBtn.classList.add("hidden");

    // Afficher le profil
    if (userProfile) {
      userProfile.classList.remove("hidden");
      userProfile.classList.add("flex");

      // Mettre à jour le nom
      const userName = document.getElementById("user-name");
      if (userName) {
        userName.textContent = email.split("@")[0];
      }
    }

    // Sauvegarder dans localStorage
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("userEmail", email);

    // Afficher notification de succès
    if (typeof showNotification === "function") {
      showNotification(" Connexion réussie !", "success");
    }
  }

  // Vérifier le statut de connexion au chargement
  function checkLoginStatus() {
    if (localStorage.getItem("isLoggedIn") === "true") {
      const email = localStorage.getItem("userEmail") || "Utilisateur";

      if (mobileAuthBtn) mobileAuthBtn.classList.add("hidden");
      if (desktopAuthBtn) desktopAuthBtn.classList.add("hidden");

      if (userProfile) {
        userProfile.classList.remove("hidden");
        userProfile.classList.add("flex");

        const userName = document.getElementById("user-name");
        if (userName) {
          userName.textContent = email.split("@")[0];
        }
      }
    }
  }

  // Déconnexion au clic sur le profil
  if (userProfile) {
    userProfile.addEventListener("click", function () {
      if (confirm("Voulez-vous vous déconnecter ?")) {
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("userEmail");
        location.reload();
      }
    });
  }

  // Vérifier le statut au chargement
  checkLoginStatus();
});

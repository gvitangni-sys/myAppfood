const express = require("express");
const jwt = require("jsonwebtoken");

const router = express.Router();

// Générer token JWT
const genererToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "secret_temporaire_123", {
    expiresIn: process.env.JWT_EXPIRE || "30d",
  });
};

// Inscription (mode démo)
router.post("/inscription", async (req, res) => {
  try {
    const { email, motDePasse } = req.body;

    // Validation simple
    if (!email || !motDePasse) {
      return res.status(400).json({
        succes: false,
        message: "Email et mot de passe requis",
      });
    }

    if (motDePasse.length < 4) {
      return res.status(400).json({
        succes: false,
        message: "Le mot de passe doit contenir au moins 4 caractères",
      });
    }

    // Simulation d'utilisateur (sans base de données)
    const utilisateurDemo = {
      id: Date.now(), // ID unique
      email: email,
      nom: email.split("@")[0], // Utilise le début de l'email comme nom
    };

    // Générer token
    const token = genererToken(utilisateurDemo.id);

    res.status(201).json({
      succes: true,
      message: "Compte créé avec succès (mode démo)",
      token,
      utilisateur: {
        id: utilisateurDemo.id,
        email: utilisateurDemo.email,
        nom: utilisateurDemo.nom,
      },
    });
  } catch (erreur) {
    console.error("Erreur inscription:", erreur);
    res.status(500).json({
      succes: false,
      message: "Erreur lors de la création du compte",
    });
  }
});

// Connexion (mode démo)
router.post("/connexion", async (req, res) => {
  try {
    const { email, motDePasse } = req.body;

    // Validation
    if (!email || !motDePasse) {
      return res.status(400).json({
        succes: false,
        message: "Email et mot de passe requis",
      });
    }

    // Simulation d'utilisateur (accepte tout en mode démo)
    const utilisateurDemo = {
      id: 1, // ID fixe pour la démo
      email: email,
      nom: email.split("@")[0],
    };

    // Générer token
    const token = genererToken(utilisateurDemo.id);

    res.json({
      succes: true,
      message: "Connexion réussie (mode démo)",
      token,
      utilisateur: {
        id: utilisateurDemo.id,
        email: utilisateurDemo.email,
        nom: utilisateurDemo.nom,
      },
    });
  } catch (erreur) {
    console.error("Erreur connexion:", erreur);
    res.status(500).json({
      succes: false,
      message: "Erreur lors de la connexion",
    });
  }
});

// Profil utilisateur (mode démo)
router.get("/profil", async (req, res) => {
  try {
    // En mode démo, retourner un profil basique
    res.json({
      succes: true,
      utilisateur: {
        id: 1,
        email: "utilisateur@demo.com",
        nom: "Utilisateur Demo",
      },
    });
  } catch (erreur) {
    console.error("Erreur profil:", erreur);
    res.status(500).json({
      succes: false,
      message: "Erreur lors de la récupération du profil",
    });
  }
});

module.exports = router;

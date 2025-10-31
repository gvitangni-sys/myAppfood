const express = require("express");
const jwt = require("jsonwebtoken");
const Utilisateur = require("../models/Utilisateur");
const { verifierAuth } = require("../middleware/auth");

const router = express.Router();

// Générer token JWT
const genererToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "30d",
  });
};

// Inscription
router.post("/inscription", async (req, res) => {
  try {
    const { email, motDePasse, nom, prenom, telephone } = req.body;

    // Validation
    if (!email || !motDePasse) {
      return res.status(400).json({
        succes: false,
        message: "Email et mot de passe requis",
      });
    }

    if (motDePasse.length < 5) {
      return res.status(400).json({
        succes: false,
        message: "Le mot de passe doit contenir au moins 5 caractères",
      });
    }

    // Vérifier si l'utilisateur existe déjà
    const utilisateurExistant = await Utilisateur.findOne({ email });
    if (utilisateurExistant) {
      return res.status(400).json({
        succes: false,
        message: "Un compte avec cet email existe déjà",
      });
    }

    // Créer nouvel utilisateur
    const nouvelUtilisateur = new Utilisateur({
      email,
      motDePasse,
      nom: nom || "",
    });

    await nouvelUtilisateur.save();

    // Générer token
    const token = genererToken(nouvelUtilisateur._id);

    res.status(201).json({
      succes: true,
      message: "Compte créé avec succès",
      token,
      utilisateur: {
        id: nouvelUtilisateur._id,
        email: nouvelUtilisateur.email,
        nom: nouvelUtilisateur.nom,
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

// Connexion
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

    // Trouver l'utilisateur
    const utilisateur = await Utilisateur.findOne({ email });
    if (!utilisateur) {
      return res.status(401).json({
        succes: false,
        message: "Email ou mot de passe incorrect",
      });
    }

    // Vérifier le mot de passe
    const motDePasseValide = await utilisateur.comparerMotDePasse(motDePasse);
    if (!motDePasseValide) {
      return res.status(401).json({
        succes: false,
        message: "Email ou mot de passe incorrect",
      });
    }

    // Générer token
    const token = genererToken(utilisateur._id);

    res.json({
      succes: true,
      message: "Connexion réussie",
      token,
      utilisateur: {
        id: utilisateur._id,
        email: utilisateur.email,
        nom: utilisateur.nom,
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

// Profil utilisateur
router.get("/profil", verifierAuth, async (req, res) => {
  try {
    res.json({
      succes: true,
      utilisateur: req.utilisateur,
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

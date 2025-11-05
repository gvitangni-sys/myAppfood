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
    const { email, motDePasse } = req.body;

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
        role: nouvelUtilisateur.role,
        nom: nouvelUtilisateur.email.split("@")[0],
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
        message: "Email incorrect",
      });
    }

    // Vérifier le mot de passe
    const motDePasseValide = await utilisateur.comparerMotDePasse(motDePasse);
    if (!motDePasseValide) {
      return res.status(401).json({
        succes: false,
        message: "Mot de passe incorrect",
      });
    }

    // Mettre à jour la dernière connexion
    utilisateur.derniereConnexion = new Date();
    await utilisateur.save();

    // Générer token
    const token = genererToken(utilisateur._id);

    res.json({
      succes: true,
      message: "Connexion réussie",
      token,
      utilisateur: {
        id: utilisateur._id,
        email: utilisateur.email,
        role: utilisateur.role,
        nom: utilisateur.email.split("@")[0],
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

// Route profil utilisateur
router.get("/profil", verifierAuth, async (req, res) => {
  try {
    res.json({
      succes: true,
      utilisateur: {
        id: req.utilisateur._id,
        email: req.utilisateur.email,
        role: req.utilisateur.role,
        nom: req.utilisateur.email.split("@")[0],
        dateInscription: req.utilisateur.dateInscription,
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

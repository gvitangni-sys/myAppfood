const express = require("express");
const jwt = require("jsonwebtoken");
const Utilisateur = require("../models/Utilisateur");
const { verifierAuth } = require("../middleware/auth");

const router = express.Router();

const genererToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "30d",
  });
};

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
        message: "Le mot de passe doit contenir au moins 4 caracteres",
      });
    }

    const utilisateurExistant = await Utilisateur.findOne({ email });
    if (utilisateurExistant) {
      return res.status(400).json({
        succes: false,
        message: "Un compte avec cet email existe deja",
      });
    }

    const nouvelUtilisateur = new Utilisateur({
      email,
      motDePasse,
    });

    await nouvelUtilisateur.save();

    const token = genererToken(nouvelUtilisateur._id);

    res.status(201).json({
      succes: true,
      message: "Compte cree avec succes",
      token,
      utilisateur: {
        id: nouvelUtilisateur._id,
        email: nouvelUtilisateur.email,
        role: nouvelUtilisateur.role,
      },
    });
  } catch (erreur) {
    console.error("Erreur inscription:", erreur);
    res.status(500).json({
      succes: false,
      message: "Erreur lors de la creation du compte",
    });
  }
});

router.post("/connexion", async (req, res) => {
  try {
    const { email, motDePasse } = req.body;

    if (!email || !motDePasse) {
      return res.status(400).json({
        succes: false,
        message: "Email et mot de passe requis",
      });
    }

    const utilisateur = await Utilisateur.findOne({ email });
    if (!utilisateur) {
      return res.status(401).json({
        succes: false,
        message: "Email ou mot de passe incorrect",
      });
    }

    if (utilisateur.statut !== "actif") {
      return res.status(401).json({
        succes: false,
        message: "Votre compte a ete desactive",
      });
    }

    const motDePasseValide = await utilisateur.comparerMotDePasse(motDePasse);
    if (!motDePasseValide) {
      return res.status(401).json({
        succes: false,
        message: "Email ou mot de passe incorrect",
      });
    }

    utilisateur.derniereConnexion = new Date();
    await utilisateur.save();

    const token = genererToken(utilisateur._id);

    res.json({
      succes: true,
      message: "Connexion reussie",
      token,
      utilisateur: {
        id: utilisateur._id,
        email: utilisateur.email,
        role: utilisateur.role,
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

router.get("/profil", verifierAuth, async (req, res) => {
  try {
    res.json({
      succes: true,
      utilisateur: {
        id: req.utilisateur._id,
        email: req.utilisateur.email,
        role: req.utilisateur.role,
        dateInscription: req.utilisateur.dateInscription,
      },
    });
  } catch (erreur) {
    console.error("Erreur profil:", erreur);
    res.status(500).json({
      succes: false,
      message: "Erreur lors de la recuperation du profil",
    });
  }
});

module.exports = router;

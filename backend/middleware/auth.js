const jwt = require("jsonwebtoken");
const Utilisateur = require("../models/Utilisateur");

const verifierAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        succes: false,
        message: "Token d'authentification manquant",
      });
    }

    const decode = jwt.verify(token, process.env.JWT_SECRET);
    const utilisateur = await Utilisateur.findById(decode.id).select(
      "-motDePasse"
    );

    if (!utilisateur) {
      return res.status(401).json({
        succes: false,
        message: "Token invalide",
      });
    }

    if (utilisateur.statut !== "actif") {
      return res.status(401).json({
        succes: false,
        message: "Compte désactivé",
      });
    }

    req.utilisateur = utilisateur;
    next();
  } catch (erreur) {
    console.error("Erreur vérification token:", erreur);
    res.status(401).json({
      succes: false,
      message: "Token invalide",
    });
  }
};

const verifierAdmin = async (req, res, next) => {
  try {
    if (req.utilisateur.role !== "admin") {
      return res.status(403).json({
        succes: false,
        message: "Accès refusé. Droits administrateur requis.",
      });
    }
    next();
  } catch (erreur) {
    console.error("Erreur vérification admin:", erreur);
    res.status(500).json({
      succes: false,
      message: "Erreur serveur",
    });
  }
};

module.exports = { verifierAuth, verifierAdmin };

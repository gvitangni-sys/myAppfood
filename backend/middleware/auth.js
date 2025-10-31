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

module.exports = { verifierAuth };

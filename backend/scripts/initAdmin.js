const mongoose = require("mongoose");
const Utilisateur = require("../models/Utilisateur");
require("dotenv").config();

async function initialiserAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connexion à MongoDB établie");

    const emailAdmin = "admin@myappfood.com";

    // Supprimer l'ancien admin s'il existe
    await Utilisateur.deleteOne({ email: emailAdmin });
    console.log("Ancien compte admin supprimé");

    // Créer le nouvel admin
    const admin = new Utilisateur({
      email: emailAdmin,
      motDePasse: "admin123",
      role: "admin",
      statut: "actif",
    });

    await admin.save();
    console.log("Nouveau compte administrateur créé avec succès");
    console.log("Email: " + emailAdmin);
    console.log("Mot de passe: admin123");
  } catch (erreur) {
    console.error("Erreur lors de la création de l'administrateur:", erreur);
  } finally {
    await mongoose.connection.close();
  }
}

initialiserAdmin();

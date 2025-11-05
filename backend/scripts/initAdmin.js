const mongoose = require("mongoose");
const Utilisateur = require("../models/Utilisateur");
require("dotenv").config();

async function initialiserAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connexion à MongoDB établie");

    const emailAdmin = "admin@myappfood.com";

    // Mettre à jour l'admin existant pour lui donner le rôle admin
    const resultat = await Utilisateur.findOneAndUpdate(
      { email: emailAdmin },
      {
        role: "admin",
        motDePasse: "admin123", // Réinitialiser le mot de passe
      },
      { new: true }
    );

    if (resultat) {
      console.log("Compte administrateur MIS À JOUR avec succès");
      console.log("Email: " + emailAdmin);
      console.log("Mot de passe: admin123");
      console.log("Rôle: " + resultat.role);
    } else {
      // Créer un nouvel admin si aucun n'existe
      const admin = new Utilisateur({
        email: emailAdmin,
        motDePasse: "admin123",
        role: "admin",
        statut: "actif",
      });

      await admin.save();
      console.log("Nouveau compte administrateur CRÉÉ avec succès");
      console.log("Email: " + emailAdmin);
      console.log("Mot de passe: admin123");
    }
  } catch (erreur) {
    console.error(
      "Erreur lors de la création/mise à jour de l'administrateur:",
      erreur
    );
  } finally {
    await mongoose.connection.close();
  }
}

initialiserAdmin();

const mongoose = require("mongoose");
const Utilisateur = require("../models/Utilisateur");
require("dotenv").config();

async function initialiserAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connexion a MongoDB etablie");

    const emailAdmin = "admin@myappfood.com";
    const adminExistant = await Utilisateur.findOne({ email: emailAdmin });

    if (adminExistant) {
      console.log("Compte administrateur existe deja");
      console.log("Email: " + emailAdmin);
      return;
    }

    const admin = new Utilisateur({
      email: emailAdmin,
      motDePasse: "admin123",
      role: "admin",
    });

    await admin.save();
    console.log("compte administrateur cree avec succes");
    console.log("email: " + emailAdmin);
    console.log("mot de passe: admin123");
  } catch (erreur) {
    console.error("Erreur lors de la creation de l administrateur:", erreur);
  } finally {
    await mongoose.connection.close();
  }
}

initialiserAdmin();

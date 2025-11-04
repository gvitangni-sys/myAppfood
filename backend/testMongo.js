const mongoose = require("mongoose");
require("dotenv").config();

async function testMongo() {
  try {
    console.log("Test de connexion MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connecté");

    // Testez une opération simple
    const count = await mongoose.connection.db
      .collection("utilisateurs")
      .countDocuments();
    console.log(`Nombre d'utilisateurs: ${count}`);

    await mongoose.connection.close();
  } catch (error) {
    console.error("❌ Erreur MongoDB:", error.message);
  }
}

testMongo();

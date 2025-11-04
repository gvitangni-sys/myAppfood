const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../")));

// Connexion MongoDB
const MONGODB_URI = process.env.MONGODB_URI;

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("Connexion a MongoDB Atlas reussie");
  })
  .catch((err) => {
    console.error("Erreur de connexion a MongoDB:", err);
    process.exit(1);
  });

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes API
app.use("/api/auth", require("./routes/auth"));
app.use("/api/admin", require("./routes/admin"));

// Route de test API
app.get("/api/test", (req, res) => {
  res.json({
    succes: true,
    message: "API MyAppFood fonctionne correctement",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// Route de santé de l'API
app.get("/api/health", (req, res) => {
  const dbStatus =
    mongoose.connection.readyState === 1 ? "connected" : "disconnected";

  res.json({
    status: "OK",
    database: dbStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Servir les fichiers statics
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../index.html"));
});

app.get("/admin.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../admin.html"));
});

// Gestion des routes non trouvées (API)
app.use("/api/*", (req, res) => {
  res.status(404).json({
    succes: false,
    message: "Route API non trouvee",
  });
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
  console.error("Erreur serveur:", err);

  res.status(500).json({
    succes: false,
    message: "Erreur interne du serveur",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Gestion de la fermeture gracieuse
process.on("SIGINT", async () => {
  console.log("Fermeture gracieuse du serveur...");
  await mongoose.connection.close();
  console.log("Connexion MongoDB fermee");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Arret du serveur...");
  await mongoose.connection.close();
  console.log("Connexion MongoDB fermee");
  process.exit(0);
});

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "localhost";

app.listen(PORT, HOST, () => {
  console.log("==================================================");
  console.log("Serveur MyAppFood demarre");
  console.log("==================================================");
  console.log("Port: " + PORT);
  console.log("Host: " + HOST);
  console.log("Environment: " + (process.env.NODE_ENV || "development"));
  console.log("URL: http://" + HOST + ":" + PORT);
  console.log("URL Admin: http://" + HOST + ":" + PORT + "/admin.html");
  console.log("API Health: http://" + HOST + ":" + PORT + "/api/health");
  console.log("==================================================");
  console.log("Compte admin: admin@myappfood.com");
  console.log("Mot de passe: admin123");
  console.log("==================================================");
});

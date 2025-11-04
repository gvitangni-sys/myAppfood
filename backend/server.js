const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connexion MongoDB
const MONGODB_URI = process.env.MONGODB_URI;

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("Connexion a MongoDB Atlas reussie");
  })
  .catch((err) => {
    console.error("Erreur de connexion a MongoDB:", err.message);
  });

// Import des routes
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");

// Montage des routes API
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

// Routes API de base
app.get("/api/test", (req, res) => {
  res.json({
    succes: true,
    message: "API MyAppFood fonctionne correctement",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health", (req, res) => {
  const dbStatus =
    mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  res.json({
    status: "OK",
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

// Servir les fichiers statics (doit être APRÈS les routes API)
app.use(express.static(path.join(__dirname, "../")));

// Routes pour les pages HTML
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../index.html"));
});

app.get("/admin.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../admin.html"));
});

app.get("/admin-signup.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../admin-signup.html"));
});

// Gestion des routes non trouvées
app.use((req, res) => {
  res.status(404).json({
    succes: false,
    message: "Route non trouvee: " + req.method + " " + req.originalUrl,
  });
});

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error("Erreur serveur:", err);
  res.status(500).json({
    succes: false,
    message: "Erreur interne du serveur",
  });
});

// Démarrage du serveur
const PORT = process.env.PORT || 10000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Serveur demarre sur le port " + PORT);
  console.log("URL: http://localhost:" + PORT);
  console.log("URL Admin: http://localhost:" + PORT + "/admin.html");
  console.log(
    "URL Inscription Admin: http://localhost:" + PORT + "/admin-signup.html"
  );
});

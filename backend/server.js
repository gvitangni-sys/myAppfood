const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

// Middleware CORS
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

// Import ABSOLU des routes (chemins complets)
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");

// Montage des routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

// Route de test pour vérifier que les routes sont montées
app.get("/api/routes-test", (req, res) => {
  res.json({
    succes: true,
    message: "Routes API test",
    routes: [
      "POST /api/auth/inscription",
      "POST /api/auth/connexion",
      "GET /api/auth/profil",
      "GET /api/admin/statistiques",
      "GET /api/admin/utilisateurs",
    ],
  });
});

// Routes de base
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

// Servir les fichiers statics
app.use(express.static(path.join(__dirname, "../")));

// Routes pour les pages HTML
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../index.html"));
});

app.get("/admin.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../admin.html"));
});

// Gestion des routes non trouvées
app.use((req, res) => {
  res.status(404).json({
    succes: false,
    message: "Route non trouvee: " + req.method + " " + req.originalUrl,
  });
});

// Démarrage du serveur
const PORT = process.env.PORT || 10000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("=== SERVEUR DEMARRE ===");
  console.log("Port: " + PORT);
  console.log("=== ROUTES DISPONIBLES ===");
  console.log("GET  /api/test");
  console.log("GET  /api/health");
  console.log("GET  /api/routes-test");
  console.log("POST /api/auth/inscription");
  console.log("POST /api/auth/connexion");
  console.log("GET  /api/auth/profil");
  console.log("GET  /api/admin/statistiques");
  console.log("GET  /api/admin/utilisateurs");
  console.log("=== ================= ===");
});

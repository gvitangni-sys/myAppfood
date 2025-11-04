const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
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

// Import des models
const Utilisateur = require("./models/Utilisateur");

// ========================================
// SYSTÈME DE RÉINITIALISATION DE MOT DE PASSE
// ========================================

// Stockage temporaire des tokens
const resetTokens = new Map();

// Configuration du transporteur email Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Fonction pour générer un token unique
function genererTokenReinitialisation() {
  return crypto.randomBytes(32).toString("hex");
}

// Route 1: Demande de réinitialisation
app.post("/api/reset-password/request", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        succes: false,
        message: "Email requis",
      });
    }

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        succes: false,
        message: "Format d'email invalide",
      });
    }

    // Vérifier si l'utilisateur existe
    const utilisateurExistant = await Utilisateur.findOne({ email });
    if (!utilisateurExistant) {
      return res.status(404).json({
        succes: false,
        message: "Aucun compte trouvé avec cet email",
      });
    }

    // Générer un token unique
    const resetToken = genererTokenReinitialisation();

    // Stocker le token avec expiration (15 minutes)
    resetTokens.set(resetToken, {
      email: email,
      utilisateurId: utilisateurExistant._id,
      createdAt: Date.now(),
      expiresAt: Date.now() + 15 * 60 * 1000,
    });

    // Créer le lien de réinitialisation
    const resetLink = `https://votre-site.com/new_mdpo.html?token=${resetToken}`;

    // Envoyer l'email
    const mailOptions = {
      from: "MyAppFood <noreply@myappfood.com>",
      to: email,
      subject: "Reinitialisation de votre mot de passe - MyAppFood",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">MyAppFood</h1>
          </div>
          
          <div style="padding: 30px; background: #ffffff;">
            <h2 style="color: #1f2937;">Reinitialisation de mot de passe</h2>
            <p style="color: #4b5563; line-height: 1.6;">
              Vous avez demande a reinitialiser votre mot de passe. 
              Cliquez sur le bouton ci-dessous pour creer un nouveau mot de passe :
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                 style="background: #f97316; color: white; padding: 15px 30px; 
                        text-decoration: none; border-radius: 8px; display: inline-block;
                        font-weight: bold;">
                Reinitialiser mon mot de passe
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              Ce lien expire dans 15 minutes.<br>
              Si vous n'avez pas demande cette reinitialisation, ignorez cet email.
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    console.log("Email de reinitialisation envoye a:", email);

    res.json({
      succes: true,
      message: "Email de reinitialisation envoye",
    });
  } catch (error) {
    console.error("Erreur reinitialisation:", error);
    res.status(500).json({
      succes: false,
      message: "Erreur serveur lors de l'envoi de l'email",
    });
  }
});

// Route 2: Verifier la validite d'un token
app.get("/api/reset-password/verify/:token", (req, res) => {
  try {
    const { token } = req.params;

    if (!resetTokens.has(token)) {
      return res.status(400).json({
        valid: false,
        error: "INVALID_TOKEN",
        message: "Token invalide",
      });
    }

    const tokenData = resetTokens.get(token);

    // Verifier si le token a expire
    if (Date.now() > tokenData.expiresAt) {
      resetTokens.delete(token);
      return res.status(400).json({
        valid: false,
        error: "EXPIRED_TOKEN",
        message: "Token expire",
      });
    }

    res.json({
      valid: true,
      email: tokenData.email,
    });
  } catch (error) {
    console.error("Erreur verification token:", error);
    res.status(500).json({
      message: "Erreur serveur",
    });
  }
});

// Route 3: Confirmer le nouveau mot de passe
app.post("/api/reset-password/confirm", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        succes: false,
        message: "Token et nouveau mot de passe requis",
      });
    }

    // Verifier le token
    if (!resetTokens.has(token)) {
      return res.status(400).json({
        succes: false,
        error: "INVALID_TOKEN",
        message: "Token invalide ou expire",
      });
    }

    const tokenData = resetTokens.get(token);

    // Verifier l'expiration
    if (Date.now() > tokenData.expiresAt) {
      resetTokens.delete(token);
      return res.status(400).json({
        succes: false,
        error: "EXPIRED_TOKEN",
        message: "Token expire",
      });
    }

    // Validation du mot de passe (4 caracteres minimum)
    if (newPassword.length < 4) {
      return res.status(400).json({
        succes: false,
        message: "Le mot de passe doit contenir au moins 4 caracteres",
      });
    }

    // Mettre a jour le mot de passe dans la base de données
    const utilisateur = await Utilisateur.findById(tokenData.utilisateurId);
    if (!utilisateur) {
      return res.status(404).json({
        succes: false,
        message: "Utilisateur non trouve",
      });
    }

    // Le pre-save hook dans le modele Utilisateur va hasher automatiquement le mot de passe
    utilisateur.motDePasse = newPassword;
    await utilisateur.save();

    console.log("Mot de passe reinitialise pour:", tokenData.email);

    // Supprimer le token utilise
    resetTokens.delete(token);

    res.json({
      succes: true,
      message: "Mot de passe reinitialise avec succes",
    });
  } catch (error) {
    console.error("Erreur confirmation:", error);
    res.status(500).json({
      succes: false,
      message: "Erreur serveur lors de la reinitialisation",
    });
  }
});

// Nettoyage automatique des tokens expires
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;

  for (const [token, data] of resetTokens.entries()) {
    if (now > data.expiresAt) {
      resetTokens.delete(token);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`Nettoyage: ${cleaned} token(s) expire(s) supprime(s)`);
  }
}, 30 * 60 * 1000);

// ========================================
// ROUTES EXISTANTES
// ========================================

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
      "POST /api/reset-password/request",
      "GET /api/reset-password/verify/:token",
      "POST /api/reset-password/confirm",
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

app.get("/reset_mdp.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../reset_mdp.html"));
});

app.get("/new_mdpo.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../new_mdpo.html"));
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
  console.log("Port: " + PORT);
  console.log("=== ROUTES DISPONIBLES ===");
  console.log("GET  /api/test");
  console.log("GET  /api/health");
  console.log("GET  /api/routes-test");
  console.log("POST /api/auth/inscription");
  console.log("POST /api/auth/connexion");
  console.log("GET  /api/auth/profil");
  console.log("POST /api/reset-password/request");
  console.log("GET  /api/reset-password/verify/:token");
  console.log("POST /api/reset-password/confirm");
  console.log("=== ================= ===");
});

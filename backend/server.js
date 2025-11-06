const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const OpenAI = require("openai");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const MONGODB_URI = process.env.MONGODB_URI;

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("Connexion a MongoDB Atlas reussie");
  })
  .catch((err) => {
    console.error("Erreur de connexion a MongoDB:", err.message);
  });

const Utilisateur = require("./models/Utilisateur");
const ResetToken = require("./models/ResetToken");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

function genererTokenReinitialisation() {
  return crypto.randomBytes(32).toString("hex");
}

app.post("/api/reset-password/request", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        succes: false,
        message: "Email requis",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        succes: false,
        message: "Format d'email invalide",
      });
    }

    const utilisateurExistant = await Utilisateur.findOne({ email });
    if (!utilisateurExistant) {
      return res.status(404).json({
        succes: false,
        message: "Aucun compte trouvé avec cet email",
      });
    }

    const resetToken = genererTokenReinitialisation();

    await ResetToken.deleteMany({ utilisateurId: utilisateurExistant._id });

    const tokenDocument = new ResetToken({
      token: resetToken,
      email: email,
      utilisateurId: utilisateurExistant._id,
    });

    await tokenDocument.save();

    const resetLink = `https://myappfood-backend.onrender.com/new_mdpo.html?token=${resetToken}`;

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

app.get("/api/reset-password/verify/:token", async (req, res) => {
  try {
    const { token } = req.params;

    const tokenData = await ResetToken.findOne({ token });

    if (!tokenData) {
      return res.status(400).json({
        valid: false,
        error: "INVALID_TOKEN",
        message: "Token invalide",
      });
    }

    const maintenant = new Date();
    const delaiExpiration = 15 * 60 * 1000;
    const tempsEcoule = maintenant - tokenData.createdAt;

    if (tempsEcoule > delaiExpiration) {
      await ResetToken.deleteOne({ token });
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

app.post("/api/reset-password/confirm", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        succes: false,
        message: "Token et nouveau mot de passe requis",
      });
    }

    const tokenData = await ResetToken.findOne({ token });

    if (!tokenData) {
      return res.status(400).json({
        succes: false,
        error: "INVALID_TOKEN",
        message: "Token invalide ou expire",
      });
    }

    const maintenant = new Date();
    const delaiExpiration = 15 * 60 * 1000;
    const tempsEcoule = maintenant - tokenData.createdAt;

    if (tempsEcoule > delaiExpiration) {
      await ResetToken.deleteOne({ token });
      return res.status(400).json({
        succes: false,
        error: "EXPIRED_TOKEN",
        message: "Token expire",
      });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({
        succes: false,
        message: "Le mot de passe doit contenir au moins 4 caracteres",
      });
    }

    const utilisateur = await Utilisateur.findById(tokenData.utilisateurId);
    if (!utilisateur) {
      return res.status(404).json({
        succes: false,
        message: "Utilisateur non trouve",
      });
    }

    utilisateur.motDePasse = newPassword;
    await utilisateur.save();

    console.log("Mot de passe reinitialise pour:", tokenData.email);

    await ResetToken.deleteOne({ token });

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

app.post("/api/chat", async (req, res) => {
  try {
    const { message, userLocation, currentPlaces } = req.body;

    console.log("Message reçu:", message);
    console.log("Localisation:", userLocation);
    console.log("Restaurants disponibles:", currentPlaces?.length || 0);

    if (!message || message.trim() === "") {
      return res.status(400).json({
        response: "Veuillez entrer un message",
        action: "none",
        targetId: null,
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Tu es Askbot, un assistant intelligent spécialisé dans la recherche de restaurants.
          
          FORMAT DE RÉPONSE OBLIGATOIRE en JSON :
          {
            "response": "Réponse textuelle friendly et utile en français",
            "action": "filter_restaurants" | "show_route" | "none",
            "targetId": null ou "id_etablissement"
          }

          RÈGLES D'ACTION :
          - "filter_restaurants" : si l'utilisateur demande des restaurants, resto, manger, cuisine
          - "show_route" : si l'utilisateur demande un itinéraire, chemin, route, directions
          - "none" : pour les salutations, remerciements, questions générales

          SOIS :
          - Naturel et amical en français
          - Concis et utile
          - Spécialisé dans la recherche de restaurants
          - Encourage à utiliser la localisation si besoin`,
        },
        {
          role: "user",
          content: `Message: ${message}`,
        },
      ],
      max_tokens: 250,
      temperature: 0.7,
    });

    const botResponse = completion.choices[0].message.content;
    console.log("Réponse OpenAI brute:", botResponse);

    try {
      const parsedResponse = JSON.parse(botResponse);
      res.json(parsedResponse);
    } catch (parseError) {
      console.log("Réponse non-JSON, utilisation du fallback");
      const lowerMessage = message.toLowerCase();
      let action = "none";
      let responseText = botResponse;

      if (
        lowerMessage.includes("restaurant") ||
        lowerMessage.includes("manger") ||
        lowerMessage.includes("resto")
      ) {
        action = "filter_restaurants";
      } else if (
        lowerMessage.includes("itinéraire") ||
        lowerMessage.includes("chemin") ||
        lowerMessage.includes("route")
      ) {
        action = "show_route";
      }

      res.json({
        response: responseText,
        action: action,
        targetId: null,
      });
    }
  } catch (error) {
    console.error("Erreur OpenAI:", error);

    res.status(500).json({
      response:
        "Désolé, je rencontre des difficultés techniques. Pouvez-vous réessayer ?",
      action: "none",
      targetId: null,
    });
  }
});

app.get("/api/test-openai", async (req, res) => {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: "Dis bonjour en français",
        },
      ],
      max_tokens: 50,
    });

    res.json({
      message: "OpenAI fonctionne!",
      response: completion.choices[0].message.content,
    });
  } catch (error) {
    res.status(500).json({
      error: "OpenAI erreur",
      details: error.message,
    });
  }
});

const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

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
      "POST /api/chat",
      "GET /api/test-openai",
    ],
  });
});

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

app.use(express.static(path.join(__dirname, "../")));

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

app.use((req, res) => {
  res.status(404).json({
    succes: false,
    message: "Route non trouvee: " + req.method + " " + req.originalUrl,
  });
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Port: " + PORT);

  console.log("GET  /api/test");
  console.log("GET  /api/health");
  console.log("GET  /api/routes-test");
  console.log("POST /api/auth/inscription");
  console.log("POST /api/auth/connexion");
  console.log("GET  /api/auth/profil");
  console.log("POST /api/reset-password/request");
  console.log("GET  /api/reset-password/verify/:token");
  console.log("POST /api/reset-password/confirm");
  console.log("POST /api/chat");
  console.log("GET  /api/test-openai");
});

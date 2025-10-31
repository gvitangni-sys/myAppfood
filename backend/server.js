const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
const OpenAI = require("openai");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Connexion MongoDB SIMPLIFIÉE
const connectDB = async () => {
  try {
    // Seulement se connecter si MONGODB_URI est configuré
    if (
      process.env.MONGODB_URI &&
      !process.env.MONGODB_URI.includes("localhost")
    ) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log("MongoDB connecté avec succès");
    } else {
      console.log("MongoDB non configuré - Mode démo activé");
      // Ne pas bloquer le serveur si MongoDB n'est pas disponible
    }
  } catch (erreur) {
    console.log("Mode démo activé - MongoDB non disponible");
  }
};

connectDB();

// Configuration OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Routes
const routesAuth = require("./routes/auth");
app.use("/api/auth", routesAuth);

// Servir les fichiers statiques du frontend
app.use(express.static(path.join(__dirname, "..")));

// ========== ROUTES API ==========

// Route API de base
app.get("/api", (req, res) => {
  res.json({
    message: "MyAppFood API est opérationnelle!",
    status: "online",
    version: "1.0",
  });
});

// Route santé
app.get("/api/sante", (req, res) => {
  res.json({
    statut: "OK",
    message: "MyAppFood API opérationnelle",
    mongodb:
      mongoose.connection.readyState === 1
        ? "Connectée"
        : "Non configuré - Mode démo",
    timestamp: new Date().toISOString(),
  });
});

// Route test
app.get("/api/test", (req, res) => {
  res.json({
    message: " Backend MyAppFood fonctionne!",
    status: "OK",
    timestamp: new Date().toISOString(),
  });
});

// Route chatbot OpenAI
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim() === "") {
      return res.status(400).json({
        response: "Veuillez entrer un message",
        action: "none",
        targetId: null,
      });
    }

    // Si OpenAI n'est pas configuré, réponse locale
    if (!process.env.OPENAI_API_KEY) {
      return res.json({
        response:
          "Je suis en mode démo. Je peux vous aider à trouver des restaurants près de vous!",
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
          - Encourage à utiliser la localisation si besoin

          EXEMPLES :
          User: "Montre les restaurants" → {"response": "Je cherche les restaurants près de vous...", "action": "filter_restaurants", "targetId": null}
          User: "Itinéraire vers le plus proche" → {"response": "Je calcule l'itinéraire...", "action": "show_route", "targetId": null}
          User: "Bonjour" → {"response": "Bonjour ! Je peux vous aider à trouver des restaurants 😊", "action": "none", "targetId": null}`,
        },
        {
          role: "user",
          content: `Message: ${message}`,
        },
      ],
      max_tokens: 250,
      temperature: 0.7,
    });

    const reponseBot = completion.choices[0].message.content;

    // Parser la réponse JSON
    try {
      const parsedResponse = JSON.parse(reponseBot);
      res.json(parsedResponse);
    } catch (parseError) {
      // Fallback si la réponse n'est pas du JSON valide
      console.log("Réponse non-JSON, utilisation du fallback");
      res.json({
        response: reponseBot,
        action: "none",
        targetId: null,
      });
    }
  } catch (erreur) {
    console.error("Erreur OpenAI:", erreur);
    res.json({
      response: "Service temporairement indisponible. Mode démo activé.",
      action: "none",
      targetId: null,
    });
  }
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
  console.log(`Frontend: http://localhost:${PORT}`);
  console.log(`API Auth: http://localhost:${PORT}/api/auth`);
  console.log(`Health: http://localhost:${PORT}/api/sante`);
});

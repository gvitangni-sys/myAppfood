const express = require("express");
const cors = require("cors");
const path = require("path");
const OpenAI = require("openai");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuration OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Servir les fichiers statiques du frontend (remonte d'un niveau depuis backend)
app.use(express.static(path.join(__dirname, "..")));

// Route API de base
app.get("/api", (req, res) => {
  res.json({ message: "Food Bot API is working!" });
});

// Route santé
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Food Bot API avec OpenAI opérationnel! ",
    timestamp: new Date().toISOString(),
  });
});

// Route chatbot OpenAI
app.post("/api/chat", async (req, res) => {
  try {
    const { message, userLocation, currentPlaces } = req.body;

    console.log(" Message reçu:", message);
    console.log(" Localisation:", userLocation);
    console.log(" Restaurants disponibles:", currentPlaces?.length || 0);

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

    const botResponse = completion.choices[0].message.content;
    console.log("🤖 Réponse OpenAI brute:", botResponse);

    // Parser la réponse JSON
    try {
      const parsedResponse = JSON.parse(botResponse);
      res.json(parsedResponse);
    } catch (parseError) {
      console.log("⚠️ Réponse non-JSON, utilisation du fallback");
      // Fallback intelligent
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
    console.error("❌ Erreur OpenAI:", error);

    res.status(500).json({
      response:
        "Désolé, je rencontre des difficultés techniques. Pouvez-vous réessayer ?",
      action: "none",
      targetId: null,
    });
  }
});

// Route de test OpenAI
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
      message: "OpenAI fonctionne! ",
      response: completion.choices[0].message.content,
    });
  } catch (error) {
    res.status(500).json({
      error: "OpenAI erreur",
      details: error.message,
    });
  }
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(` Server is running on http://localhost:${PORT}`);
  console.log(` Frontend: http://localhost:${PORT}`);
  console.log(` API: http://localhost:${PORT}/api`);
  console.log(` Chat API: http://localhost:${PORT}/api/chat`);
  console.log(` Health: http://localhost:${PORT}/api/health`);
  console.log(` Test OpenAI: http://localhost:${PORT}/api/test-openai`);
});

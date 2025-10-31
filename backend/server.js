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

// Connexion MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/myappfood",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    console.log("MongoDB connecté avec succès");
  } catch (erreur) {
    console.error("Erreur connexion MongoDB:", erreur);
    process.exit(1);
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

// Route API de base
app.get("/api", (req, res) => {
  res.json({ message: "MyAppFood API est opérationnelle!" });
});

// Route santé
app.get("/api/sante", (req, res) => {
  res.json({
    statut: "OK",
    message: "MyAppFood API avec authentification opérationnelle",
    timestamp: new Date().toISOString(),
    baseDeDonnees:
      mongoose.connection.readyState === 1 ? "Connectée" : "Déconnectée",
  });
});

// Route chatbot OpenAI (existant)
app.post("/api/chat", async (req, res) => {
  try {
    const { message, userLocation, currentPlaces } = req.body;

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

    const reponseBot = completion.choices[0].message.content;

    res.json({
      response: reponseBot,
      action: "none",
      targetId: null,
    });
  } catch (erreur) {
    console.error("Erreur OpenAI:", erreur);
    res.status(500).json({
      response: "Désolé, service temporairement indisponible.",
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

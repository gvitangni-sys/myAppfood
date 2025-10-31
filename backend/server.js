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

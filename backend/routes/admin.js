const express = require("express");
const { verifierAuth, verifierAdmin } = require("../middleware/auth");
const Utilisateur = require("../models/Utilisateur");

const router = express.Router();

router.get("/statistiques", verifierAuth, verifierAdmin, async (req, res) => {
  try {
    const totalUtilisateurs = await Utilisateur.countDocuments();

    const debutMois = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );
    const nouveauxUtilisateurs = await Utilisateur.countDocuments({
      dateInscription: { $gte: debutMois },
    });

    const vingtQuatreHeures = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const utilisateursActifs = await Utilisateur.countDocuments({
      derniereConnexion: { $gte: vingtQuatreHeures },
    });

    const debutSemaine = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const utilisateursSemaine = await Utilisateur.countDocuments({
      dateInscription: { $gte: debutSemaine },
    });

    const derniersUtilisateurs = await Utilisateur.find()
      .select("email dateInscription derniereConnexion role statut")
      .sort({ dateInscription: -1 })
      .limit(5)
      .lean();

    const statsParMois = await Utilisateur.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$dateInscription" },
            month: { $month: "$dateInscription" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      { $limit: 6 },
    ]);

    res.json({
      succes: true,
      data: {
        totalUtilisateurs,
        nouveauxUtilisateurs,
        utilisateursActifs,
        utilisateursSemaine,
        statsMensuelles: statsParMois,
        derniersUtilisateurs: derniersUtilisateurs.map((user) => ({
          email: user.email,
          dateInscription: user.dateInscription,
          derniereConnexion: user.derniereConnexion,
          role: user.role,
          statut:
            user.derniereConnexion >= vingtQuatreHeures ? "Actif" : "Inactif",
        })),
      },
    });
  } catch (erreur) {
    console.error("Erreur statistiques:", erreur);
    res.status(500).json({
      succes: false,
      message: "Erreur lors de la recuperation des statistiques",
    });
  }
});

router.get("/utilisateurs", verifierAuth, verifierAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const utilisateurs = await Utilisateur.find()
      .select("email dateInscription derniereConnexion role statut")
      .sort({ dateInscription: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Utilisateur.countDocuments();

    res.json({
      succes: true,
      data: {
        utilisateurs: utilisateurs.map((user) => ({
          ...user,
          statutConnexion:
            user.derniereConnexion &&
            new Date(user.derniereConnexion) >=
              new Date(Date.now() - 24 * 60 * 60 * 1000)
              ? "En ligne"
              : "Hors ligne",
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (erreur) {
    console.error("Erreur liste utilisateurs:", erreur);
    res.status(500).json({
      succes: false,
      message: "Erreur lors de la recuperation des utilisateurs",
    });
  }
});

module.exports = router;

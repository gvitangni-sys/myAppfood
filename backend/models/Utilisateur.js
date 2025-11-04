const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const utilisateurSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  motDePasse: {
    type: String,
    required: true,
    minlength: 4,
  },
  role: {
    type: String,
    enum: ["utilisateur", "admin"],
    default: "utilisateur",
  },
  dateInscription: {
    type: Date,
    default: Date.now,
  },
  derniereConnexion: {
    type: Date,
  },
  statut: {
    type: String,
    enum: ["actif", "inactif"],
    default: "actif",
  },
});

utilisateurSchema.pre("save", async function (next) {
  if (!this.isModified("motDePasse")) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.motDePasse = await bcrypt.hash(this.motDePasse, salt);
    next();
  } catch (erreur) {
    next(erreur);
  }
});

utilisateurSchema.methods.comparerMotDePasse = async function (motDePasse) {
  return await bcrypt.compare(motDePasse, this.motDePasse);
};

module.exports = mongoose.model("Utilisateur", utilisateurSchema);

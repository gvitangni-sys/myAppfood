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
    minlength: 6,
  },
});

// Hash du mot de passe avant sauvegarde
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

// Méthode pour comparer les mots de passe
utilisateurSchema.methods.comparerMotDePasse = async function (motDePasse) {
  return await bcrypt.compare(motDePasse, this.motDePasse);
};

module.exports = mongoose.model("Utilisateur", utilisateurSchema);

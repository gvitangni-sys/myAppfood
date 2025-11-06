const mongoose = require("mongoose");

const resetTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
  },
  utilisateurId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Utilisateur",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 900,
  },
});

resetTokenSchema.index({ createdAt: 1 }, { expireAfterSeconds: 900 });

module.exports = mongoose.model("ResetToken", resetTokenSchema);

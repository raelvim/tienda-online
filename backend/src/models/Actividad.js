const mongoose = require("mongoose");

const actividadSchema = new mongoose.Schema(
  {
    mensaje: { type: String, required: true },
    fecha: { type: String, required: true },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Actividad", actividadSchema);

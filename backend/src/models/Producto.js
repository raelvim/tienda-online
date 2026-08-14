const mongoose = require("mongoose");

const productoSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true },
    descripcion: { type: String, required: true },
    precio: { type: Number, required: true },
    formaEnvio: { type: String, default: "Envío estándar" },
    imagen: { type: String, default: "" },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Producto", productoSchema);

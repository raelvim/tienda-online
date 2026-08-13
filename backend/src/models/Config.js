const mongoose = require("mongoose");

const tramoSchema = new mongoose.Schema(
  { desde: Number, costo: Number },
  { _id: false },
);

// Documento único (_id: "general") con toda la configuración compartida de la tienda
const configSchema = new mongoose.Schema({
  _id: { type: String, default: "general" },
  tramosEnvio: {
    type: [tramoSchema],
    default: () => [{ desde: 1, costo: 100 }],
  },
  direccionLocal: { type: String, default: "" },
  moneda: {
    codigo: { type: String, default: "MXN" },
    simbolo: { type: String, default: "$" },
    locale: { type: String, default: "es-MX" },
  },
  adminPasswordHash: { type: String, required: true },
});

module.exports = mongoose.model("Config", configSchema);

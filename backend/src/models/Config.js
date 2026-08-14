const mongoose = require("mongoose");

const tramoEnvioSchema = new mongoose.Schema({
  desde: { type: Number, required: true },
  costo: { type: Number, required: true },
});

const configSchema = new mongoose.Schema(
  {
    _id: { type: String, default: "general" },
    adminPasswordHash: { type: String, required: true },

    // Configuración de envío
    tramosEnvio: {
      type: [tramoEnvioSchema],
      default: [{ desde: 1, costo: 100 }],
    },

    // Dirección del local para retiro
    direccionLocal: { type: String, default: "" },

    // Configuración de moneda
    moneda: {
      codigo: { type: String, default: "MXN" },
      simbolo: { type: String, default: "$" },
      locale: { type: String, default: "es-MX" },
    },

    // Carritos por usuario (usuarioId: array de {productoId, cantidad})
    carritos: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Favoritos por usuario (usuarioId: array de productoId)
    favoritos: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Configuración de entrega por usuario
    entrega: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Config", configSchema);

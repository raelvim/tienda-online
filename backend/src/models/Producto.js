const mongoose = require("mongoose");

const productoSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true },
    descripcion: { type: String, required: true },
    precio: { type: Number, required: true, min: 0 },
    formaEnvio: { type: String, default: "Envío estándar" },
    imagen: { type: String, default: "" },
  },
  { timestamps: { createdAt: "creado", updatedAt: false } },
);

productoSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  },
});

module.exports = mongoose.model("Producto", productoSchema);

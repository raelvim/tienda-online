const Actividad = require("../models/Actividad");

// Guarda un registro de actividad y conserva solo los últimos 50
async function registrarActividad(mensaje) {
  await Actividad.create({ mensaje });
  const total = await Actividad.countDocuments();
  if (total > 50) {
    const viejos = await Actividad.find()
      .sort({ fecha: 1 })
      .limit(total - 50);
    await Actividad.deleteMany({ _id: { $in: viejos.map((v) => v._id) } });
  }
}

module.exports = { registrarActividad };

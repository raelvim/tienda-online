const express = require("express");
const router = express.Router();
const { verificarToken } = require("../middleware/auth");
const Actividad = require("../models/Actividad");

// Obtener actividad (admin) - últimos 50 registros
router.get("/", verificarToken, async (req, res) => {
  try {
    const registros = await Actividad.find().sort({ fecha: -1 }).limit(50);
    res.json(registros);
  } catch (error) {
    console.error("Error al obtener actividad:", error);
    res.status(500).json({ error: "Error al obtener actividad" });
  }
});

// Crear registro de actividad (admin)
router.post("/", verificarToken, async (req, res) => {
  try {
    const { mensaje } = req.body;

    if (!mensaje) {
      return res.status(400).json({ error: "Se requiere un mensaje" });
    }

    const registro = new Actividad({
      mensaje,
      fecha: new Date().toISOString(),
    });

    await registro.save();

    // Mantener solo los últimos 50 registros
    const total = await Actividad.countDocuments();
    if (total > 50) {
      const antiguos = await Actividad.find()
        .sort({ fecha: 1 })
        .limit(total - 50);
      const ids = antiguos.map((a) => a._id);
      await Actividad.deleteMany({ _id: { $in: ids } });
    }

    res.status(201).json(registro);
  } catch (error) {
    console.error("Error al guardar actividad:", error);
    res.status(500).json({ error: "Error al guardar actividad" });
  }
});

module.exports = router;

const express = require("express");
const Actividad = require("../models/Actividad");
const { requiereAdmin } = require("../middleware/auth");

const router = express.Router();

// GET /api/actividad — últimos 50 registros de actividad (admin)
router.get("/", requiereAdmin, async (_req, res) => {
  try {
    const registros = await Actividad.find().sort({ fecha: -1 }).limit(50);
    res.json(registros);
  } catch (error) {
    res.status(500).json({ error: "Error del servidor" });
  }
});

module.exports = router;

const express = require("express");
const router = express.Router();
const { verificarToken } = require("../middleware/auth");
const Config = require("../models/Config");

// Obtener favoritos del usuario
router.get("/", verificarToken, async (req, res) => {
  try {
    const config = await Config.findById("general");
    if (!config) {
      return res.status(404).json({ error: "Configuración no encontrada" });
    }

    if (!config.favoritos) {
      config.favoritos = {};
    }
    if (!config.favoritos[req.usuarioId]) {
      config.favoritos[req.usuarioId] = [];
    }

    res.json(config.favoritos[req.usuarioId]);
  } catch (error) {
    console.error("Error al obtener favoritos:", error);
    res.status(500).json({ error: "Error al obtener favoritos" });
  }
});

// Alternar favorito (agregar/quitar)
router.post("/:productoId", verificarToken, async (req, res) => {
  try {
    const { productoId } = req.params;

    const config = await Config.findById("general");
    if (!config) {
      return res.status(404).json({ error: "Configuración no encontrada" });
    }

    if (!config.favoritos) {
      config.favoritos = {};
    }
    if (!config.favoritos[req.usuarioId]) {
      config.favoritos[req.usuarioId] = [];
    }

    const favoritos = config.favoritos[req.usuarioId];
    const index = favoritos.indexOf(productoId);
    let esFavorito = false;

    if (index === -1) {
      favoritos.push(productoId);
      esFavorito = true;
    } else {
      favoritos.splice(index, 1);
      esFavorito = false;
    }

    await config.save();
    res.json({ esFavorito, favoritos });
  } catch (error) {
    console.error("Error al alternar favorito:", error);
    res.status(500).json({ error: "Error al alternar favorito" });
  }
});

// Verificar si un producto es favorito
router.get("/:productoId/check", verificarToken, async (req, res) => {
  try {
    const { productoId } = req.params;

    const config = await Config.findById("general");
    if (!config) {
      return res.status(404).json({ error: "Configuración no encontrada" });
    }

    const favoritos = config.favoritos?.[req.usuarioId] || [];
    res.json({ esFavorito: favoritos.includes(productoId) });
  } catch (error) {
    console.error("Error al verificar favorito:", error);
    res.status(500).json({ error: "Error al verificar favorito" });
  }
});

module.exports = router;

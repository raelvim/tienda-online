const express = require("express");
const router = express.Router();
const { verificarToken } = require("../middleware/auth");
const Config = require("../models/Config");

// Obtener carrito del usuario
router.get("/", verificarToken, async (req, res) => {
  try {
    const config = await Config.findById("general");
    if (!config) {
      return res.status(404).json({ error: "Configuración no encontrada" });
    }

    // Si el usuario no tiene carrito, crear uno vacío
    if (!config.carritos) {
      config.carritos = {};
    }
    if (!config.carritos[req.usuarioId]) {
      config.carritos[req.usuarioId] = [];
    }

    res.json(config.carritos[req.usuarioId]);
  } catch (error) {
    console.error("Error al obtener carrito:", error);
    res.status(500).json({ error: "Error al obtener carrito" });
  }
});

// Agregar producto al carrito
router.post("/", verificarToken, async (req, res) => {
  try {
    const { productoId, cantidad = 1 } = req.body;

    if (!productoId) {
      return res.status(400).json({ error: "Se requiere productoId" });
    }

    const config = await Config.findById("general");
    if (!config) {
      return res.status(404).json({ error: "Configuración no encontrada" });
    }

    if (!config.carritos) {
      config.carritos = {};
    }
    if (!config.carritos[req.usuarioId]) {
      config.carritos[req.usuarioId] = [];
    }

    const carrito = config.carritos[req.usuarioId];
    const existente = carrito.find((item) => item.productoId === productoId);

    if (existente) {
      existente.cantidad += cantidad;
    } else {
      carrito.push({ productoId, cantidad });
    }

    await config.save();
    res.json(carrito);
  } catch (error) {
    console.error("Error al agregar al carrito:", error);
    res.status(500).json({ error: "Error al agregar al carrito" });
  }
});

// Actualizar cantidad de un producto en el carrito
router.put("/:productoId", verificarToken, async (req, res) => {
  try {
    const { productoId } = req.params;
    const { cantidad } = req.body;

    if (cantidad < 0) {
      return res
        .status(400)
        .json({ error: "La cantidad no puede ser negativa" });
    }

    const config = await Config.findById("general");
    if (!config) {
      return res.status(404).json({ error: "Configuración no encontrada" });
    }

    if (!config.carritos || !config.carritos[req.usuarioId]) {
      return res.status(404).json({ error: "Carrito no encontrado" });
    }

    const carrito = config.carritos[req.usuarioId];
    const item = carrito.find((i) => i.productoId === productoId);

    if (!item) {
      return res
        .status(404)
        .json({ error: "Producto no encontrado en el carrito" });
    }

    if (cantidad === 0) {
      config.carritos[req.usuarioId] = carrito.filter(
        (i) => i.productoId !== productoId,
      );
    } else {
      item.cantidad = cantidad;
    }

    await config.save();
    res.json(config.carritos[req.usuarioId]);
  } catch (error) {
    console.error("Error al actualizar carrito:", error);
    res.status(500).json({ error: "Error al actualizar carrito" });
  }
});

// Eliminar producto del carrito
router.delete("/:productoId", verificarToken, async (req, res) => {
  try {
    const { productoId } = req.params;

    const config = await Config.findById("general");
    if (!config) {
      return res.status(404).json({ error: "Configuración no encontrada" });
    }

    if (!config.carritos || !config.carritos[req.usuarioId]) {
      return res.status(404).json({ error: "Carrito no encontrado" });
    }

    config.carritos[req.usuarioId] = config.carritos[req.usuarioId].filter(
      (item) => item.productoId !== productoId,
    );

    await config.save();
    res.json(config.carritos[req.usuarioId]);
  } catch (error) {
    console.error("Error al eliminar del carrito:", error);
    res.status(500).json({ error: "Error al eliminar del carrito" });
  }
});

// Vaciar carrito
router.delete("/", verificarToken, async (req, res) => {
  try {
    const config = await Config.findById("general");
    if (!config) {
      return res.status(404).json({ error: "Configuración no encontrada" });
    }

    if (config.carritos) {
      config.carritos[req.usuarioId] = [];
    }

    await config.save();
    res.json([]);
  } catch (error) {
    console.error("Error al vaciar carrito:", error);
    res.status(500).json({ error: "Error al vaciar carrito" });
  }
});

module.exports = router;

const express = require("express");
const router = express.Router();
const { verificarToken, soloAdmin } = require("../middleware/auth");
const Config = require("../models/Config");

// Obtener toda la configuración (pública)
router.get("/", async (req, res) => {
  try {
    const config = await Config.findById("general");
    if (!config) {
      return res.status(404).json({ error: "Configuración no encontrada" });
    }

    res.json({
      tramosEnvio: config.tramosEnvio,
      direccionLocal: config.direccionLocal,
      moneda: config.moneda,
    });
  } catch (error) {
    res.status(500).json({ error: "Error al obtener configuración" });
  }
});

// Obtener configuración de envío
router.get("/envio", async (req, res) => {
  try {
    const config = await Config.findById("general");
    if (!config) {
      return res.status(404).json({ error: "Configuración no encontrada" });
    }
    res.json(config.tramosEnvio || [{ desde: 1, costo: 100 }]);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener configuración de envío" });
  }
});

// Guardar configuración de envío
router.put("/envio", verificarToken, soloAdmin, async (req, res) => {
  try {
    const { tramos } = req.body;

    if (!Array.isArray(tramos) || tramos.length === 0) {
      return res.status(400).json({ error: "Se requiere un array de tramos" });
    }

    const config = await Config.findById("general");
    if (!config) {
      return res.status(404).json({ error: "Configuración no encontrada" });
    }

    config.tramosEnvio = tramos.map((t) => ({
      desde: Number(t.desde),
      costo: Number(t.costo),
    }));

    await config.save();
    res.json(config.tramosEnvio);
  } catch (error) {
    res.status(500).json({ error: "Error al guardar configuración de envío" });
  }
});

// Obtener dirección local
router.get("/direccion-local", async (req, res) => {
  try {
    const config = await Config.findById("general");
    if (!config) {
      return res.status(404).json({ error: "Configuración no encontrada" });
    }
    res.json({ direccion: config.direccionLocal || "" });
  } catch (error) {
    res.status(500).json({ error: "Error al obtener dirección" });
  }
});

// Guardar dirección local
router.put("/direccion-local", verificarToken, soloAdmin, async (req, res) => {
  try {
    const { direccion } = req.body;

    const config = await Config.findById("general");
    if (!config) {
      return res.status(404).json({ error: "Configuración no encontrada" });
    }

    config.direccionLocal = direccion || "";
    await config.save();
    res.json({ direccion: config.direccionLocal });
  } catch (error) {
    res.status(500).json({ error: "Error al guardar dirección" });
  }
});

// Obtener configuración de moneda
router.get("/moneda", async (req, res) => {
  try {
    const config = await Config.findById("general");
    if (!config) {
      return res.status(404).json({ error: "Configuración no encontrada" });
    }
    res.json(config.moneda || { codigo: "MXN", simbolo: "$", locale: "es-MX" });
  } catch (error) {
    res.status(500).json({ error: "Error al obtener moneda" });
  }
});

// Guardar configuración de moneda
router.put("/moneda", verificarToken, soloAdmin, async (req, res) => {
  try {
    const { codigo, simbolo, locale } = req.body;

    const config = await Config.findById("general");
    if (!config) {
      return res.status(404).json({ error: "Configuración no encontrada" });
    }

    config.moneda = {
      codigo: codigo || "PERSONALIZADO",
      simbolo: simbolo || "$",
      locale: locale || "es-MX",
    };

    await config.save();
    res.json(config.moneda);
  } catch (error) {
    res.status(500).json({ error: "Error al guardar moneda" });
  }
});

// Obtener configuración de entrega del usuario
router.get("/entrega", verificarToken, async (req, res) => {
  try {
    const config = await Config.findById("general");
    if (!config) {
      return res.status(404).json({ error: "Configuración no encontrada" });
    }

    const entrega = config.entrega?.[req.usuarioId] || {
      metodo: "domicilio",
      direccion: "",
    };
    res.json(entrega);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error al obtener configuración de entrega" });
  }
});

// Guardar configuración de entrega del usuario
router.put("/entrega", verificarToken, async (req, res) => {
  try {
    const { metodo, direccion } = req.body;

    const config = await Config.findById("general");
    if (!config) {
      return res.status(404).json({ error: "Configuración no encontrada" });
    }

    if (!config.entrega) {
      config.entrega = {};
    }

    config.entrega[req.usuarioId] = {
      metodo: metodo === "retiro" ? "retiro" : "domicilio",
      direccion: direccion || "",
    };

    await config.save();
    res.json(config.entrega[req.usuarioId]);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error al guardar configuración de entrega" });
  }
});

module.exports = router;

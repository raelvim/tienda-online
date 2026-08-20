const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Config = require("../models/Config");
const { verificarToken } = require("../middleware/auth");

// Login
router.post("/login", async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: "Se requiere contraseña" });
    }

    const config = await Config.findById("general");
    if (!config) {
      return res.status(500).json({ error: "Configuración no encontrada" });
    }

    const valido = await bcrypt.compare(password, config.adminPasswordHash);
    if (!valido) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    const token = jwt.sign(
      { usuarioId: "admin", esAdmin: true },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({ token });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// Verificar contraseña (para cambio de contraseña)
router.post("/verify", async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: "Se requiere contraseña" });
    }

    const config = await Config.findById("general");
    if (!config) {
      return res.status(500).json({ error: "Configuración no encontrada" });
    }

    const valido = await bcrypt.compare(password, config.adminPasswordHash);
    if (!valido) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    res.json({ valido: true });
  } catch (error) {
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// Cambiar contraseña
router.post("/change-password", verificarToken, async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 4) {
      return res
        .status(400)
        .json({ error: "La contraseña debe tener al menos 4 caracteres" });
    }

    const config = await Config.findById("general");
    if (!config) {
      return res.status(500).json({ error: "Configuración no encontrada" });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    config.adminPasswordHash = hash;
    await config.save();

    res.json({ mensaje: "Contraseña actualizada correctamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al cambiar contraseña" });
  }
});

module.exports = router;

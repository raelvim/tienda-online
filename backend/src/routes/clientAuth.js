const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Usuario = require("../models/Usuario");

// Registro de cliente
router.post("/register", async (req, res) => {
  try {
    const { nombre, email, password } = req.body;

    if (!nombre || !email || !password) {
      return res
        .status(400)
        .json({ error: "Nombre, email y contraseña son requeridos" });
    }

    if (password.length < 4) {
      return res
        .status(400)
        .json({ error: "La contraseña debe tener al menos 4 caracteres" });
    }

    // Verificar si el email ya existe
    const existente = await Usuario.findOne({ email });
    if (existente) {
      return res.status(409).json({ error: "Este email ya está registrado" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const usuario = await Usuario.create({
      nombre,
      email,
      passwordHash,
    });

    const token = jwt.sign(
      { usuarioId: usuario._id.toString(), esAdmin: false },
      process.env.JWT_SECRET,
      { expiresIn: "30d" },
    );

    res.status(201).json({
      token,
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
      },
    });
  } catch (error) {
    console.error("Error en registro:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// Login de cliente
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email y contraseña son requeridos" });
    }

    const usuario = await Usuario.findOne({ email });
    if (!usuario) {
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }

    const valido = await bcrypt.compare(password, usuario.passwordHash);
    if (!valido) {
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }

    const token = jwt.sign(
      { usuarioId: usuario._id.toString(), esAdmin: false },
      process.env.JWT_SECRET,
      { expiresIn: "30d" },
    );

    res.json({
      token,
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
      },
    });
  } catch (error) {
    console.error("Error en login cliente:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

module.exports = router;

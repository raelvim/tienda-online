const express = require("express");
const router = express.Router();
const Producto = require("../models/Producto");
const { verificarToken } = require("../middleware/auth");

// Obtener todos los productos
router.get("/", async (req, res) => {
  try {
    const productos = await Producto.find().sort({ createdAt: -1 });
    res.json(productos);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener productos" });
  }
});

// Obtener un producto por ID
router.get("/:id", async (req, res) => {
  try {
    const producto = await Producto.findById(req.params.id);
    if (!producto) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    res.json(producto);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener producto" });
  }
});

// Crear producto (admin)
router.post("/", verificarToken, async (req, res) => {
  try {
    const { nombre, descripcion, precio, formaEnvio, imagen } = req.body;

    if (!nombre || !descripcion || precio === undefined) {
      return res.status(400).json({ error: "Faltan campos requeridos" });
    }

    const producto = new Producto({
      nombre,
      descripcion,
      precio: Number(precio),
      formaEnvio: formaEnvio || "Envío estándar",
      imagen: imagen || "",
    });

    await producto.save();
    res.status(201).json(producto);
  } catch (error) {
    res.status(500).json({ error: "Error al crear producto" });
  }
});

// Actualizar producto (admin)
router.put("/:id", verificarToken, async (req, res) => {
  try {
    const { nombre, descripcion, precio, formaEnvio, imagen } = req.body;

    const producto = await Producto.findById(req.params.id);
    if (!producto) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    if (nombre !== undefined) producto.nombre = nombre;
    if (descripcion !== undefined) producto.descripcion = descripcion;
    if (precio !== undefined) producto.precio = Number(precio);
    if (formaEnvio !== undefined) producto.formaEnvio = formaEnvio;
    if (imagen !== undefined) producto.imagen = imagen;

    await producto.save();
    res.json(producto);
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar producto" });
  }
});

// Eliminar producto (admin)
router.delete("/:id", verificarToken, async (req, res) => {
  try {
    const producto = await Producto.findByIdAndDelete(req.params.id);
    if (!producto) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    res.json({ mensaje: "Producto eliminado" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar producto" });
  }
});

module.exports = router;

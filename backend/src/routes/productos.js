const express = require("express");
const router = express.Router();
const Producto = require("../models/Producto");
const { verificarToken, soloAdmin } = require("../middleware/auth");
const { upload } = require("../utils/cloudinary");

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
router.post("/", verificarToken, soloAdmin, upload.single("imagen"), async (req, res) => {
  try {
    const { nombre, descripcion, precio, formaEnvio, imagen: imagenBase64 } = req.body;

    if (!nombre || !descripcion || precio === undefined) {
      return res.status(400).json({ error: "Faltan campos requeridos" });
    }

    // Si se subió archivo via multer, usar URL de Cloudinary
    // Si se envió base64 en body, usarlo como fallback
    let imagenUrl = "";
    if (req.file) {
      imagenUrl = req.file.path;
    } else if (imagenBase64) {
      imagenUrl = imagenBase64;
    }

    const producto = new Producto({
      nombre,
      descripcion,
      precio: Number(precio),
      formaEnvio: formaEnvio || "Envío estándar",
      imagen: imagenUrl,
    });

    await producto.save();
    res.status(201).json(producto);
  } catch (error) {
    res.status(500).json({ error: "Error al crear producto" });
  }
});

// Actualizar producto (admin)
router.put("/:id", verificarToken, soloAdmin, upload.single("imagen"), async (req, res) => {
  try {
    const { nombre, descripcion, precio, formaEnvio, imagen: imagenBase64 } = req.body;

    const producto = await Producto.findById(req.params.id);
    if (!producto) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    if (nombre !== undefined) producto.nombre = nombre;
    if (descripcion !== undefined) producto.descripcion = descripcion;
    if (precio !== undefined) producto.precio = Number(precio);
    if (formaEnvio !== undefined) producto.formaEnvio = formaEnvio;
    if (req.file) {
      producto.imagen = req.file.path;
    } else if (imagenBase64 !== undefined) {
      producto.imagen = imagenBase64;
    }

    await producto.save();
    res.json(producto);
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar producto" });
  }
});

// Eliminar producto (admin)
router.delete("/:id", verificarToken, soloAdmin, async (req, res) => {
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

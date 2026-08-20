require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const { conectarDB } = require("./db");
const Config = require("./models/Config");
const authRoutes = require("./routes/auth");
const clientAuthRoutes = require("./routes/clientAuth");
const productoRoutes = require("./routes/productos");
const configRoutes = require("./routes/config");
const actividadRoutes = require("./routes/actividad");
const carritoRoutes = require("./routes/carrito");
const favoritosRoutes = require("./routes/favoritos");

if (!process.env.JWT_SECRET) {
  console.error("❌ Falta JWT_SECRET en las variables de entorno");
  process.exit(1);
}

const app = express();

// CORS: origenes permitidos desde CORS_ORIGIN (separados por coma).
// Si no está definido, se permiten todos (útil para desarrollo local).
const origenes = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
app.use(cors(origenes.length ? { origin: origenes } : {}));

// Límite alto porque las imágenes se guardan como base64 en los productos
app.use(express.json({ limit: "10mb" }));

// Rutas de la API
app.use("/api/auth", authRoutes);
app.use("/api/client-auth", clientAuthRoutes);
app.use("/api/productos", productoRoutes);
app.use("/api/config", configRoutes);
app.use("/api/actividad", actividadRoutes);
app.use("/api/carrito", carritoRoutes);
app.use("/api/favoritos", favoritosRoutes);

// Ruta de salud para verificar que el servidor está arriba
app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use((_req, res) => res.status(404).json({ error: "Ruta no encontrada" }));

// Crea el documento de configuración la primera vez que arranca el servidor,
// usando ADMIN_PASSWORD como contraseña inicial de admin (ver .env.example)
async function inicializarConfig() {
  const existente = await Config.findById("general");
  if (existente) return;
  const adminPasswordHash = await bcrypt.hash(
    process.env.ADMIN_PASSWORD || "admin123",
    10,
  );
  await Config.create({ _id: "general", adminPasswordHash });
  console.log(
    "✅ Configuración inicial creada. Contraseña de admin: ADMIN_PASSWORD (definida en .env)",
  );
}

async function iniciar() {
  try {
    await conectarDB();
    await inicializarConfig();
    const puerto = process.env.PORT || 5000;
    app.listen(puerto, () => {
      console.log(
        `🚀 API de la tienda escuchando en http://localhost:${puerto}`,
      );
    });
  } catch (error) {
    console.error("❌ No se pudo iniciar el servidor:", error.message);
    process.exit(1);
  }
}

iniciar();

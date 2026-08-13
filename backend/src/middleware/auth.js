const jwt = require("jsonwebtoken");

function requiereAdmin(req, res, next) {
  const encabezado = req.headers.authorization || "";
  const token = encabezado.startsWith("Bearer ") ? encabezado.slice(7) : null;
  if (!token) return res.status(401).json({ error: "No autenticado" });
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Sesión inválida o expirada" });
  }
}

module.exports = { requiereAdmin };

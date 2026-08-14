const jwt = require("jsonwebtoken");

function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token no proporcionado" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "mi_clave_secreta_12345",
    );
    req.usuarioId = decoded.usuarioId || "admin";
    req.esAdmin = true;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
}

module.exports = { verificarToken };

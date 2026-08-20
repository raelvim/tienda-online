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
      process.env.JWT_SECRET,
    );
    req.usuarioId = decoded.usuarioId;
    req.esAdmin = decoded.esAdmin === true;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
}

function soloAdmin(req, res, next) {
  if (!req.esAdmin) {
    return res.status(403).json({ error: "Acceso solo para administradores" });
  }
  next();
}

module.exports = { verificarToken, soloAdmin };

const { buildModularUser } = require('../utils/authUtils');

// Middleware simplificado para validar token
exports.checkModularAuth = (req, res, next) => {
  const token = req.query.token;
  const expectedToken = process.env.ACCESS_TOKEN;

  // Validar token
  if (!token || token !== expectedToken) {
    return res.status(401).json({
      error: 'Token de acceso inválido o faltante',
      message: 'Se requiere un token válido'
    });
  }

  // Validar parámetros mínimos
  const { userId, userName, cooperativaId, cooperativaName } = req.query;

  if (!userId || !userName || !cooperativaId || !cooperativaName) {
    return res.status(400).json({
      error: 'Parámetros requeridos faltantes',
      message: 'Se requieren: userId, userName, cooperativaId, cooperativaName'
    });
  }

  // Crear objeto de usuario modular
  const modularUser = buildModularUser(req);

  // Agregar a la request
  req.modularUser = modularUser;
  req.user = modularUser;
  req.cooperativaName = cooperativaName;

  next();
};

// Middleware básico para autenticación
exports.checkAuth = (req, res, next) => {
  // Modo modular: validar solo token
  if (req.query.token) {
    return exports.checkModularAuth(req, res, next);
  }

  // Modo sesión: validar sesión
  if (req.session && req.session.user) {
    req.user = req.session.user;
    return next();
  }

  return res.status(401).json({
    error: 'No autorizado',
    message: 'Se requiere autenticación'
  });
};

// Middleware para verificar admin: solo validar isAdmin=true
exports.checkAdmin = (req, res, next) => {
  // Primero validar autenticación
  exports.checkAuth(req, res, () => {
    // Verificar isAdmin=true en query params
    if (req.query.isAdmin === 'true') {
      return next();
    }

    // Verificar isAdmin en el usuario
    if (req.user && req.user.isAdmin === true) {
      return next();
    }

    return res.status(403).json({
      error: 'Acceso denegado',
      message: 'Se requieren permisos de administrador'
    });
  });
};
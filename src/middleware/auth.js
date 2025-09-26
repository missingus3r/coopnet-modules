const { buildModularUser } = require('../utils/authUtils');

// Middleware para validar token de acceso modular
exports.checkModularAuth = (req, res, next) => {
  const token = req.query.token;
  const expectedToken = process.env.ACCESS_TOKEN;
  
  // Validar token
  if (!token || token !== expectedToken) {
    return res.status(401).json({ 
      error: 'Token de acceso inválido o faltante',
      message: 'Se requiere un token válido en el parámetro ?token=TOKEN'
    });
  }
  
  // Validar parámetros requeridos
  const { userId, userName, cooperativaId, cooperativaName } = req.query;
  
  if (!userId || !userName || !cooperativaId || !cooperativaName) {
    return res.status(400).json({
      error: 'Parámetros requeridos faltantes',
      message: 'Se requieren los parámetros: userId, userName, cooperativaId, cooperativaName',
      required: ['token', 'userId', 'userName', 'cooperativaId', 'cooperativaName'],
      provided: Object.keys(req.query)
    });
  }
  
  // Crear objeto de usuario modular
  const modularUser = buildModularUser(req);
  
  // Agregar a la request para uso posterior
  req.modularUser = modularUser;
  req.cooperativaName = cooperativaName;
  
  next();
};

// Middleware básico para autenticación (compatible con sistema original)
exports.checkAuth = (req, res, next) => {
  // Si estamos en modo modular, usar autenticación modular
  if (req.query.token) {
    return exports.checkModularAuth(req, res, next);
  }
  
  // Fallback a autenticación por sesión si existe
  if (req.session && req.session.user) {
    return next();
  }
  
  return res.status(401).json({ 
    error: 'No autorizado',
    message: 'Se requiere autenticación'
  });
};

// Middleware para verificar rol de administrador
exports.checkAdmin = (req, res, next) => {
  // Verificar autenticación primero
  exports.checkAuth(req, res, () => {
    // Obtener el usuario de la sesión o del contexto modular
    const user = req.session?.user || req.modularUser;
    
    if (!user) {
      return res.status(401).json({ 
        error: 'No autorizado',
        message: 'Usuario no encontrado'
      });
    }
    
    // Verificar si el usuario tiene rol de admin o superuser
    if (user.role === 'cooperativa-admin' || user.role === 'superuser') {
      return next();
    }
    
    return res.status(403).json({ 
      error: 'Acceso denegado',
      message: 'Se requieren permisos de administrador'
    });
  });
};
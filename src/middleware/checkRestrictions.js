// Middleware simplificado para verificar restricciones de votación
// En un sistema completo, esto podría verificar sanciones o restricciones específicas

exports.checkVotingRestriction = (req, res, next) => {
  // Por ahora, permitir acceso si el usuario está autenticado
  // En el futuro, aquí se pueden agregar verificaciones adicionales
  // como sanciones activas, restricciones por deudas, etc.
  
  const user = req.session?.user || req.modularUser;
  
  if (!user) {
    return res.status(401).json({ 
      error: 'No autorizado',
      message: 'Usuario no encontrado'
    });
  }
  
  // Aquí se podrían agregar verificaciones adicionales
  // Por ejemplo:
  // - Verificar si el usuario tiene sanciones activas
  // - Verificar si tiene restricciones por deudas
  // - Verificar otros criterios de elegibilidad
  
  // Por ahora, permitir el acceso
  next();
};
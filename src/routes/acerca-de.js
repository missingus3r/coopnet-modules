const express = require('express');
const router = express.Router();
const aboutController = require('../controllers/aboutController');

// Middleware for token validation - simplified for static content
const checkAboutAuth = (req, res, next) => {
  const token = req.query.token;
  const expectedToken = process.env.ACCESS_TOKEN;
  
  // Validate token
  if (!token || token !== expectedToken) {
    return res.status(401).json({ 
      error: 'Token de acceso inválido o faltante',
      message: 'Se requiere un token válido en el parámetro ?token=TOKEN'
    });
  }
  
  next();
};

// About page route - only requires token
router.get('/', checkAboutAuth, aboutController.getAbout);

module.exports = router;
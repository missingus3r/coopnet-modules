// Basic security middleware for the modular app

// Basic sanitization middleware
exports.sanitizeMiddleware = (req, res, next) => {
  // Basic sanitization to prevent NoSQL injection
  const sanitizeObject = (obj) => {
    if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach(key => {
        if (key.startsWith('$') || key.includes('.')) {
          delete obj[key];
        } else if (typeof obj[key] === 'object') {
          sanitizeObject(obj[key]);
        }
      });
    }
  };

  // Sanitize query parameters
  if (req.query) {
    sanitizeObject(req.query);
  }

  // Sanitize request body
  if (req.body) {
    sanitizeObject(req.body);
  }

  next();
};

// Basic security headers
exports.securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Allow iframe embedding from any origin for modular functionality
  res.removeHeader('X-Frame-Options');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Add CSP header to allow iframe embedding while maintaining security
  res.setHeader('Content-Security-Policy', "frame-ancestors *;");
  next();
};
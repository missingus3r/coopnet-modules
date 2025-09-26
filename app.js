require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const methodOverride = require('method-override');

// Import database connection
const connectDB = require('./src/config/db');

// Import middleware
const { sanitizeMiddleware, securityHeaders } = require('./src/middleware/sanitize');

// Import routes
const agendaRoutes = require('./src/routes/agenda');
const asistenciaRoutes = require('./src/routes/asistencia');
const acercaDeRoutes = require('./src/routes/acerca-de');
const votacionesRoutes = require('./src/routes/votaciones');
const comisionesRoutes = require('./src/routes/comisiones');
const newsRoutes = require('./src/routes/news');
const productsRoutes = require('./src/routes/products');
const storeRoutes = require('./src/routes/store');

// Initialize app
const app = express();

// Trust proxy for real IP detection
app.set('trust proxy', true);

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// Static files
app.use(express.static(path.join(__dirname, 'src/public')));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(methodOverride('_method'));

// Security middleware
app.use(securityHeaders);
app.use(sanitizeMiddleware);

// Connect to database
connectDB();

// Routes
app.use('/agenda', agendaRoutes);
app.use('/asistencia', asistenciaRoutes);
app.use('/acerca-de', acercaDeRoutes);
app.use('/news', newsRoutes);
app.use('/products', productsRoutes);
app.use('/store', storeRoutes);
app.use('/', votacionesRoutes);
app.use('/', comisionesRoutes);

// Root redirect
app.get('/', (req, res) => {
  res.json({
    message: 'Dashboard Modular',
    version: '1.0.0',
    endpoints: {
      agenda: '/agenda?token=TOKEN&userId=ID&userName=NAME&cooperativaId=COOP_ID&cooperativaName=COOP_NAME',
      asistencia: '/asistencia?token=TOKEN&userId=ID&userName=NAME&cooperativaId=COOP_ID&cooperativaName=COOP_NAME',
      news: '/news?token=TOKEN&userId=ID&userName=NAME&cooperativaId=COOP_ID&cooperativaName=COOP_NAME',
      products: '/products?token=TOKEN&userId=ID&userName=NAME&cooperativaId=COOP_ID&cooperativaName=COOP_NAME&isAdmin=true',
      store: '/store?token=TOKEN&userId=ID&userName=NAME&cooperativaId=COOP_ID&cooperativaName=COOP_NAME',
      votaciones: '/votaciones?token=TOKEN&userId=ID&userName=NAME&cooperativaId=COOP_ID&cooperativaName=COOP_NAME',
      comisiones: '/commissions?token=TOKEN&userId=ID&userName=NAME&cooperativaId=COOP_ID&cooperativaName=COOP_NAME',
      'acerca-de': '/acerca-de?token=TOKEN'
    },
    requiredParams: {
      token: 'Access token (configured in .env)',
      userId: 'User ID from database (not required for acerca-de)',
      userName: 'Display name for user (not required for acerca-de)',
      cooperativaId: 'Cooperativa ID from database (not required for acerca-de)',
      cooperativaName: 'Display name for cooperativa (not required for acerca-de)',
      isAdmin: 'Optional: "true" for admin access (default: false)'
    },
    examples: {
      agenda: '/agenda?token=ABC123_MODULAR_TOKEN&userId=507f1f77bcf86cd799439011&userName=Juan%20Pérez&cooperativaId=507f1f77bcf86cd799439012&cooperativaName=Mi%20Cooperativa&isAdmin=true',
      news: '/news?token=ABC123_MODULAR_TOKEN&userId=507f1f77bcf86cd799439011&userName=Juan%20Pérez&cooperativaId=507f1f77bcf86cd799439012&cooperativaName=Mi%20Cooperativa',
      products: '/products?token=ABC123_MODULAR_TOKEN&userId=507f1f77bcf86cd799439011&userName=Juan%20Pérez&cooperativaId=507f1f77bcf86cd799439012&cooperativaName=Mi%20Cooperativa&isAdmin=true',
      store: '/store?token=ABC123_MODULAR_TOKEN&userId=507f1f77bcf86cd799439011&userName=Juan%20Pérez&cooperativaId=507f1f77bcf86cd799439012&cooperativaName=Mi%20Cooperativa',
      votaciones: '/votaciones?token=ABC123_MODULAR_TOKEN&userId=507f1f77bcf86cd799439011&userName=Juan%20Pérez&cooperativaId=507f1f77bcf86cd799439012&cooperativaName=Mi%20Cooperativa',
      comisiones: '/commissions?token=ABC123_MODULAR_TOKEN&userId=507f1f77bcf86cd799439011&userName=Juan%20Pérez&cooperativaId=507f1f77bcf86cd799439012&cooperativaName=Mi%20Cooperativa',
      'acerca-de': '/acerca-de?token=ABC123_MODULAR_TOKEN'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint no encontrado',
    message: 'Verifica la URL y los parámetros requeridos',
    availableEndpoints: ['/agenda', '/asistencia', '/news', '/products', '/store', '/votaciones', '/commissions', '/acerca-de']
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo salió mal'
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Dashboard Modular running on port ${PORT}`);
  console.log(`📖 API Documentation: http://localhost:${PORT}/`);
  console.log(`🔐 Access Token: ${process.env.ACCESS_TOKEN}`);
});

module.exports = app;
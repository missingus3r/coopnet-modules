/**
 * Authorization Utilities for Modular Dashboard
 */

// Safely get user ID from session or modular params
function getUserId(req) {
  // First check modular params
  if (req.query.userId) {
    return req.query.userId;
  }
  
  // Fallback to session if available
  if (req.session && req.session.user) {
    return req.session.user._id || req.session.user.id || null;
  }
  
  return null;
}

// Get user's cooperativa ID safely
function getCooperativaId(req) {
  // First check modular params
  if (req.query.cooperativaId) {
    return req.query.cooperativaId;
  }
  
  // Fallback to session
  if (req.session && req.session.user) {
    return req.session.user.cooperativaId || null;
  }
  
  return null;
}

// Get user name from params
function getUserName(req) {
  return req.query.userName || 'Usuario';
}

// Get cooperativa name from params
function getCooperativaName(req) {
  return req.query.cooperativaName || 'Cooperativa';
}

// Check if user has admin privileges based on params or session
function isAdmin(req) {
  // In modular mode, we can pass admin status as a parameter
  if (req.query.isAdmin === 'true') {
    return true;
  }

  // Fallback to session
  if (req.session && req.session.user) {
    return req.session.user.isAdmin === true;
  }

  return false;
}

// Build modular user object from query parameters
function buildModularUser(req) {
  return {
    _id: getUserId(req),
    id: getUserId(req),
    firstName: req.query.userName ? req.query.userName.split(' ')[0] : 'Usuario',
    lastName: req.query.userName ? req.query.userName.split(' ').slice(1).join(' ') : '',
    cooperativaId: getCooperativaId(req),
    isAdmin: isAdmin(req),
    status: 'active'
  };
}

module.exports = {
  getUserId,
  getCooperativaId,
  getUserName,
  getCooperativaName,
  isAdmin,
  buildModularUser
};
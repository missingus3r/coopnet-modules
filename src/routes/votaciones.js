const express = require('express');
const router = express.Router();
const votacionController = require('../controllers/votacionController');
const { checkAuth, checkAdmin } = require('../middleware/auth');
const { checkVotingRestriction } = require('../middleware/checkRestrictions');

// List all votaciones (active and past)
router.get('/votaciones', checkAuth, checkVotingRestriction, votacionController.getVotaciones);

// Create new votación (admin only)
router.post('/votaciones', checkAuth, checkAdmin, votacionController.createVotacion);

// Vote on a votación (any authenticated user)
router.post('/votaciones/:id/vote', checkAuth, checkVotingRestriction, votacionController.vote);
// Get vote details (list of votes) for a finished votación
router.get('/votaciones/:id/detalles', checkAuth, checkVotingRestriction, votacionController.getDetails);
// Delete a votación (admin only)
router.delete('/votaciones/:id', checkAuth, checkAdmin, votacionController.deleteVotacion);
// Edit a votación (admin only)
router.put('/votaciones/:id', checkAuth, checkAdmin, votacionController.editVotacion);

module.exports = router;
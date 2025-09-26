const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { checkAuth } = require('../middleware/auth');

// All routes require authentication
router.use(checkAuth);

// Main agenda page
router.get('/', eventController.getEvents);

// Event management (admin only)
router.post('/events', eventController.createEvent);
router.get('/events/:id', eventController.getEventDetails);
router.put('/events/:id', eventController.updateEvent);
router.delete('/events/:id', eventController.deleteEvent);

module.exports = router;
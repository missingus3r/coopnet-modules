const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { checkAuth } = require('../middleware/auth');

// All routes require authentication
router.use(checkAuth);

// Main attendance page
router.get('/', attendanceController.getAttendancePage);

// GPS punch attendance
router.post('/punch', attendanceController.punchAttendance);

// Activity-specific attendance
router.post('/activity', attendanceController.punchActivityAttendance);

// Manual entries (admin only)
router.post('/entries', attendanceController.addEntry);

module.exports = router;
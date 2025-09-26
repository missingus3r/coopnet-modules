const { Attendance, Geofence, User, Event } = require('../models');
const { getUserId, getCooperativaId, isAdmin } = require('../utils/authUtils');
const { ensureCooperativaExists, ensureUserExists } = require('../utils/dbHelpers');
const { validateObjectId } = require('../utils/validation');
const mongoose = require('mongoose');

// Main attendance page
exports.getAttendancePage = async (req, res) => {
  try {
    const userId = getUserId(req);
    const cooperativaId = getCooperativaId(req);
    const userName = req.query.userName || 'Usuario';
    const cooperativaName = req.cooperativaName || req.query.cooperativaName || 'Cooperativa';
    const userIsAdmin = isAdmin(req);
    
    // Ensure cooperativa and user exist in database
    if (cooperativaId) {
      await ensureCooperativaExists(cooperativaId, cooperativaName);
      
      if (userId) {
        const userRole = userIsAdmin ? 'cooperativa-admin' : 'user';
        await ensureUserExists(userId, userName, cooperativaId, userRole);
      }
    }
    
    const user = req.modularUser || req.session?.user;

    if (userIsAdmin) {
      // Admin view - get all members and their attendance data
      let members = [];
      if (validateObjectId(cooperativaId)) {
        members = await User.find({
          cooperativaId: new mongoose.Types.ObjectId(cooperativaId),
          role: 'user' // Only regular users, exclude cooperativa-admin
        }).select('firstName lastName');
      }
      
      const memberIds = members.map(m => m._id);
      
      // Get manual entries
      let entries = await Attendance.find({ 
        origin: 'manual', 
        userId: { $in: memberIds } 
      })
      .sort({ entryTime: -1 })
      .populate('userId', 'firstName lastName');
      
      entries = entries.map(e => e.toObject());

      // Calculate statistics
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get today's total hours
      const todayManualEntries = await Attendance.find({
        origin: 'manual',
        userId: { $in: memberIds },
        entryTime: { $gte: today, $lt: tomorrow },
        exitTime: { $exists: true, $ne: null }
      });

      let todayTotalHours = 0;
      todayManualEntries.forEach(entry => {
        if (entry.exitTime) {
          const hours = (new Date(entry.exitTime) - new Date(entry.entryTime)) / (1000 * 60 * 60);
          todayTotalHours += hours;
        }
      });

      // Get GPS entries for today
      const todayGpsEntries = await Attendance.find({
        origin: 'gps',
        userId: { $in: memberIds },
        timestamp: { $gte: today, $lt: tomorrow },
        valid: true
      }).sort({ timestamp: 1 });

      // Calculate GPS hours
      const userGpsHours = {};
      todayGpsEntries.forEach(entry => {
        const userId = entry.userId.toString();
        if (!userGpsHours[userId]) {
          userGpsHours[userId] = [];
        }
        userGpsHours[userId].push(entry);
      });

      Object.values(userGpsHours).forEach(userEntries => {
        for (let i = 0; i < userEntries.length - 1; i += 2) {
          if (userEntries[i].type === 'IN' && userEntries[i + 1] && userEntries[i + 1].type === 'OUT') {
            const hours = (new Date(userEntries[i + 1].timestamp) - new Date(userEntries[i].timestamp)) / (1000 * 60 * 60);
            todayTotalHours += hours;
          }
        }
      });

      // Get events with location requirements
      const eventsWithLocation = await Event.find({
        cooperativaId,
        location: { $exists: true, $ne: '' },
        $or: [
          { requiresCheckIn: true },
          { requiresCheckOut: true }
        ],
        status: 'scheduled',
        startDate: { 
          $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      }).sort({ startDate: -1 });

      return res.render('attendance', {
        title: 'Asistencia',
        user,
        cooperativaName,
        isAdmin: userIsAdmin,
        members,
        entries,
        eventsWithLocation,
        todayTotalHours: Math.round(todayTotalHours * 10) / 10,
        avgHoursPerDay: 0, // Simplified for now
        query: req.query,
        isModular: true,
        darkMode: req.query.darkMode === 'true' // Add dark mode from URL parameter
      });

    } else {
      // Regular user view - show their own attendance
      const history = await Attendance.find({
        userId,
        origin: 'gps'
      }).sort({ timestamp: -1 }).limit(50);

      // Get geofence for this cooperativa
      let geofence = null;
      if (validateObjectId(cooperativaId)) {
        geofence = await Geofence.findOne({ cooperativaId: new mongoose.Types.ObjectId(cooperativaId) });
      }

      // Get current activities (events happening now or soon)
      const now = new Date();
      const in2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      
      let currentActivities = [];
      if (validateObjectId(cooperativaId)) {
        currentActivities = await Event.find({
          cooperativaId: new mongoose.Types.ObjectId(cooperativaId),
          startDate: { $lte: in2Hours },
          endDate: { $gte: now },
          $or: [
            { requiresCheckIn: true },
            { requiresCheckOut: true }
          ],
          status: 'scheduled'
        }).sort({ startDate: 1 });
      }

      // Determine next punch type
      const lastEntry = history[0];
      const nextType = (!lastEntry || lastEntry.type === 'OUT') ? 'IN' : 'OUT';

      return res.render('attendance', {
        title: 'Asistencia',
        user,
        cooperativaName,
        isAdmin: userIsAdmin,
        history: history.map(h => h.toObject()),
        darkMode: req.query.darkMode === 'true', // Add dark mode from URL parameter
        geofence: geofence?.toObject(),
        currentActivities: currentActivities.map(a => a.toObject()),
        nextType,
        query: req.query,
        isModular: true
      });
    }

  } catch (error) {
    console.error('Attendance page error:', error);
    res.status(500).json({ error: 'Error al cargar la página de asistencia' });
  }
};

// GPS punch attendance
exports.punchAttendance = async (req, res) => {
  try {
    const userId = getUserId(req);
    const cooperativaId = getCooperativaId(req);
    const { lat, lng } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Coordenadas requeridas' });
    }

    // Get last entry to determine next type
    const lastEntry = await Attendance.findOne({
      userId,
      origin: 'gps'
    }).sort({ timestamp: -1 });

    const type = (!lastEntry || lastEntry.type === 'OUT') ? 'IN' : 'OUT';

    // Check geofence if exists
    let geofence = null;
    if (validateObjectId(cooperativaId)) {
      geofence = await Geofence.findOne({ cooperativaId: new mongoose.Types.ObjectId(cooperativaId) });
    }
    let valid = true;

    if (geofence) {
      const distance = calculateDistance(lat, lng, geofence.lat, geofence.lng);
      valid = distance <= geofence.radius;
    }

    const attendance = new Attendance({
      userId,
      origin: 'gps',
      type,
      timestamp: new Date(),
      lat,
      lng,
      valid
    });

    await attendance.save();

    res.json({ 
      success: true, 
      type,
      valid,
      message: valid ? 'Marcación registrada correctamente' : 'Marcación fuera de zona permitida'
    });

  } catch (error) {
    console.error('Punch attendance error:', error);
    res.status(500).json({ error: 'Error al registrar asistencia' });
  }
};

// Activity-specific attendance
exports.punchActivityAttendance = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { activityId, type, lat, lng } = req.body;

    if (!activityId || !type || !lat || !lng) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    // Get the event
    const event = await Event.findById(activityId);
    if (!event) {
      return res.status(404).json({ error: 'Actividad no encontrada' });
    }

    // Check if the event requires this type of attendance
    if (type === 'checkin' && !event.requiresCheckIn) {
      return res.status(400).json({ error: 'Esta actividad no requiere entrada' });
    }
    if (type === 'checkout' && !event.requiresCheckOut) {
      return res.status(400).json({ error: 'Esta actividad no requiere salida' });
    }

    // Check geofence if enabled
    let valid = true;
    if (event.geofence && event.geofence.enabled) {
      const distance = calculateDistance(lat, lng, event.geofence.lat, event.geofence.lng);
      valid = distance <= event.geofence.radius;
    }

    const attendance = new Attendance({
      userId,
      eventId: activityId,
      origin: 'gps',
      type: type === 'checkin' ? 'IN' : 'OUT',
      timestamp: new Date(),
      lat,
      lng,
      valid
    });

    await attendance.save();

    res.json({ 
      success: true, 
      type,
      valid,
      message: valid ? 'Asistencia registrada correctamente' : 'Ubicación fuera del área permitida'
    });

  } catch (error) {
    console.error('Activity attendance error:', error);
    res.status(500).json({ error: 'Error al registrar asistencia de actividad' });
  }
};

// Add manual entry (admin only)
exports.addEntry = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const { userId, eventId, markType, markTime, observations } = req.body;

    if (!userId || !markType || !markTime) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const entry = new Attendance({
      userId,
      eventId: eventId || undefined,
      origin: 'manual',
      type: markType === 'checkin' ? 'IN' : 'OUT',
      timestamp: new Date(markTime),
      observations: observations || '',
      valid: true
    });

    await entry.save();

    res.json({ success: true, message: 'Entrada registrada correctamente' });

  } catch (error) {
    console.error('Add entry error:', error);
    res.status(500).json({ error: 'Error al agregar entrada' });
  }
};

// Helper function to calculate distance between two points
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
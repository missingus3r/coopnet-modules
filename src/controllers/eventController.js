const { Event, User } = require('../models');
const { getUserId, getCooperativaId, isAdmin } = require('../utils/authUtils');
const { ensureCooperativaExists, ensureUserExists } = require('../utils/dbHelpers');
const { validateObjectId } = require('../utils/validation');
const mongoose = require('mongoose');

// Get agenda/calendar
exports.getEvents = async (req, res) => {
  try {
    const userId = getUserId(req);
    const cooperativaId = getCooperativaId(req);
    const userName = req.query.userName || 'Usuario';
    const cooperativaName = req.cooperativaName || req.query.cooperativaName || 'Cooperativa';
    
    // Ensure cooperativa and user exist in database
    if (cooperativaId) {
      await ensureCooperativaExists(cooperativaId, cooperativaName);
      
      if (userId) {
        const userRole = isAdmin(req) ? 'cooperativa-admin' : 'user';
        await ensureUserExists(userId, userName, cooperativaId, userRole);
      }
    }
    
    const user = req.modularUser || req.session?.user;
    
    // Determine view type (month, week, day)
    const viewType = req.query.view || 'month';
    
    // Calculate date range based on view type
    const today = new Date();
    let startDate, endDate;
    
    if (viewType === 'day') {
      startDate = new Date(today.setHours(0, 0, 0, 0));
      endDate = new Date(today.setHours(23, 59, 59, 999));
    } else if (viewType === 'week') {
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      startDate = new Date(today.setDate(diff));
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
    }
    
    // Get events for the cooperativa
    let events = [];
    let members = [];
    
    if (validateObjectId(cooperativaId)) {
      const cooperativaQuery = new mongoose.Types.ObjectId(cooperativaId);
      
      events = await Event.find({
        cooperativaId: cooperativaQuery,
        $and: [
          {
            $or: [
              { startDate: { $gte: startDate, $lte: endDate } },
              { endDate: { $gte: startDate, $lte: endDate } }
            ]
          },
          {
            $or: [
              { isPublic: true },
              { attendees: userId },
              { createdBy: userId },
              { invitedMembers: userId }
            ]
          }
        ]
      }).sort({ startDate: 1 });
      
      // Get members for admin functions
      members = await User.find({
        cooperativaId: cooperativaQuery,
        role: { $ne: 'cooperativa-admin' },
        status: { $in: ['active', 'pending'] }
      }).select('firstName lastName memberNumber').sort({ firstName: 1, lastName: 1 });
    }
    
    res.render('agenda', {
      title: 'Agenda',
      user,
      cooperativaName,
      events,
      members,
      viewType,
      startDate,
      endDate,
      canCreateEvents: isAdmin(req),
      query: req.query, // Pass query params to maintain URL state
      isModular: true,
      darkMode: req.query.darkMode === 'true' // Add dark mode from URL parameter
    });
  } catch (error) {
    console.error('Calendar error:', error);
    res.status(500).json({ error: 'Error al cargar los eventos' });
  }
};

// Create new event (admin only)
exports.createEvent = async (req, res) => {
  try {
    const userId = getUserId(req);
    const cooperativaId = getCooperativaId(req);
    
    // Check if user can create events
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'No tienes permisos para crear eventos' });
    }
    
    // Basic event data validation
    const { title, description, location, startDate, endDate } = req.body;
    
    if (!title || !startDate || !endDate) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }
    
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);
    
    if (isNaN(startDateTime.valueOf()) || isNaN(endDateTime.valueOf())) {
      return res.status(400).json({ error: 'Fecha u hora inválida' });
    }
    
    // Validate cooperativaId before creating event
    if (!validateObjectId(cooperativaId)) {
      return res.status(400).json({ error: 'ID de cooperativa inválido' });
    }
    
    const eventData = {
      title,
      description: description || '',
      location: location || '',
      cooperativaId,
      startDate: startDateTime,
      endDate: endDateTime,
      createdBy: userId,
      color: req.body.color || '#1976D2',
      eventType: req.body.eventType || 'meeting',
      category: req.body.category || 'general',
      isPublic: req.body.isPublic !== false,
      requiresCheckIn: req.body.requiresCheckIn || false,
      requiresCheckOut: req.body.requiresCheckOut || false,
      hasCost: req.body.hasCost || false,
      cost: req.body.cost || 0
    };
    
    // Handle geofence if attendance tracking is enabled
    if (eventData.requiresCheckIn || eventData.requiresCheckOut) {
      const lat = parseFloat(req.body.geofenceLat);
      const lng = parseFloat(req.body.geofenceLng);
      const radius = parseInt(req.body.geofenceRadius) || 100;
      
      if (!isNaN(lat) && !isNaN(lng)) {
        eventData.geofence = {
          enabled: true,
          lat,
          lng,
          radius
        };
      }
    }
    
    const event = new Event(eventData);
    await event.save();
    
    res.json({ success: true, event });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Error al crear el evento' });
  }
};

// Get event details
exports.getEventDetails = async (req, res) => {
  try {
    const eventId = req.params.id;
    const cooperativaId = getCooperativaId(req);
    
    if (!validateObjectId(eventId) || !validateObjectId(cooperativaId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    const event = await Event.findOne({
      _id: eventId,
      cooperativaId
    }).populate('createdBy', 'firstName lastName')
      .populate('attendees.userId', 'firstName lastName');
    
    if (!event) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    
    res.json({ success: true, event });
  } catch (error) {
    console.error('Error getting event details:', error);
    res.status(500).json({ error: 'Error al obtener detalles del evento' });
  }
};

// Update event (admin only)
exports.updateEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const cooperativaId = getCooperativaId(req);
    
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'No tienes permisos para editar eventos' });
    }
    
    if (!validateObjectId(eventId) || !validateObjectId(cooperativaId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    const event = await Event.findOne({
      _id: eventId,
      cooperativaId
    });
    
    if (!event) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    
    // Update fields
    const allowedFields = [
      'title', 'description', 'location', 'startDate', 'endDate',
      'color', 'eventType', 'category', 'isPublic', 'requiresCheckIn',
      'requiresCheckOut', 'hasCost', 'cost'
    ];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        event[field] = req.body[field];
      }
    });
    
    await event.save();
    
    res.json({ success: true, event });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Error al actualizar el evento' });
  }
};

// Delete event (admin only)
exports.deleteEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const cooperativaId = getCooperativaId(req);
    
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'No tienes permisos para eliminar eventos' });
    }
    
    if (!validateObjectId(eventId) || !validateObjectId(cooperativaId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    const event = await Event.findOneAndDelete({
      _id: eventId,
      cooperativaId
    });
    
    if (!event) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    
    res.json({ success: true, message: 'Evento eliminado correctamente' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Error al eliminar el evento' });
  }
};
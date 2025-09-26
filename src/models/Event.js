const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  location: {
    type: String,
    trim: true
  },
  cooperativaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cooperativa',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  isFullDay: {
    type: Boolean,
    default: false
  },
  eventType: {
    type: String,
    enum: ['meeting', 'workshop', 'assembly', 'workday', 'social', 'other'],
    default: 'meeting'
  },
  category: {
    type: String,
    enum: ['general', 'tecnica', 'administrativa', 'social', 'formativa', 'obra'],
    default: 'general'
  },
  attendees: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    confirmed: {
      type: Boolean,
      default: false
    },
    checkInTime: Date,
    notes: String
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  invitedMembers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  status: {
    type: String,
    enum: ['scheduled', 'cancelled', 'completed', 'postponed'],
    default: 'scheduled'
  },
  requiresCheckIn: {
    type: Boolean,
    default: false
  },
  requiresCheckOut: {
    type: Boolean,
    default: false
  },
  geofence: {
    enabled: {
      type: Boolean,
      default: false
    },
    lat: {
      type: Number,
      required: function() { return this.geofence && this.geofence.enabled; }
    },
    lng: {
      type: Number,
      required: function() { return this.geofence && this.geofence.enabled; }
    },
    radius: {
      type: Number,
      default: 100
    }
  },
  hasCost: {
    type: Boolean,
    default: false
  },
  cost: {
    type: Number,
    default: 0,
    min: 0
  },
  color: {
    type: String,
    default: '#1976D2'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Event', EventSchema);
const mongoose = require('mongoose');

const CooperativaSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  logo: {
    type: String,
    default: '/images/default-coop-logo.png'
  },
  color: {
    type: String,
    default: '#3700B3'
  },
  location: {
    city: {
      type: String,
      required: false,
      trim: true
    },
    department: {
      type: String,
      required: false,
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  foundedDate: {
    type: Date
  },
  totalMembers: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pre-obra', 'obra', 'habitacion'],
    default: 'pre-obra'
  },
  administrators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  contactEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  contactPhone: {
    type: String,
    trim: true
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

module.exports = mongoose.model('Cooperativa', CooperativaSchema);
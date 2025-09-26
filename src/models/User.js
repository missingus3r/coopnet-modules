const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  email: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true
  },
  role: {
    type: String,
    enum: ['user', 'comision-fomento', 'cooperativa-admin', 'superuser'],
    default: 'user'
  },
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'pending'
  },
  document: {
    type: String,
    trim: true,
    sparse: true
  },
  dateOfBirth: {
    type: Date
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  memberType: {
    type: String,
    enum: ['socio', 'adherente', 'aspirante', 'otros'],
    default: 'otros'
  },
  memberNumber: {
    type: String,
    trim: true,
    sparse: true
  },
  cooperativaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cooperativa',
    required: function() {
      return this.role !== 'superuser';
    }
  },
  lastLogin: {
    type: Date
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

module.exports = mongoose.model('User', UserSchema);
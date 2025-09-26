const mongoose = require('mongoose');
const { Schema } = mongoose;

const AttendanceSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  eventId: { type: Schema.Types.ObjectId, ref: 'Event' },
  origin: { type: String, enum: ['gps', 'manual'], default: 'gps' },
  type: { type: String, enum: ['IN', 'OUT'], required: function() { return this.origin === 'gps'; } },
  timestamp: { type: Date, default: Date.now },
  lat: { type: Number, required: function() { return this.origin === 'gps'; } },
  lng: { type: Number, required: function() { return this.origin === 'gps'; } },
  valid: { type: Boolean, default: false },
  entryTime: { type: Date, required: function() { return this.origin === 'manual'; } },
  exitTime: { type: Date },
  observations: { type: String, trim: true }
});

module.exports = mongoose.model('Attendance', AttendanceSchema);
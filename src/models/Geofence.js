const mongoose = require('mongoose');
const { Schema } = mongoose;

const GeofenceSchema = new Schema({
  cooperativaId: { type: Schema.Types.ObjectId, ref: 'Cooperativa', required: true, unique: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  radius: { type: Number, required: true } // in meters
}, { timestamps: true });

module.exports = mongoose.model('Geofence', GeofenceSchema);
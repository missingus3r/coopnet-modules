const mongoose = require('mongoose');
const { Schema } = mongoose;

// Comisión interna de la cooperativa
const CommissionSchema = new Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  stage: { type: String, enum: ['obra','permanentes','convivencia'], required: true },
  cooperativaId: { type: Schema.Types.ObjectId, ref: 'Cooperativa', required: true },
  members: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['titular','suplente'], required: true },
    detail: { type: String, trim: true } // e.g., "Presidente", "Secretario", "Tesorero"
  }],
  // Soft delete flag
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

// Create compound unique index to prevent duplicate commission names within the same cooperativa
// Only applies to non-deleted commissions
CommissionSchema.index(
  { name: 1, cooperativaId: 1 },
  { 
    unique: true,
    partialFilterExpression: { isDeleted: false },
    name: 'unique_commission_name_per_cooperativa'
  }
);

module.exports = mongoose.model('Commission', CommissionSchema);
const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  hasTypes: {
    type: Boolean,
    default: false
  },
  types: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  costPrice: {
    type: Number,
    min: 0
  },
  image: {
    type: String,
    trim: true
  },
  productReference: {
    type: String,
    unique: true,
    trim: true
  },
  images: [{
    url: String,
    alt: String,
    isMain: { type: Boolean, default: false }
  }],
  stock: {
    type: Number,
    default: 0,
    min: 0
  },
  units: {
    type: String,
    enum: ['unidad', 'kg', 'litro', 'm2', 'paquete', 'otro'],
    default: 'unidad'
  },
  category: {
    type: String,
    enum: ['materiales', 'alimentos', 'herramientas', 'servicios', 'otros'],
    default: 'otros'
  },
  supplier: {
    name: String,
    contact: String,
    phone: String,
    email: String
  },
  deadlineDate: {
    type: Date,
    required: true
  },
  deliveryDate: {
    type: Date
  },
  minimumOrdersRequired: {
    type: Number,
    default: 0
  },
  cooperativaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cooperativa',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  specifications: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'completed', 'pending'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  // Soft delete flag
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Product', ProductSchema);
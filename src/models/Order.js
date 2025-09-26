const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  cooperativaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cooperativa',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  // For products with types
  typeQuantities: [{
    typeName: {
      type: String,
      required: true
    },
    typePrice: {
      type: Number,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  totalPrice: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'cancelled', 'delivered', 'processing', 'returned'],
    default: 'pending'
  },
  orderDate: {
    type: Date,
    default: Date.now
  },
  paymentDate: {
    type: Date
  },
  deliveryDate: {
    type: Date
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'transfer', 'debit', 'credit', 'other'],
    default: 'cash'
  },
  paymentReference: {
    type: String,
    trim: true
  },
  trackingCode: {
    type: String,
    trim: true
  },
  deliveryAddress: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: { type: String, default: 'Uruguay' }
  },
  deliveryInstructions: {
    type: String,
    trim: true
  },
  contactPhone: {
    type: String,
    trim: true
  },
  returnedItems: {
    quantity: { type: Number, default: 0 },
    reason: String,
    returnDate: Date
  },
  notes: {
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
  },
  // Soft delete flag
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', OrderSchema);
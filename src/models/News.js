const mongoose = require('mongoose');

const NewsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  excerpt: {
    type: String,
    trim: true,
    maxlength: 300
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  cooperativaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cooperativa',
    required: function() {
      return !this.isGlobal;
    }
  },
  // For superadmin news
  isGlobal: {
    type: Boolean,
    default: false
  },
  targetCooperativas: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cooperativa'
  }],
  createdBy: {
    type: String,
    enum: ['admin', 'superadmin'],
    default: 'admin'
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  publishedAt: {
    type: Date
  },
  featuredImage: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  likes: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    likedAt: {
      type: Date,
      default: Date.now
    }
  }],
  views: {
    type: Number,
    default: 0
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Virtual for like count
NewsSchema.virtual('likeCount').get(function() {
  return this.likes ? this.likes.length : 0;
});

// Virtual for excerpt generation if not provided
NewsSchema.virtual('autoExcerpt').get(function() {
  if (this.excerpt) return this.excerpt;
  const textContent = this.content.replace(/<[^>]*>/g, ''); // Remove HTML tags
  return textContent.length > 200 ? textContent.substring(0, 200) + '...' : textContent;
});

// Set publishedAt when status changes to published
NewsSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

// Ensure virtuals are included in JSON output
NewsSchema.set('toJSON', { virtuals: true });
NewsSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('News', NewsSchema);
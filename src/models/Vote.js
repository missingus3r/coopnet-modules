const mongoose = require('mongoose');

const VoteSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  proposer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, default: null },
  cooperativa: { type: mongoose.Schema.Types.ObjectId, ref: 'Cooperativa', required: true },
  details: { type: String, default: '' },
  duration: { type: Number, required: true }, // duration in minutes
  createdAt: { type: Date, default: Date.now },
  votes: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    option: { type: String, enum: ['Sí','No','Abstención'], required: true },
    votedAt: { type: Date, default: Date.now },
    // If this vote is by proxy, representedBy holds the delegating user's _id
    representedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  }]
});

// Virtual property to check if vote is active
VoteSchema.virtual('isActive').get(function() {
  const expire = new Date(this.createdAt.getTime() + this.duration * 60000);
  return Date.now() < expire.getTime();
});

// Count votes per option
VoteSchema.methods.getCounts = function() {
  const counts = { Sí: 0, No: 0, Abstención: 0 };
  this.votes.forEach(v => {
    if (counts[v.option] != null) counts[v.option]++;
  });
  return counts;
};

module.exports = mongoose.model('Vote', VoteSchema);
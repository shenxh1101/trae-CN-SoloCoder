const mongoose = require('mongoose');

const muteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  username: {
    type: String,
    required: true
  },
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    index: true
  },
  mutedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mutedByUsername: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['temporary', 'permanent', 'global'],
    required: true,
    default: 'temporary'
  },
  duration: {
    type: Number,
    description: 'Mute duration in minutes, null for permanent'
  },
  reason: {
    type: String,
    trim: true,
    maxlength: 500
  },
  expiresAt: {
    type: Date,
    index: { expires: 0 }
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  unmutedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  unmutedAt: Date
}, {
  timestamps: true
});

muteSchema.index({ userId: 1, isActive: 1 });
muteSchema.index({ roomId: 1, isActive: 1 });
muteSchema.index({ userId: 1, roomId: 1, isActive: 1 });

muteSchema.statics.isUserMuted = async function(userId, roomId) {
  const now = new Date();
  
  const globalMute = await this.findOne({
    userId,
    type: 'global',
    isActive: true,
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: now } }
    ]
  });
  
  if (globalMute) {
    return globalMute;
  }
  
  const roomMute = await this.findOne({
    userId,
    roomId,
    isActive: true,
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: now } }
    ]
  });
  
  return roomMute;
};

muteSchema.methods.toJSON = function() {
  const mute = this.toObject();
  delete mute.__v;
  return mute;
};

module.exports = mongoose.model('Mute', muteSchema);

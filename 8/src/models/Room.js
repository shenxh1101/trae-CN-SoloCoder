const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  description: {
    type: String,
    trim: true,
    maxlength: 200
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  password: {
    type: String,
    default: null
  },
  maxUsers: {
    type: Number,
    default: 100
  },
  onlineUsers: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String,
    nickname: String,
    socketId: String,
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  messageCount: {
    type: Number,
    default: 0
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

roomSchema.methods.toJSON = function() {
  const room = this.toObject();
  delete room.password;
  delete room.__v;
  return room;
};

roomSchema.index({ name: 1 });
roomSchema.index({ createdBy: 1 });
roomSchema.index({ lastActivity: -1 });

module.exports = mongoose.model('Room', roomSchema);

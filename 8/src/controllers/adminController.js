const User = require('../models/User');
const Room = require('../models/Room');
const Mute = require('../models/Mute');
const Message = require('../models/Message');

async function getUsers(req, res) {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (page - 1) * limit;
    
    const query = {};
    if (search) {
      query.username = { $regex: search, $options: 'i' };
    }
    
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-password -__v');
    
    const total = await User.countDocuments(query);
    
    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getUser(req, res) {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('-password -__v');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const activeMutes = await Mute.find({
      userId,
      isActive: true
    }).populate('roomId', 'name');
    
    res.json({
      user,
      activeMutes
    });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function kickUser(req, res) {
  try {
    const { roomId, userId, reason } = req.body;
    const adminUser = req.user;
    
    if (!roomId || !userId) {
      return res.status(400).json({ error: 'Room ID and User ID are required' });
    }
    
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const targetUserIndex = room.onlineUsers.findIndex(
      u => u.userId.toString() === userId.toString()
    );
    
    let wasInRoom = false;
    if (targetUserIndex !== -1) {
      room.onlineUsers.splice(targetUserIndex, 1);
      await room.save();
      wasInRoom = true;
    }
    
    const systemMessage = new Message({
      roomId,
      userId: adminUser.userId,
      username: adminUser.username,
      content: `${targetUser.username} was kicked from the room by admin. Reason: ${reason || 'No reason provided'}`,
      type: 'system'
    });
    await systemMessage.save();
    
    let io;
    try {
      io = require('../socket').getIO();
    } catch (e) {
      io = null;
    }
    
    if (io) {
      io.to(roomId).emit('newMessage', { message: systemMessage.toJSON() });
      io.to(roomId).emit('userKicked', {
        roomId,
        user: {
          userId,
          username: targetUser.username
        },
        reason: reason || 'Kicked by admin',
        onlineUsers: room.onlineUsers
      });
    }
    
    res.json({ 
      message: 'User kicked successfully',
      wasInRoom,
      user: {
        userId,
        username: targetUser.username
      }
    });
  } catch (err) {
    console.error('Kick user error:', err);
    res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
}

async function muteUser(req, res) {
  try {
    const { roomId, userId, type, duration, reason } = req.body;
    const adminUser = req.user;
    
    if (!userId || !type) {
      return res.status(400).json({ error: 'User ID and mute type are required' });
    }
    
    if (!['temporary', 'permanent', 'global'].includes(type)) {
      return res.status(400).json({ error: 'Invalid mute type' });
    }
    
    if (type === 'temporary' && (!duration || duration <= 0)) {
      return res.status(400).json({ error: 'Duration is required for temporary mute' });
    }
    
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const existingMute = await Mute.findOne({
      userId,
      roomId: type === 'global' ? null : roomId,
      isActive: true
    });
    
    if (existingMute) {
      existingMute.isActive = false;
      existingMute.unmutedBy = adminUser.userId;
      existingMute.unmutedAt = new Date();
      await existingMute.save();
    }
    
    let expiresAt = null;
    if (type === 'temporary') {
      expiresAt = new Date(Date.now() + duration * 60 * 1000);
    }
    
    const mute = new Mute({
      userId,
      username: targetUser.username,
      roomId: type === 'global' ? null : roomId,
      mutedBy: adminUser.userId,
      mutedByUsername: adminUser.username,
      type,
      duration: type === 'temporary' ? duration : null,
      reason: reason || '',
      expiresAt
    });
    
    await mute.save();
    
    if (roomId) {
      const room = await Room.findById(roomId);
      if (room) {
        const durationText = type === 'permanent' 
          ? 'permanently' 
          : type === 'global'
            ? 'globally permanently'
            : `for ${duration} minutes`;
        
        const systemMessage = new Message({
          roomId,
          userId: adminUser.userId,
          username: adminUser.username,
          content: `${targetUser.username} was muted ${durationText}. Reason: ${reason || 'No reason provided'}`,
          type: 'system'
        });
        await systemMessage.save();
        
        const io = require('../socket').getIO();
        io.to(roomId).emit('newMessage', { message: systemMessage.toJSON() });
        io.to(roomId).emit('userMuted', { mute: mute.toJSON(), roomId });
      }
    }
    
    res.json({
      message: 'User muted successfully',
      mute: mute.toJSON()
    });
  } catch (err) {
    console.error('Mute user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function unmuteUser(req, res) {
  try {
    const { roomId, userId } = req.body;
    const adminUser = req.user;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const query = { userId, isActive: true };
    if (roomId) {
      query.roomId = roomId;
    }
    
    const mute = await Mute.findOne(query);
    if (!mute) {
      return res.status(404).json({ error: 'Active mute not found for this user' });
    }
    
    mute.isActive = false;
    mute.unmutedBy = adminUser.userId;
    mute.unmutedAt = new Date();
    await mute.save();
    
    if (roomId) {
      const targetUser = await User.findById(userId);
      const systemMessage = new Message({
        roomId,
        userId: adminUser.userId,
        username: adminUser.username,
        content: `${targetUser?.username || 'User'} was unmuted by admin`,
        type: 'system'
      });
      await systemMessage.save();
      
      const io = require('../socket').getIO();
      io.to(roomId).emit('newMessage', { message: systemMessage.toJSON() });
      io.to(roomId).emit('userUnmuted', { mute: mute.toJSON(), roomId });
    }
    
    res.json({
      message: 'User unmuted successfully',
      mute: mute.toJSON()
    });
  } catch (err) {
    console.error('Unmute user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getMuteList(req, res) {
  try {
    const { page = 1, limit = 20, roomId, userId, activeOnly } = req.query;
    const skip = (page - 1) * limit;
    
    const query = {};
    if (roomId) query.roomId = roomId;
    if (userId) query.userId = userId;
    if (activeOnly === 'true') query.isActive = true;
    
    const mutes = await Mute.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'username')
      .populate('roomId', 'name')
      .populate('mutedBy', 'username');
    
    const total = await Mute.countDocuments(query);
    
    res.json({
      mutes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Get mute list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function deleteMessage(req, res) {
  try {
    const { messageId } = req.params;
    const adminUser = req.user;
    
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    message.isDeleted = true;
    message.deletedBy = adminUser.userId;
    message.deletedAt = new Date();
    await message.save();
    
    const io = require('../socket').getIO();
    io.to(message.roomId.toString()).emit('messageDeleted', {
      messageId,
      roomId: message.roomId
    });
    
    res.json({ message: 'Message deleted successfully' });
  } catch (err) {
    console.error('Delete message error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  getUsers,
  getUser,
  kickUser,
  muteUser,
  unmuteUser,
  getMuteList,
  deleteMessage
};

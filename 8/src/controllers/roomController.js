const Room = require('../models/Room');
const Message = require('../models/Message');
const config = require('../config');

async function createRoom(req, res) {
  try {
    const { name, description, isPrivate, password } = req.body;
    const user = req.user;
    
    if (!name || name.length < 2 || name.length > 50) {
      return res.status(400).json({ error: 'Room name must be between 2 and 50 characters' });
    }
    
    const existingRoom = await Room.findOne({ name });
    if (existingRoom) {
      return res.status(400).json({ error: 'Room name already exists' });
    }
    
    const room = new Room({
      name,
      description: description || '',
      createdBy: user.userId,
      isPrivate: isPrivate || false,
      password: isPrivate ? password : null
    });
    
    await room.save();
    
    res.status(201).json({
      message: 'Room created successfully',
      room: room.toJSON()
    });
  } catch (err) {
    console.error('Create room error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getRooms(req, res) {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    
    const rooms = await Room.find({ isPrivate: false })
      .sort({ lastActivity: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'username nickname');
    
    const total = await Room.countDocuments({ isPrivate: false });
    
    res.json({
      rooms: rooms.map(r => r.toJSON()),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Get rooms error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getRoom(req, res) {
  try {
    const { roomId } = req.params;
    
    const room = await Room.findById(roomId)
      .populate('createdBy', 'username nickname')
      .populate('lastMessage');
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    res.json({ room: room.toJSON() });
  } catch (err) {
    console.error('Get room error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getRoomMessages(req, res) {
  try {
    const { roomId } = req.params;
    const { page = 1, before } = req.query;
    const pageSize = config.pagination.pageSize;
    const skip = (page - 1) * pageSize;
    
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const query = {
      roomId,
      isDeleted: false
    };
    
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }
    
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .populate('userId', 'username nickname avatar');
    
    const total = await Message.countDocuments(query);
    
    messages.reverse();
    
    res.json({
      messages: messages.map(m => m.toJSON()),
      pagination: {
        page: parseInt(page),
        pageSize,
        total,
        pages: Math.ceil(total / pageSize),
        hasMore: skip + messages.length < total
      }
    });
  } catch (err) {
    console.error('Get room messages error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getOnlineUsers(req, res) {
  try {
    const { roomId } = req.params;
    
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    res.json({
      roomId,
      users: room.onlineUsers,
      count: room.onlineUsers.length
    });
  } catch (err) {
    console.error('Get online users error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function deleteRoom(req, res) {
  try {
    const { roomId } = req.params;
    const user = req.user;
    
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    if (!user.isAdmin && room.createdBy.toString() !== user.userId.toString()) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    await Room.findByIdAndDelete(roomId);
    await Message.deleteMany({ roomId });
    
    res.json({ message: 'Room deleted successfully' });
  } catch (err) {
    console.error('Delete room error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  createRoom,
  getRooms,
  getRoom,
  getRoomMessages,
  getOnlineUsers,
  deleteRoom
};

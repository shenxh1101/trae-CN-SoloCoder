const { Server } = require('socket.io');
const { authenticateSocket } = require('../middleware/auth');
const { getRedisAdapter } = require('../config/redis');
const User = require('../models/User');
const Room = require('../models/Room');
const Mute = require('../models/Mute');
const Message = require('../models/Message');
const config = require('../config');

let io = null;
const userSockets = new Map();

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: config.cors.origin,
      methods: ['GET', 'POST'],
      credentials: true
    },
    adapter: getRedisAdapter(),
    pingTimeout: 60000,
    pingInterval: 25000
  });
  
  io.use(authenticateSocket);
  
  io.on('connection', handleConnection);
  
  console.log('Socket.io initialized');
  return io;
}

async function handleConnection(socket) {
  const user = socket.user;
  console.log(`User connected: ${user.username} (${socket.id})`);
  
  userSockets.set(user.userId.toString(), socket.id);
  
  try {
    await User.findByIdAndUpdate(user.userId, {
      status: 'online',
      lastActive: new Date()
    });
  } catch (err) {
    console.error('Error updating user status:', err);
  }
  
  socket.on('createRoom', (data) => handleCreateRoom(socket, data));
  socket.on('joinRoom', (data) => handleJoinRoom(socket, data));
  socket.on('leaveRoom', (data) => handleLeaveRoom(socket, data));
  socket.on('sendMessage', (data) => handleSendMessage(socket, data));
  socket.on('typing', (data) => handleTyping(socket, data));
  socket.on('stopTyping', (data) => handleStopTyping(socket, data));
  socket.on('getOnlineUsers', (data) => handleGetOnlineUsers(socket, data));
  socket.on('kickUser', (data) => handleKickUser(socket, data));
  socket.on('muteUser', (data) => handleMuteUser(socket, data));
  socket.on('unmuteUser', (data) => handleUnmuteUser(socket, data));
  
  socket.on('disconnect', () => handleDisconnect(socket));
  socket.on('error', (err) => handleSocketError(socket, err));
  
  socket.emit('connected', {
    message: 'Connected successfully',
    user: {
      userId: user.userId,
      username: user.username,
      isAdmin: user.isAdmin
    }
  });
}

async function handleCreateRoom(socket, data) {
  try {
    const { name, description, isPrivate, password } = data;
    const user = socket.user;
    
    if (!name || name.length < 2 || name.length > 50) {
      return socket.emit('error', { message: 'Room name must be between 2 and 50 characters' });
    }
    
    const existingRoom = await Room.findOne({ name });
    if (existingRoom) {
      return socket.emit('error', { message: 'Room name already exists' });
    }
    
    const room = new Room({
      name,
      description: description || '',
      createdBy: user.userId,
      isPrivate: isPrivate || false,
      password: password || null
    });
    
    await room.save();
    
    io.emit('roomCreated', { room: room.toJSON() });
    
    socket.emit('roomCreatedSuccess', {
      message: 'Room created successfully',
      room: room.toJSON()
    });
    
  } catch (err) {
    console.error('Create room error:', err);
    socket.emit('error', { message: 'Failed to create room' });
  }
}

async function handleJoinRoom(socket, data) {
  try {
    const { roomId, password } = data;
    const user = socket.user;
    
    if (!roomId) {
      return socket.emit('error', { message: 'Room ID is required' });
    }
    
    const room = await Room.findById(roomId);
    if (!room) {
      return socket.emit('error', { message: 'Room not found' });
    }
    
    if (room.isPrivate && room.password && room.password !== password) {
      return socket.emit('error', { message: 'Invalid room password' });
    }
    
    if (room.onlineUsers.length >= room.maxUsers) {
      return socket.emit('error', { message: 'Room is full' });
    }
    
    const existingUser = room.onlineUsers.find(
      u => u.userId.toString() === user.userId.toString()
    );
    
    if (existingUser) {
      existingUser.socketId = socket.id;
    } else {
      const userDoc = await User.findById(user.userId);
      room.onlineUsers.push({
        userId: user.userId,
        username: user.username,
        nickname: userDoc?.nickname || user.username,
        socketId: socket.id,
        joinedAt: new Date()
      });
    }
    
    room.lastActivity = new Date();
    await room.save();
    
    socket.join(roomId);
    
    socket.emit('joinedRoom', {
      roomId,
      room: room.toJSON(),
      onlineUsers: room.onlineUsers
    });
    
    socket.to(roomId).emit('userJoined', {
      roomId,
      user: {
        userId: user.userId,
        username: user.username,
        socketId: socket.id
      },
      onlineUsers: room.onlineUsers
    });
    
    const systemMessage = new Message({
      roomId,
      userId: user.userId,
      username: user.username,
      content: `${user.username} joined the room`,
      type: 'system'
    });
    await systemMessage.save();
    
    io.to(roomId).emit('newMessage', { message: systemMessage.toJSON() });
    
  } catch (err) {
    console.error('Join room error:', err);
    socket.emit('error', { message: 'Failed to join room' });
  }
}

async function handleLeaveRoom(socket, data) {
  try {
    const { roomId } = data;
    const user = socket.user;
    
    if (!roomId) {
      return socket.emit('error', { message: 'Room ID is required' });
    }
    
    const room = await Room.findById(roomId);
    if (!room) {
      return socket.emit('error', { message: 'Room not found' });
    }
    
    room.onlineUsers = room.onlineUsers.filter(
      u => u.userId.toString() !== user.userId.toString()
    );
    room.lastActivity = new Date();
    await room.save();
    
    socket.leave(roomId);
    
    socket.emit('leftRoom', { roomId });
    
    socket.to(roomId).emit('userLeft', {
      roomId,
      user: {
        userId: user.userId,
        username: user.username
      },
      onlineUsers: room.onlineUsers
    });
    
    const systemMessage = new Message({
      roomId,
      userId: user.userId,
      username: user.username,
      content: `${user.username} left the room`,
      type: 'system'
    });
    await systemMessage.save();
    
    io.to(roomId).emit('newMessage', { message: systemMessage.toJSON() });
    
  } catch (err) {
    console.error('Leave room error:', err);
    socket.emit('error', { message: 'Failed to leave room' });
  }
}

async function handleSendMessage(socket, data) {
  try {
    const { roomId, content } = data;
    const user = socket.user;
    
    if (!roomId || !content || !content.trim()) {
      return socket.emit('error', { message: 'Room ID and content are required' });
    }
    
    if (content.length > 2000) {
      return socket.emit('error', { message: 'Message is too long (max 2000 characters)' });
    }
    
    const room = await Room.findById(roomId);
    if (!room) {
      return socket.emit('error', { message: 'Room not found' });
    }
    
    const isInRoom = room.onlineUsers.some(
      u => u.userId.toString() === user.userId.toString()
    );
    if (!isInRoom) {
      return socket.emit('error', { message: 'You are not in this room' });
    }
    
    const muteRecord = await Mute.isUserMuted(user.userId, roomId);
    if (muteRecord) {
      const muteInfo = muteRecord.type === 'permanent' 
        ? 'permanently' 
        : `until ${new Date(muteRecord.expiresAt).toLocaleString()}`;
      return socket.emit('error', { 
        message: `You are muted in this room (${muteInfo})`,
        mute: muteRecord.toJSON()
      });
    }
    
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    
    while ((match = mentionRegex.exec(content)) !== null) {
      const mentionedUsername = match[1].toLowerCase();
      const mentionedUser = await User.findOne({ username: mentionedUsername });
      if (mentionedUser) {
        mentions.push({
          userId: mentionedUser._id,
          username: mentionedUser.username
        });
      }
    }
    
    const userDoc = await User.findById(user.userId);
    const message = new Message({
      roomId,
      userId: user.userId,
      username: user.username,
      nickname: userDoc?.nickname || user.username,
      content: content.trim(),
      mentions
    });
    
    await message.save();
    
    room.messageCount += 1;
    room.lastMessage = message._id;
    room.lastActivity = new Date();
    await room.save();
    
    io.to(roomId).emit('newMessage', { message: message.toJSON() });
    
    if (mentions.length > 0) {
      mentions.forEach(mention => {
        const targetSocketId = userSockets.get(mention.userId.toString());
        if (targetSocketId) {
          io.to(targetSocketId).emit('mention', {
            message: message.toJSON(),
            mentionedBy: {
              userId: user.userId,
              username: user.username
            },
            roomId,
            roomName: room.name
          });
        }
      });
    }
    
    socket.emit('messageSent', { messageId: message._id });
    
  } catch (err) {
    console.error('Send message error:', err);
    socket.emit('error', { message: 'Failed to send message' });
  }
}

async function handleTyping(socket, data) {
  try {
    const { roomId } = data;
    const user = socket.user;
    socket.to(roomId).emit('userTyping', {
      roomId,
      user: {
        userId: user.userId,
        username: user.username
      }
    });
  } catch (err) {
    console.error('Typing error:', err);
  }
}

async function handleStopTyping(socket, data) {
  try {
    const { roomId } = data;
    const user = socket.user;
    socket.to(roomId).emit('userStopTyping', {
      roomId,
      user: {
        userId: user.userId,
        username: user.username
      }
    });
  } catch (err) {
    console.error('Stop typing error:', err);
  }
}

async function handleGetOnlineUsers(socket, data) {
  try {
    const { roomId } = data;
    
    if (!roomId) {
      return socket.emit('error', { message: 'Room ID is required' });
    }
    
    const room = await Room.findById(roomId);
    if (!room) {
      return socket.emit('error', { message: 'Room not found' });
    }
    
    socket.emit('onlineUsers', {
      roomId,
      users: room.onlineUsers
    });
  } catch (err) {
    console.error('Get online users error:', err);
    socket.emit('error', { message: 'Failed to get online users' });
  }
}

async function handleKickUser(socket, data) {
  try {
    const { roomId, userId, reason } = data;
    const adminUser = socket.user;
    
    if (!adminUser.isAdmin) {
      return socket.emit('error', { message: 'Admin access required' });
    }
    
    if (!roomId || !userId) {
      return socket.emit('error', { message: 'Room ID and User ID are required' });
    }
    
    const room = await Room.findById(roomId);
    if (!room) {
      return socket.emit('error', { message: 'Room not found' });
    }
    
    const targetUserIndex = room.onlineUsers.findIndex(
      u => u.userId.toString() === userId.toString()
    );
    
    if (targetUserIndex === -1) {
      return socket.emit('error', { message: 'User not found in room' });
    }
    
    const targetUser = room.onlineUsers[targetUserIndex];
    room.onlineUsers.splice(targetUserIndex, 1);
    await room.save();
    
    if (targetUser.socketId) {
      const targetSocket = io.sockets.sockets.get(targetUser.socketId);
      if (targetSocket) {
        targetSocket.leave(roomId);
        targetSocket.emit('kicked', {
          roomId,
          roomName: room.name,
          reason: reason || 'Kicked by admin'
        });
      }
    }
    
    socket.to(roomId).emit('userKicked', {
      roomId,
      user: {
        userId,
        username: targetUser.username
      },
      reason: reason || 'Kicked by admin',
      onlineUsers: room.onlineUsers
    });
    
    const systemMessage = new Message({
      roomId,
      userId: adminUser.userId,
      username: adminUser.username,
      content: `${targetUser.username} was kicked from the room. Reason: ${reason || 'Kicked by admin'}`,
      type: 'system'
    });
    await systemMessage.save();
    
    io.to(roomId).emit('newMessage', { message: systemMessage.toJSON() });
    
    socket.emit('userKickedSuccess', { message: 'User kicked successfully' });
    
  } catch (err) {
    console.error('Kick user error:', err);
    socket.emit('error', { message: 'Failed to kick user' });
  }
}

async function handleMuteUser(socket, data) {
  try {
    const { roomId, userId, type, duration, reason } = data;
    const adminUser = socket.user;
    
    if (!adminUser.isAdmin) {
      return socket.emit('error', { message: 'Admin access required' });
    }
    
    if (!userId || !type) {
      return socket.emit('error', { message: 'User ID and mute type are required' });
    }
    
    if (!['temporary', 'permanent', 'global'].includes(type)) {
      return socket.emit('error', { message: 'Invalid mute type' });
    }
    
    if (type === 'temporary' && (!duration || duration <= 0)) {
      return socket.emit('error', { message: 'Duration is required for temporary mute' });
    }
    
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return socket.emit('error', { message: 'User not found' });
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
    
    const targetSocketId = userSockets.get(userId.toString());
    if (targetSocketId) {
      io.to(targetSocketId).emit('muted', {
        mute: mute.toJSON(),
        roomId: type === 'global' ? null : roomId,
        mutedBy: {
          userId: adminUser.userId,
          username: adminUser.username
        }
      });
    }
    
    if (roomId) {
      const room = await Room.findById(roomId);
      if (room) {
        const roomName = room.name;
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
        
        io.to(roomId).emit('newMessage', { message: systemMessage.toJSON() });
        io.to(roomId).emit('userMuted', { mute: mute.toJSON(), roomId });
      }
    }
    
    socket.emit('userMutedSuccess', { 
      message: 'User muted successfully',
      mute: mute.toJSON()
    });
    
  } catch (err) {
    console.error('Mute user error:', err);
    socket.emit('error', { message: 'Failed to mute user' });
  }
}

async function handleUnmuteUser(socket, data) {
  try {
    const { roomId, userId } = data;
    const adminUser = socket.user;
    
    if (!adminUser.isAdmin) {
      return socket.emit('error', { message: 'Admin access required' });
    }
    
    if (!userId) {
      return socket.emit('error', { message: 'User ID is required' });
    }
    
    const query = { userId, isActive: true };
    if (roomId) {
      query.roomId = roomId;
    }
    
    const mute = await Mute.findOne(query);
    if (!mute) {
      return socket.emit('error', { message: 'Active mute not found for this user' });
    }
    
    mute.isActive = false;
    mute.unmutedBy = adminUser.userId;
    mute.unmutedAt = new Date();
    await mute.save();
    
    const targetSocketId = userSockets.get(userId.toString());
    if (targetSocketId) {
      io.to(targetSocketId).emit('unmuted', {
        mute: mute.toJSON(),
        roomId
      });
    }
    
    if (roomId) {
      const targetUser = await User.findById(userId);
      const systemMessage = new Message({
        roomId,
        userId: adminUser.userId,
        username: adminUser.username,
        content: `${targetUser?.username || 'User'} was unmuted`,
        type: 'system'
      });
      await systemMessage.save();
      
      io.to(roomId).emit('newMessage', { message: systemMessage.toJSON() });
      io.to(roomId).emit('userUnmuted', { mute: mute.toJSON(), roomId });
    }
    
    socket.emit('userUnmutedSuccess', { 
      message: 'User unmuted successfully',
      mute: mute.toJSON()
    });
    
  } catch (err) {
    console.error('Unmute user error:', err);
    socket.emit('error', { message: 'Failed to unmute user' });
  }
}

async function handleDisconnect(socket) {
  const user = socket.user;
  console.log(`User disconnected: ${user.username} (${socket.id})`);
  
  userSockets.delete(user.userId.toString());
  
  try {
    const rooms = await Room.find({
      'onlineUsers.userId': user.userId
    });
    
    for (const room of rooms) {
      room.onlineUsers = room.onlineUsers.filter(
        u => u.userId.toString() !== user.userId.toString()
      );
      room.lastActivity = new Date();
      await room.save();
      
      const systemMessage = new Message({
        roomId: room._id,
        userId: user.userId,
        username: user.username,
        content: `${user.username} disconnected`,
        type: 'system'
      });
      await systemMessage.save();
      
      io.to(room._id.toString()).emit('userDisconnected', {
        userId: user.userId,
        username: user.username,
        roomId: room._id,
        onlineUsers: room.onlineUsers
      });
      
      io.to(room._id.toString()).emit('newMessage', { message: systemMessage.toJSON() });
    }
    
    await User.findByIdAndUpdate(user.userId, {
      status: 'offline',
      lastActive: new Date()
    });
    
  } catch (err) {
    console.error('Disconnect handler error:', err);
  }
}

function handleSocketError(socket, err) {
  console.error(`Socket error for ${socket.user?.username}:`, err);
  socket.emit('error', { message: 'An error occurred' });
}

function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}

function getUserSocketId(userId) {
  return userSockets.get(userId.toString());
}

module.exports = {
  initSocket,
  getIO,
  getUserSocketId,
  handleConnection,
  handleCreateRoom,
  handleJoinRoom,
  handleLeaveRoom,
  handleSendMessage,
  handleKickUser,
  handleMuteUser,
  handleUnmuteUser
};

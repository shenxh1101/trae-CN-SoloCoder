const { generateUserId } = require('../utils/generateId');
const {
  getSnippet,
  updateSnippet,
  saveVersion,
  getHistory,
  revertToVersion,
  verifyPassword,
  setReadOnly,
  deleteSnippet
} = require('../services/snippetService');

const activeSessions = new Map();

const getSession = (snippetId) => {
  if (!activeSessions.has(snippetId)) {
    activeSessions.set(snippetId, {
      users: new Map(),
      chatMessages: [],
      lastActivity: Date.now()
    });
  }
  return activeSessions.get(snippetId);
};

const removeSession = (snippetId) => {
  activeSessions.delete(snippetId);
};

const userColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8B500', '#00CED1', '#FF69B4', '#32CD32', '#FF4500'
];

const getRandomColor = () => {
  return userColors[Math.floor(Math.random() * userColors.length)];
};

const collaborationHandler = (io, socket) => {
  let currentSnippetId = null;
  let currentUserId = null;
  let currentUserName = null;
  let currentOwnerId = null;
  let isAuthenticated = false;
  let userIsOwner = false;

  socket.on('join-snippet', async ({ snippetId, password, userName, ownerId }) => {
    try {
      const snippet = await getSnippet(snippetId);
      
      if (!snippet) {
        socket.emit('error', { message: 'Snippet not found' });
        return;
      }

      if (snippet.hasPassword) {
        const isPasswordValid = await verifyPassword(snippet, password);
        if (!isPasswordValid) {
          socket.emit('error', { message: 'Invalid password' });
          socket.emit('password-required', { snippetId });
          return;
        }
      }

      currentSnippetId = snippetId;
      currentUserId = generateUserId();
      currentUserName = userName || 'Anonymous';
      currentOwnerId = ownerId;
      isAuthenticated = true;

      userIsOwner = ownerId && snippet.ownerId === ownerId;

      const session = getSession(snippetId);
      
      const userColor = getRandomColor();
      const userData = {
        id: currentUserId,
        name: currentUserName,
        color: userColor,
        socketId: socket.id,
        cursor: null,
        selection: null,
        joinedAt: Date.now(),
        isOwner: userIsOwner
      };

      session.users.set(currentUserId, userData);
      session.lastActivity = Date.now();

      socket.join(snippetId);

      socket.emit('joined', {
        userId: currentUserId,
        userColor,
        snippet: {
          id: snippet.id,
          code: snippet.code,
          language: snippet.language,
          createdAt: snippet.createdAt,
          updatedAt: snippet.updatedAt,
          ownerName: snippet.ownerName,
          isReadOnly: snippet.isReadOnly,
          hasPassword: snippet.hasPassword,
          expiresAt: snippet.expiresAt,
          isOwner: userIsOwner
        },
        users: Array.from(session.users.values()),
        chatMessages: session.chatMessages.slice(-50),
        userStats: snippet.userStats
      });

      socket.to(snippetId).emit('user-joined', userData);

      console.log(`User ${currentUserName} joined snippet ${snippetId}`);
    } catch (err) {
      console.error('Error joining snippet:', err);
      socket.emit('error', { message: 'Failed to join snippet' });
    }
  });

  socket.on('code-change', async ({ code, from, to, text, origin }) => {
    if (!isAuthenticated || !currentSnippetId) return;

    try {
      const snippet = await getSnippet(currentSnippetId);
      if (!snippet) return;

      if (snippet.isReadOnly && !userIsOwner) {
        socket.emit('error', { message: 'Snippet is read-only' });
        return;
      }

      const updatedSnippet = await updateSnippet(
        currentSnippetId,
        { code },
        currentUserId,
        currentUserName
      );

      socket.to(currentSnippetId).emit('code-change', {
        code,
        from,
        to,
        text,
        origin: currentUserId
      });

      const session = getSession(currentSnippetId);
      session.lastActivity = Date.now();

      io.to(currentSnippetId).emit('user-stats-updated', updatedSnippet.userStats);

    } catch (err) {
      console.error('Error processing code change:', err);
    }
  });

  socket.on('language-change', async ({ language }) => {
    if (!isAuthenticated || !currentSnippetId) return;

    try {
      const snippet = await getSnippet(currentSnippetId);
      if (!snippet) return;

      if (snippet.isReadOnly && !userIsOwner) {
        socket.emit('error', { message: 'Snippet is read-only' });
        return;
      }

      const updatedSnippet = await updateSnippet(
        currentSnippetId,
        { language },
        currentUserId,
        currentUserName
      );

      io.to(currentSnippetId).emit('language-changed', {
        language,
        userId: currentUserId
      });

    } catch (err) {
      console.error('Error changing language:', err);
    }
  });

  socket.on('cursor-move', ({ cursor }) => {
    if (!isAuthenticated || !currentSnippetId) return;

    const session = getSession(currentSnippetId);
    const user = session.users.get(currentUserId);
    if (user) {
      user.cursor = cursor;
      user.selection = null;
    }

    socket.to(currentSnippetId).emit('cursor-move', {
      userId: currentUserId,
      cursor
    });
  });

  socket.on('selection-change', ({ selection, cursor }) => {
    if (!isAuthenticated || !currentSnippetId) return;

    const session = getSession(currentSnippetId);
    const user = session.users.get(currentUserId);
    if (user) {
      user.cursor = cursor;
      user.selection = selection;
    }

    socket.to(currentSnippetId).emit('selection-change', {
      userId: currentUserId,
      selection,
      cursor
    });
  });

  socket.on('save-version', async ({ message }) => {
    if (!isAuthenticated || !currentSnippetId) return;

    try {
      const snippet = await getSnippet(currentSnippetId);
      if (!snippet) return;

      const version = await saveVersion(
        currentSnippetId,
        snippet.code,
        snippet.language,
        currentUserName,
        message
      );

      io.to(currentSnippetId).emit('version-saved', version);

    } catch (err) {
      console.error('Error saving version:', err);
      socket.emit('error', { message: 'Failed to save version' });
    }
  });

  socket.on('get-history', async () => {
    if (!isAuthenticated || !currentSnippetId) return;

    try {
      const history = await getHistory(currentSnippetId);
      socket.emit('history', history);
    } catch (err) {
      console.error('Error getting history:', err);
    }
  });

  socket.on('revert-version', async ({ versionId }) => {
    if (!isAuthenticated || !currentSnippetId) return;

    try {
      const snippet = await getSnippet(currentSnippetId);
      if (!snippet) return;

      if (snippet.isReadOnly && !userIsOwner) {
        socket.emit('error', { message: 'Snippet is read-only' });
        return;
      }

      const updatedSnippet = await revertToVersion(
        currentSnippetId,
        versionId,
        currentUserId,
        currentUserName
      );

      if (updatedSnippet) {
        io.to(currentSnippetId).emit('code-reverted', {
          code: updatedSnippet.code,
          language: updatedSnippet.language,
          versionId,
          userId: currentUserId
        });
      }

    } catch (err) {
      console.error('Error reverting version:', err);
      socket.emit('error', { message: 'Failed to revert version' });
    }
  });

  socket.on('chat-message', ({ text }) => {
    if (!isAuthenticated || !currentSnippetId || !text.trim()) return;

    const session = getSession(currentSnippetId);
    
    const message = {
      id: generateUserId(),
      userId: currentUserId,
      userName: currentUserName,
      text: text.trim(),
      timestamp: Date.now()
    };

    session.chatMessages.push(message);
    if (session.chatMessages.length > 100) {
      session.chatMessages.shift();
    }
    session.lastActivity = Date.now();

    io.to(currentSnippetId).emit('chat-message', message);
  });

  socket.on('set-read-only', async ({ isReadOnly }) => {
    if (!isAuthenticated || !currentSnippetId) return;

    try {
      if (!userIsOwner) {
        socket.emit('error', { message: 'Only owner can change permissions' });
        return;
      }

      const snippet = await setReadOnly(currentSnippetId, isReadOnly, currentOwnerId);
      
      if (snippet) {
        io.to(currentSnippetId).emit('read-only-changed', {
          isReadOnly,
          userId: currentUserId
        });
      }
    } catch (err) {
      console.error('Error setting read-only:', err);
      socket.emit('error', { message: err.message });
    }
  });

  socket.on('delete-snippet', async () => {
    if (!isAuthenticated || !currentSnippetId) return;

    try {
      const snippet = await getSnippet(currentSnippetId);
      if (!snippet || !userIsOwner) {
        socket.emit('error', { message: 'Only owner can delete snippet' });
        return;
      }

      await deleteSnippet(currentSnippetId);
      
      io.to(currentSnippetId).emit('snippet-deleted', {
        snippetId: currentSnippetId
      });

      removeSession(currentSnippetId);

    } catch (err) {
      console.error('Error deleting snippet:', err);
      socket.emit('error', { message: 'Failed to delete snippet' });
    }
  });

  socket.on('user-typing', ({ isTyping }) => {
    if (!isAuthenticated || !currentSnippetId) return;

    socket.to(currentSnippetId).emit('user-typing', {
      userId: currentUserId,
      isTyping
    });
  });

  socket.on('disconnect', () => {
    if (currentSnippetId && currentUserId) {
      const session = getSession(currentSnippetId);
      session.users.delete(currentUserId);
      session.lastActivity = Date.now();

      socket.to(currentSnippetId).emit('user-left', {
        userId: currentUserId
      });

      if (session.users.size === 0) {
        setTimeout(() => {
          const checkSession = activeSessions.get(currentSnippetId);
          if (checkSession && checkSession.users.size === 0) {
            removeSession(currentSnippetId);
          }
        }, 60000);
      }

      console.log(`User ${currentUserName} left snippet ${currentSnippetId}`);
    }
  });
};

module.exports = collaborationHandler;

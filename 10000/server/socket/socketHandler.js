const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const documentSessions = new Map();
const userSockets = new Map();

const USER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
];

const getRandomColor = () => {
  return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
};

const getDocumentUsers = (documentId) => {
  const session = documentSessions.get(documentId);
  if (!session) return [];
  return Array.from(session.users.values());
};

const setupSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const result = await pool.query(
        'SELECT id, username, email FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        return next(new Error('Invalid user'));
      }

      socket.user = result.rows[0];
      socket.user.color = getRandomColor();
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.username}`);
    userSockets.set(socket.user.id, socket.id);

    socket.on('join-document', async ({ documentId }) => {
      try {
        const result = await pool.query('SELECT * FROM documents WHERE id = $1', [documentId]);
        if (result.rows.length === 0) {
          socket.emit('error', { message: 'Document not found' });
          return;
        }

        const document = result.rows[0];
        let hasPermission = false;

        if (document.owner_id === socket.user.id) {
          hasPermission = true;
        } else if (document.is_public) {
          hasPermission = true;
        } else {
          const shareResult = await pool.query(
            'SELECT permission FROM document_shares WHERE document_id = $1 AND user_id = $2',
            [documentId, socket.user.id]
          );
          hasPermission = shareResult.rows.length > 0;
        }

        if (!hasPermission) {
          socket.emit('error', { message: 'You do not have permission to access this document' });
          return;
        }

        socket.join(`document:${documentId}`);
        socket.documentId = documentId;

        if (!documentSessions.has(documentId)) {
          documentSessions.set(documentId, {
            users: new Map(),
            content: document.content
          });
        }

        const session = documentSessions.get(documentId);
        session.users.set(socket.user.id, {
          ...socket.user,
          cursor: null,
          socketId: socket.id
        });

        const users = getDocumentUsers(documentId);
        io.to(`document:${documentId}`).emit('user-joined', {
          user: socket.user,
          users
        });

        socket.emit('document-state', {
          content: session.content,
          users
        });
      } catch (err) {
        console.error('Join document error:', err);
        socket.emit('error', { message: 'Failed to join document' });
      }
    });

    socket.on('edit', async ({ content, cursor }) => {
      const documentId = socket.documentId;
      if (!documentId) return;

      const session = documentSessions.get(documentId);
      if (!session) return;

      session.content = content;

      const user = session.users.get(socket.user.id);
      if (user) {
        user.cursor = cursor;
      }

      socket.to(`document:${documentId}`).emit('edit', {
        content,
        cursor,
        userId: socket.user.id,
        username: socket.user.username,
        color: socket.user.color
      });
    });

    socket.on('cursor-move', ({ cursor }) => {
      const documentId = socket.documentId;
      if (!documentId) return;

      const session = documentSessions.get(documentId);
      if (!session) return;

      const user = session.users.get(socket.user.id);
      if (user) {
        user.cursor = cursor;
      }

      socket.to(`document:${documentId}`).emit('cursor-move', {
        cursor,
        userId: socket.user.id,
        username: socket.user.username,
        color: socket.user.color
      });
    });

    socket.on('selection', ({ selection }) => {
      const documentId = socket.documentId;
      if (!documentId) return;

      socket.to(`document:${documentId}`).emit('selection', {
        selection,
        userId: socket.user.id,
        username: socket.user.username,
        color: socket.user.color
      });
    });

    socket.on('comment-added', (comment) => {
      const documentId = socket.documentId;
      if (!documentId) return;

      socket.to(`document:${documentId}`).emit('comment-added', comment);
    });

    socket.on('save-document', async () => {
      const documentId = socket.documentId;
      if (!documentId) return;

      const session = documentSessions.get(documentId);
      if (!session) return;

      try {
        await pool.query(
          'UPDATE documents SET content = $1 WHERE id = $2',
          [session.content, documentId]
        );

        socket.emit('document-saved', { success: true });
      } catch (err) {
        console.error('Save document error:', err);
        socket.emit('document-saved', { success: false, error: err.message });
      }
    });

    socket.on('leave-document', () => {
      const documentId = socket.documentId;
      if (!documentId) return;

      const session = documentSessions.get(documentId);
      if (session) {
        session.users.delete(socket.user.id);
        
        if (session.users.size === 0) {
          documentSessions.delete(documentId);
        } else {
          const users = getDocumentUsers(documentId);
          socket.to(`document:${documentId}`).emit('user-left', {
            userId: socket.user.id,
            users
          });
        }
      }

      socket.leave(`document:${documentId}`);
      socket.documentId = null;
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.username}`);
      userSockets.delete(socket.user.id);

      const documentId = socket.documentId;
      if (documentId) {
        const session = documentSessions.get(documentId);
        if (session) {
          session.users.delete(socket.user.id);
          
          if (session.users.size === 0) {
            documentSessions.delete(documentId);
          } else {
            const users = getDocumentUsers(documentId);
            socket.to(`document:${documentId}`).emit('user-left', {
              userId: socket.user.id,
              users
            });
          }
        }
      }
    });
  });
};

module.exports = { setupSocket };

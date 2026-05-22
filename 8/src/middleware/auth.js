const { verifyToken, extractTokenFromHeader } = require('../utils/jwt');

function authenticateHttp(req, res, next) {
  const token = extractTokenFromHeader(req.headers.authorization);
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  
  req.user = decoded;
  next();
}

function authenticateSocket(socket, next) {
  const token = socket.handshake.auth?.token || 
                socket.handshake.headers?.authorization?.split(' ')[1];
  
  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }
  
  const decoded = verifyToken(token);
  if (!decoded) {
    return next(new Error('Authentication error: Invalid or expired token'));
  }
  
  socket.user = decoded;
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

function requireAdminSocket(socket, next) {
  if (!socket.user || !socket.user.isAdmin) {
    return next(new Error('Admin access required'));
  }
  next();
}

module.exports = {
  authenticateHttp,
  authenticateSocket,
  requireAdmin,
  requireAdminSocket
};

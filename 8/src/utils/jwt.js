const jwt = require('jsonwebtoken');
const config = require('../config');

function generateToken(user) {
  const payload = {
    userId: user._id,
    username: user.username,
    isAdmin: user.isAdmin || false
  };
  
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expire
  });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (err) {
    return null;
  }
}

function decodeToken(token) {
  try {
    return jwt.decode(token);
  } catch (err) {
    return null;
  }
}

function extractTokenFromHeader(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split(' ')[1];
}

module.exports = {
  generateToken,
  verifyToken,
  decodeToken,
  extractTokenFromHeader
};

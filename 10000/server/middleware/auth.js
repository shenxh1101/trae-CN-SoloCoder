const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query('SELECT id, username, email FROM users WHERE id = $1', [decoded.userId]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

const checkDocumentPermission = async (req, res, next) => {
  const documentId = req.params.id || req.body.documentId;
  const userId = req.user?.id;

  try {
    const docResult = await pool.query('SELECT * FROM documents WHERE id = $1', [documentId]);
    
    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const document = docResult.rows[0];
    req.document = document;

    if (document.owner_id === userId) {
      req.permission = 'owner';
      return next();
    }

    if (document.is_public) {
      req.permission = 'read';
      return next();
    }

    const shareResult = await pool.query(
      'SELECT permission FROM document_shares WHERE document_id = $1 AND user_id = $2',
      [documentId, userId]
    );

    if (shareResult.rows.length > 0) {
      req.permission = shareResult.rows[0].permission;
      return next();
    }

    return res.status(403).json({ error: 'You do not have permission to access this document' });
  } catch (err) {
    next(err);
  }
};

const requireWritePermission = (req, res, next) => {
  if (req.permission === 'owner' || req.permission === 'write') {
    next();
  } else {
    res.status(403).json({ error: 'Write permission required' });
  }
};

module.exports = { authenticateToken, checkDocumentPermission, requireWritePermission };

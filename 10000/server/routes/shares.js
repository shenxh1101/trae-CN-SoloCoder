const express = require('express');
const crypto = require('crypto');
const pool = require('../config/db');
const { authenticateToken, checkDocumentPermission, requireWritePermission } = require('../middleware/auth');

const router = express.Router();

router.post('/document/:documentId', authenticateToken, checkDocumentPermission, async (req, res) => {
  try {
    if (req.permission !== 'owner') {
      return res.status(403).json({ error: 'Only the owner can manage sharing' });
    }

    const { documentId } = req.params;
    const { userId, permission, isPublic, createToken } = req.body;

    if (isPublic !== undefined) {
      await pool.query(
        'UPDATE documents SET is_public = $1 WHERE id = $2',
        [isPublic, documentId]
      );
    }

    if (userId && permission) {
      await pool.query(
        `INSERT INTO document_shares (document_id, user_id, permission) 
         VALUES ($1, $2, $3)
         ON CONFLICT (document_id, user_id) DO UPDATE SET permission = $3`,
        [documentId, userId, permission]
      );
    }

    let shareToken = null;
    if (createToken) {
      shareToken = crypto.randomBytes(32).toString('hex');
      await pool.query(
        `INSERT INTO document_shares (document_id, permission, share_token) 
         VALUES ($1, $2, $3)
         ON CONFLICT (document_id, share_token) DO NOTHING`,
        [documentId, createToken.permission || 'read', shareToken]
      );
    }

    res.json({
      message: 'Sharing settings updated',
      isPublic: isPublic !== undefined ? isPublic : req.document.is_public,
      shareToken
    });
  } catch (err) {
    console.error('Share document error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/document/:documentId', authenticateToken, checkDocumentPermission, async (req, res) => {
  try {
    if (req.permission !== 'owner') {
      return res.status(403).json({ error: 'Only the owner can view sharing settings' });
    }

    const { documentId } = req.params;

    const sharesResult = await pool.query(`
      SELECT ds.*, u.username, u.email
      FROM document_shares ds
      LEFT JOIN users u ON ds.user_id = u.id
      WHERE ds.document_id = $1
      ORDER BY ds.created_at DESC
    `, [documentId]);

    const docResult = await pool.query(
      'SELECT is_public FROM documents WHERE id = $1',
      [documentId]
    );

    res.json({
      isPublic: docResult.rows[0].is_public,
      shares: sharesResult.rows
    });
  } catch (err) {
    console.error('Get shares error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/document/:documentId/user/:userId', authenticateToken, checkDocumentPermission, async (req, res) => {
  try {
    if (req.permission !== 'owner') {
      return res.status(403).json({ error: 'Only the owner can manage sharing' });
    }

    const { documentId, userId } = req.params;

    await pool.query(
      'DELETE FROM document_shares WHERE document_id = $1 AND user_id = $2',
      [documentId, userId]
    );

    res.json({ message: 'Share permission revoked' });
  } catch (err) {
    console.error('Revoke share error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/token/:token', authenticateToken, async (req, res) => {
  try {
    const { token } = req.params;
    const userId = req.user.id;

    const shareResult = await pool.query(`
      SELECT ds.* FROM document_shares ds
      JOIN documents d ON ds.document_id = d.id
      WHERE ds.share_token = $1 AND d.owner_id = $2
    `, [token, userId]);

    if (shareResult.rows.length === 0) {
      return res.status(404).json({ error: 'Share token not found' });
    }

    await pool.query(
      'DELETE FROM document_shares WHERE share_token = $1',
      [token]
    );

    res.json({ message: 'Share link revoked' });
  } catch (err) {
    console.error('Revoke token error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/token/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const result = await pool.query(`
      SELECT d.*, ds.permission
      FROM document_shares ds
      JOIN documents d ON ds.document_id = d.id
      WHERE ds.share_token = $1 AND (ds.expires_at IS NULL OR ds.expires_at > NOW())
    `, [token]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or expired share link' });
    }

    res.json({
      documentId: result.rows[0].id,
      permission: result.rows[0].permission
    });
  } catch (err) {
    console.error('Validate token error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

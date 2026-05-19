const express = require('express');
const pool = require('../config/db');
const { authenticateToken, checkDocumentPermission, requireWritePermission } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(`
      SELECT DISTINCT d.*, 
        CASE 
          WHEN d.owner_id = $1 THEN 'owner'
          WHEN ds.permission IS NOT NULL THEN ds.permission
          WHEN d.is_public = true THEN 'read'
        END as user_permission
      FROM documents d
      LEFT JOIN document_shares ds ON d.id = ds.document_id AND ds.user_id = $1
      WHERE d.owner_id = $1 OR ds.user_id = $1 OR d.is_public = true
      ORDER BY d.updated_at DESC
    `, [userId]);

    res.json(result.rows);
  } catch (err) {
    console.error('Get documents error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, content } = req.body;
    const userId = req.user.id;

    const result = await pool.query(
      'INSERT INTO documents (title, content, owner_id) VALUES ($1, $2, $3) RETURNING *',
      [title || 'Untitled Document', content || '', userId]
    );

    const document = result.rows[0];
    
    await pool.query(
      'INSERT INTO document_versions (document_id, content, created_by, change_description) VALUES ($1, $2, $3, $4)',
      [document.id, document.content, userId, 'Initial version']
    );

    res.status(201).json({ ...document, user_permission: 'owner' });
  } catch (err) {
    console.error('Create document error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', authenticateToken, checkDocumentPermission, async (req, res) => {
  try {
    const document = req.document;
    const permission = req.permission;

    const versionsResult = await pool.query(`
      SELECT dv.*, u.username as created_by_name
      FROM document_versions dv
      LEFT JOIN users u ON dv.created_by = u.id
      WHERE dv.document_id = $1
      ORDER BY dv.version_number DESC
      LIMIT 20
    `, [document.id]);

    const commentsResult = await pool.query(`
      SELECT c.*, u.username as author_name
      FROM comments c
      JOIN users u ON c.author_id = u.id
      WHERE c.document_id = $1 AND c.parent_id IS NULL
      ORDER BY c.created_at DESC
    `, [document.id]);

    res.json({
      ...document,
      user_permission: permission,
      versions: versionsResult.rows,
      comments: commentsResult.rows
    });
  } catch (err) {
    console.error('Get document error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', authenticateToken, checkDocumentPermission, requireWritePermission, async (req, res) => {
  try {
    const { title, content, saveVersion } = req.body;
    const documentId = req.params.id;
    const userId = req.user.id;

    const result = await pool.query(
      'UPDATE documents SET title = $1, content = $2 WHERE id = $3 RETURNING *',
      [title, content, documentId]
    );

    if (saveVersion) {
      await pool.query(
        'INSERT INTO document_versions (document_id, content, created_by, change_description) VALUES ($1, $2, $3, $4)',
        [documentId, content, userId, 'Manual save']
      );
    }

    res.json({ ...result.rows[0], user_permission: req.permission });
  } catch (err) {
    console.error('Update document error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticateToken, checkDocumentPermission, async (req, res) => {
  try {
    if (req.permission !== 'owner') {
      return res.status(403).json({ error: 'Only the owner can delete this document' });
    }

    await pool.query('DELETE FROM documents WHERE id = $1', [req.params.id]);
    res.json({ message: 'Document deleted successfully' });
  } catch (err) {
    console.error('Delete document error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/versions', authenticateToken, checkDocumentPermission, requireWritePermission, async (req, res) => {
  try {
    const { description } = req.body;
    const documentId = req.params.id;
    const userId = req.user.id;

    const document = req.document;

    const result = await pool.query(
      'INSERT INTO document_versions (document_id, content, created_by, change_description) VALUES ($1, $2, $3, $4) RETURNING *',
      [documentId, document.content, userId, description || 'Version saved']
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Save version error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/restore/:versionId', authenticateToken, checkDocumentPermission, requireWritePermission, async (req, res) => {
  try {
    const { id: documentId, versionId } = req.params;
    const userId = req.user.id;

    const versionResult = await pool.query(
      'SELECT * FROM document_versions WHERE id = $1 AND document_id = $2',
      [versionId, documentId]
    );

    if (versionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Version not found' });
    }

    const version = versionResult.rows[0];

    await pool.query(
      'UPDATE documents SET content = $1 WHERE id = $2',
      [version.content, documentId]
    );

    await pool.query(
      'INSERT INTO document_versions (document_id, content, created_by, change_description) VALUES ($1, $2, $3, $4)',
      [documentId, version.content, userId, `Restored from version ${version.version_number}`]
    );

    res.json({ message: 'Document restored successfully', content: version.content });
  } catch (err) {
    console.error('Restore version error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

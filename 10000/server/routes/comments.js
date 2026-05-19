const express = require('express');
const pool = require('../config/db');
const { authenticateToken, checkDocumentPermission } = require('../middleware/auth');

const router = express.Router();

router.get('/document/:documentId', authenticateToken, checkDocumentPermission, async (req, res) => {
  try {
    const { documentId } = req.params;

    const result = await pool.query(`
      SELECT 
        c.*,
        u.username as author_name,
        (
          SELECT json_agg(
            json_build_object(
              'id', r.id,
              'content', r.content,
              'author_id', r.author_id,
              'author_name', ru.username,
              'created_at', r.created_at
            )
          )
          FROM comments r
          JOIN users ru ON r.author_id = ru.id
          WHERE r.parent_id = c.id
          ORDER BY r.created_at ASC
        ) as replies
      FROM comments c
      JOIN users u ON c.author_id = u.id
      WHERE c.document_id = $1 AND c.parent_id IS NULL
      ORDER BY c.created_at DESC
    `, [documentId]);

    res.json(result.rows);
  } catch (err) {
    console.error('Get comments error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/document/:documentId', authenticateToken, checkDocumentPermission, async (req, res) => {
  try {
    const { documentId } = req.params;
    const { content, selectionStart, selectionEnd, selectedText, parentId } = req.body;
    const userId = req.user.id;

    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const result = await pool.query(
      `INSERT INTO comments 
       (document_id, author_id, content, selection_start, selection_end, selected_text, parent_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [documentId, userId, content, selectionStart, selectionEnd, selectedText, parentId || null]
    );

    const comment = result.rows[0];

    const commentWithAuthor = await pool.query(`
      SELECT c.*, u.username as author_name
      FROM comments c
      JOIN users u ON c.author_id = u.id
      WHERE c.id = $1
    `, [comment.id]);

    res.status(201).json(commentWithAuthor.rows[0]);
  } catch (err) {
    console.error('Create comment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, isResolved } = req.body;
    const userId = req.user.id;

    const existingComment = await pool.query('SELECT * FROM comments WHERE id = $1', [id]);

    if (existingComment.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const comment = existingComment.rows[0];

    if (comment.author_id !== userId) {
      return res.status(403).json({ error: 'You can only edit your own comments' });
    }

    const result = await pool.query(
      'UPDATE comments SET content = COALESCE($1, content), is_resolved = COALESCE($2, is_resolved) WHERE id = $3 RETURNING *',
      [content, isResolved, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update comment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const existingComment = await pool.query(`
      SELECT c.*, d.owner_id as document_owner
      FROM comments c
      JOIN documents d ON c.document_id = d.id
      WHERE c.id = $1
    `, [id]);

    if (existingComment.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const comment = existingComment.rows[0];

    if (comment.author_id !== userId && comment.document_owner !== userId) {
      return res.status(403).json({ error: 'You do not have permission to delete this comment' });
    }

    await pool.query('DELETE FROM comments WHERE id = $1 OR parent_id = $1', [id]);

    res.json({ message: 'Comment deleted successfully' });
  } catch (err) {
    console.error('Delete comment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

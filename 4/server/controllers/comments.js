const { db } = require('../database');

function getTaskComments(req, res) {
  const { taskId } = req.params;
  try {
    const comments = db.prepare(`
      SELECT c.*, u.username as user_name
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.task_id = ?
      ORDER BY c.created_at DESC
    `).all(taskId);
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function createComment(req, res) {
  const { taskId } = req.params;
  const { user_id, content } = req.body;

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ error: '评论内容不能为空' });
  }

  if (!user_id || isNaN(user_id)) {
    return res.status(400).json({ error: '用户ID无效' });
  }

  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
    if (!task) {
      return res.status(404).json({ error: '任务不存在' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const result = db.prepare(`
      INSERT INTO comments (task_id, user_id, content)
      VALUES (?, ?, ?)
    `).run(taskId, user_id, content.trim());

    const comment = db.prepare(`
      SELECT c.*, u.username as user_name
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function deleteComment(req, res) {
  const { id } = req.params;
  try {
    const existing = db.prepare('SELECT * FROM comments WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: '评论不存在' });
    }

    db.prepare('DELETE FROM comments WHERE id = ?').run(id);
    res.json({ message: '评论已删除', id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getTaskComments, createComment, deleteComment };

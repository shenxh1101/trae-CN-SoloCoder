const { db } = require('../database');

const VALID_PRIORITIES = ['high', 'medium', 'low'];
const VALID_STATUSES = ['todo', 'in_progress', 'done'];

function getProjectTasks(req, res) {
  const { projectId } = req.params;
  const { status, assignee_id } = req.query;

  try {
    let sql = `
      SELECT t.*,
        u1.username as assignee_name,
        u2.username as creator_name
      FROM tasks t
      LEFT JOIN users u1 ON t.assignee_id = u1.id
      LEFT JOIN users u2 ON t.creator_id = u2.id
      WHERE t.project_id = ?
    `;
    const params = [projectId];

    if (status && VALID_STATUSES.includes(status)) {
      sql += ' AND t.status = ?';
      params.push(status);
    }

    if (assignee_id && !isNaN(assignee_id)) {
      sql += ' AND t.assignee_id = ?';
      params.push(Number(assignee_id));
    }

    sql += ' ORDER BY t.created_at DESC';

    const tasks = db.prepare(sql).all(...params);
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function getTaskById(req, res) {
  const { id } = req.params;
  try {
    const task = db.prepare(`
      SELECT t.*,
        u1.username as assignee_name,
        u2.username as creator_name,
        p.name as project_name
      FROM tasks t
      LEFT JOIN users u1 ON t.assignee_id = u1.id
      LEFT JOIN users u2 ON t.creator_id = u2.id
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.id = ?
    `).get(id);

    if (!task) {
      return res.status(404).json({ error: '任务不存在' });
    }
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function createTask(req, res) {
  const { projectId } = req.params;
  const { title, description, assignee_id, creator_id, due_date, priority, status } = req.body;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ error: '任务标题不能为空' });
  }

  if (priority && !VALID_PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: '优先级无效' });
  }

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: '状态无效' });
  }

  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }

    const result = db.prepare(`
      INSERT INTO tasks (project_id, title, description, assignee_id, creator_id, due_date, priority, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      projectId,
      title.trim(),
      description || null,
      assignee_id || null,
      creator_id || null,
      due_date || null,
      priority || 'medium',
      status || 'todo'
    );

    const task = db.prepare(`
      SELECT t.*,
        u1.username as assignee_name,
        u2.username as creator_name
      FROM tasks t
      LEFT JOIN users u1 ON t.assignee_id = u1.id
      LEFT JOIN users u2 ON t.creator_id = u2.id
      WHERE t.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function updateTask(req, res) {
  const { id } = req.params;
  const { title, description, assignee_id, due_date, priority, status } = req.body;

  if (title !== undefined && (typeof title !== 'string' || title.trim().length === 0)) {
    return res.status(400).json({ error: '任务标题不能为空' });
  }

  if (priority && !VALID_PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: '优先级无效' });
  }

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: '状态无效' });
  }

  try {
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: '任务不存在' });
    }

    const updates = [];
    const params = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title.trim());
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description || null);
    }
    if (assignee_id !== undefined) {
      updates.push('assignee_id = ?');
      params.push(assignee_id || null);
    }
    if (due_date !== undefined) {
      updates.push('due_date = ?');
      params.push(due_date || null);
    }
    if (priority !== undefined) {
      updates.push('priority = ?');
      params.push(priority);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const task = db.prepare(`
      SELECT t.*,
        u1.username as assignee_name,
        u2.username as creator_name
      FROM tasks t
      LEFT JOIN users u1 ON t.assignee_id = u1.id
      LEFT JOIN users u2 ON t.creator_id = u2.id
      WHERE t.id = ?
    `).get(id);

    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function deleteTask(req, res) {
  const { id } = req.params;
  try {
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: '任务不存在' });
    }

    const tx = db.transaction(() => {
      db.prepare('DELETE FROM comments WHERE task_id = ?').run(id);
      db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    });

    tx();

    res.json({ message: '任务已删除', id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function getUpcomingTasks(req, res) {
  try {
    const tasks = db.prepare(`
      SELECT t.*,
        p.name as project_name,
        u1.username as assignee_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u1 ON t.assignee_id = u1.id
      WHERE t.status != 'done'
        AND t.due_date IS NOT NULL
        AND date(t.due_date) <= date('now', '+7 days')
      ORDER BY t.due_date ASC
    `).all();
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getProjectTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  getUpcomingTasks
};

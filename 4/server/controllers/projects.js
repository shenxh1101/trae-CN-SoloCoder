const { db } = require('../database');

function getAllProjects(req, res) {
  try {
    const projects = db.prepare(`
      SELECT p.*,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status != 'done') as pending_tasks,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as total_tasks
      FROM projects p
      ORDER BY p.created_at DESC
    `).all();
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function searchProjects(req, res) {
  const { q } = req.query;
  try {
    const projects = db.prepare(`
      SELECT p.*,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status != 'done') as pending_tasks,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as total_tasks
      FROM projects p
      WHERE p.name LIKE ?
      ORDER BY p.created_at DESC
    `).all(`%${q}%`);
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function getProjectById(req, res) {
  const { id } = req.params;
  try {
    const project = db.prepare(`
      SELECT p.*,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status != 'done') as pending_tasks,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as total_tasks
      FROM projects p
      WHERE p.id = ?
    `).get(id);

    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function createProject(req, res) {
  const { name, description } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: '项目名称不能为空' });
  }

  try {
    const result = db.prepare('INSERT INTO projects (name, description) VALUES (?, ?)').run(
      name.trim(),
      description || null
    );
    const project = db.prepare(`
      SELECT p.*,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status != 'done') as pending_tasks,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as total_tasks
      FROM projects p
      WHERE p.id = ?
    `).get(result.lastInsertRowid);
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function updateProject(req, res) {
  const { id } = req.params;
  const { name, description } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: '项目名称不能为空' });
  }

  try {
    const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: '项目不存在' });
    }

    db.prepare('UPDATE projects SET name = ?, description = ? WHERE id = ?').run(
      name.trim(),
      description || null,
      id
    );

    const project = db.prepare(`
      SELECT p.*,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status != 'done') as pending_tasks,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as total_tasks
      FROM projects p
      WHERE p.id = ?
    `).get(id);
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function deleteProject(req, res) {
  const { id } = req.params;
  try {
    const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: '项目不存在' });
    }

    const tx = db.transaction(() => {
      db.prepare('DELETE FROM comments WHERE task_id IN (SELECT id FROM tasks WHERE project_id = ?)').run(id);
      db.prepare('DELETE FROM tasks WHERE project_id = ?').run(id);
      db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    });

    tx();

    res.json({ message: '项目已删除', id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getAllProjects,
  searchProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject
};

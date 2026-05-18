const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

function logActivity(operator, actionType, targetType, targetId, targetName, extra = null) {
  const stmt = db.prepare(`
    INSERT INTO activity_logs (operator, action_type, target_type, target_id, target_name, extra)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(operator, actionType, targetType, targetId, targetName, extra ? JSON.stringify(extra) : null);
}

app.get('/api/categories', (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY created_at').all();
  res.json(categories);
});

app.post('/api/categories', (req, res) => {
  const { name, operator } = req.body;
  const stmt = db.prepare('INSERT INTO categories (name) VALUES (?)');
  const result = stmt.run(name);
  logActivity(operator || '未知用户', 'create', 'category', result.lastInsertRowid, name);
  res.json({ id: result.lastInsertRowid, name });
});

app.delete('/api/categories/:id', (req, res) => {
  const { id } = req.params;
  const { operator } = req.body;
  
  const docCount = db.prepare('SELECT COUNT(*) as count FROM documents WHERE category_id = ?').get(id).count;
  if (docCount > 0) {
    return res.status(400).json({ error: '该分类下还有文档，无法删除' });
  }
  
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  logActivity(operator || '未知用户', 'delete', 'category', id, category?.name);
  res.json({ success: true });
});

app.get('/api/documents', (req, res) => {
  const { category_id, search } = req.query;
  let sql = 'SELECT d.*, c.name as category_name FROM documents d LEFT JOIN categories c ON d.category_id = c.id WHERE 1=1';
  const params = [];
  
  if (category_id) {
    sql += ' AND d.category_id = ?';
    params.push(category_id);
  }
  if (search) {
    sql += ' AND d.title LIKE ?';
    params.push(`%${search}%`);
  }
  sql += ' ORDER BY d.last_modified_at DESC';
  
  const docs = db.prepare(sql).all(...params);
  res.json(docs);
});

app.get('/api/documents/:id', (req, res) => {
  const doc = db.prepare(`
    SELECT d.*, c.name as category_name 
    FROM documents d 
    LEFT JOIN categories c ON d.category_id = c.id 
    WHERE d.id = ?
  `).get(req.params.id);
  
  if (!doc) {
    return res.status(404).json({ error: '文档不存在' });
  }
  
  const tasks = db.prepare(`
    SELECT t.* FROM tasks t
    INNER JOIN document_tasks dt ON t.id = dt.task_id
    WHERE dt.document_id = ?
  `).all(req.params.id);
  
  res.json({ ...doc, tasks });
});

app.post('/api/documents', (req, res) => {
  const { category_id, title, content, operator } = req.body;
  const stmt = db.prepare(`
    INSERT INTO documents (category_id, title, content, last_modified_by)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(category_id, title, content || '', operator || '未知用户');
  logActivity(operator || '未知用户', 'create', 'document', result.lastInsertRowid, title);
  res.json({ id: result.lastInsertRowid, title, content, category_id });
});

app.put('/api/documents/:id', (req, res) => {
  const { id } = req.params;
  const { title, content, operator } = req.body;
  
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
  if (!doc) {
    return res.status(404).json({ error: '文档不存在' });
  }
  
  db.prepare(`
    UPDATE documents 
    SET title = ?, content = ?, last_modified_at = CURRENT_TIMESTAMP, last_modified_by = ?
    WHERE id = ?
  `).run(title, content || '', operator || '未知用户', id);
  
  logActivity(operator || '未知用户', 'edit', 'document', id, title);
  res.json({ success: true });
});

app.delete('/api/documents/:id', (req, res) => {
  const { id } = req.params;
  const { operator } = req.body;
  
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
  if (!doc) {
    return res.status(404).json({ error: '文档不存在' });
  }
  
  db.prepare('DELETE FROM documents WHERE id = ?').run(id);
  logActivity(operator || '未知用户', 'delete', 'document', id, doc.title);
  res.json({ success: true });
});

app.post('/api/documents/:id/tasks', (req, res) => {
  const { id } = req.params;
  const { task_id, operator } = req.body;
  
  const existing = db.prepare('SELECT * FROM document_tasks WHERE document_id = ? AND task_id = ?').get(id, task_id);
  if (existing) {
    return res.json({ success: true, message: '已关联' });
  }
  
  db.prepare('INSERT INTO document_tasks (document_id, task_id) VALUES (?, ?)').run(id, task_id);
  
  const doc = db.prepare('SELECT title FROM documents WHERE id = ?').get(id);
  const task = db.prepare('SELECT title FROM tasks WHERE id = ?').get(task_id);
  logActivity(operator || '未知用户', 'link', 'document_task', id, `${doc?.title} ↔ ${task?.title}`);
  
  res.json({ success: true });
});

app.delete('/api/documents/:id/tasks/:taskId', (req, res) => {
  const { id, taskId } = req.params;
  const { operator } = req.body;
  
  db.prepare('DELETE FROM document_tasks WHERE document_id = ? AND task_id = ?').run(id, taskId);
  
  const doc = db.prepare('SELECT title FROM documents WHERE id = ?').get(id);
  const task = db.prepare('SELECT title FROM tasks WHERE id = ?').get(taskId);
  logActivity(operator || '未知用户', 'unlink', 'document_task', id, `${doc?.title} ↔ ${task?.title}`);
  
  res.json({ success: true });
});

app.get('/api/tasks', (req, res) => {
  const { status, assignee } = req.query;
  let sql = 'SELECT * FROM tasks WHERE 1=1';
  const params = [];
  
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (assignee) {
    sql += ' AND assignee = ?';
    params.push(assignee);
  }
  sql += ' ORDER BY created_at DESC';
  
  const tasks = db.prepare(sql).all(...params);
  
  const tasksWithDocs = tasks.map(task => {
    const docs = db.prepare(`
      SELECT d.* FROM documents d
      INNER JOIN document_tasks dt ON d.id = dt.document_id
      WHERE dt.task_id = ?
    `).all(task.id);
    return { ...task, documents: docs };
  });
  
  res.json(tasksWithDocs);
});

app.get('/api/tasks/:id', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) {
    return res.status(404).json({ error: '任务不存在' });
  }
  
  const docs = db.prepare(`
    SELECT d.* FROM documents d
    INNER JOIN document_tasks dt ON d.id = dt.document_id
    WHERE dt.task_id = ?
  `).all(req.params.id);
  
  res.json({ ...task, documents: docs });
});

app.post('/api/tasks', (req, res) => {
  const { title, description, assignee, due_date, priority, operator } = req.body;
  const stmt = db.prepare(`
    INSERT INTO tasks (title, description, assignee, due_date, priority)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(title, description || '', assignee || '', due_date || null, priority || 'medium');
  logActivity(operator || '未知用户', 'create', 'task', result.lastInsertRowid, title);
  res.json({ id: result.lastInsertRowid, title, status: 'todo' });
});

app.put('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const { title, description, assignee, due_date, priority, status, operator } = req.body;
  
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!task) {
    return res.status(404).json({ error: '任务不存在' });
  }
  
  if (task.status === 'done' && status !== 'done') {
    return res.status(400).json({ error: '已完成的任务不可修改' });
  }
  
  let completedAt = task.completed_at;
  if (status === 'done' && task.status !== 'done') {
    completedAt = new Date().toISOString();
  }
  
  db.prepare(`
    UPDATE tasks 
    SET title = ?, description = ?, assignee = ?, due_date = ?, priority = ?, status = ?, completed_at = ?
    WHERE id = ?
  `).run(title, description || '', assignee || '', due_date || null, priority || 'medium', status || task.status, completedAt, id);
  
  if (status && status !== task.status) {
    logActivity(operator || '未知用户', 'move', 'task', id, title, { from: task.status, to: status });
  } else {
    logActivity(operator || '未知用户', 'edit', 'task', id, title);
  }
  
  res.json({ success: true });
});

app.delete('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const { operator } = req.body;
  
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!task) {
    return res.status(404).json({ error: '任务不存在' });
  }
  
  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  logActivity(operator || '未知用户', 'delete', 'task', id, task.title);
  res.json({ success: true });
});

app.get('/api/activity-logs', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const logs = db.prepare(`
    SELECT * FROM activity_logs 
    ORDER BY created_at DESC 
    LIMIT ?
  `).all(limit);
  res.json(logs);
});

app.get('/api/dashboard/stats', (req, res) => {
  const docCount = db.prepare('SELECT COUNT(*) as count FROM documents').get().count;
  const taskCount = db.prepare('SELECT COUNT(*) as count FROM tasks').get().count;
  const doneCount = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'done'").get().count;
  
  const today = new Date().toISOString().split('T')[0];
  const overdueCount = db.prepare(`
    SELECT COUNT(*) as count FROM tasks 
    WHERE status != 'done' AND due_date IS NOT NULL AND due_date < ?
  `).get(today).count;
  
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const count = db.prepare(`
      SELECT COUNT(*) as count FROM tasks 
      WHERE DATE(created_at) = ?
    `).get(dateStr).count;
    last7Days.push({ date: dateStr, count });
  }
  
  const overdueTasks = db.prepare(`
    SELECT * FROM tasks 
    WHERE status != 'done' AND due_date IS NOT NULL AND due_date < ?
    ORDER BY due_date ASC
    LIMIT 5
  `).all(today);
  
  const recentDocs = db.prepare(`
    SELECT * FROM documents 
    ORDER BY last_modified_at DESC
    LIMIT 3
  `).all();
  
  res.json({
    documentCount: docCount,
    taskCount,
    doneCount,
    completionRate: taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0,
    overdueCount,
    last7Days,
    overdueTasks,
    recentDocs
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});

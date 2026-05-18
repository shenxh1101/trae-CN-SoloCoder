const { db } = require('../database');

function getAllUsers(req, res) {
  try {
    const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function createUser(req, res) {
  const { username } = req.body;
  if (!username || typeof username !== 'string' || username.trim().length === 0) {
    return res.status(400).json({ error: '用户名不能为空' });
  }

  const trimmedName = username.trim();

  try {
    const existing = db.prepare('SELECT * FROM users WHERE username = ?').get(trimmedName);
    if (existing) {
      return res.json(existing);
    }

    const result = db.prepare('INSERT INTO users (username) VALUES (?)').run(trimmedName);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function getUserById(req, res) {
  const { id } = req.params;
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getAllUsers, createUser, getUserById };

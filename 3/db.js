const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      last_modified_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_modified_by TEXT,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      assignee TEXT,
      due_date TEXT,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'todo',
      completed_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      CHECK (priority IN ('high', 'medium', 'low')),
      CHECK (status IN ('todo', 'in_progress', 'done'))
    );

    CREATE TABLE IF NOT EXISTS document_tasks (
      document_id INTEGER NOT NULL,
      task_id INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (document_id, task_id),
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operator TEXT NOT NULL,
      action_type TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id INTEGER,
      target_name TEXT,
      extra TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;
  if (categoryCount === 0) {
    const insertCategory = db.prepare('INSERT INTO categories (name) VALUES (?)');
    const cat1 = insertCategory.run('产品设计').lastInsertRowid;
    const cat2 = insertCategory.run('技术方案').lastInsertRowid;
    const cat3 = insertCategory.run('会议纪要').lastInsertRowid;

    const insertDoc = db.prepare('INSERT INTO documents (category_id, title, content, last_modified_by) VALUES (?, ?, ?, ?)');
    const doc1 = insertDoc.run(cat1, '产品需求文档V1.0', '# 产品需求文档\n\n## 产品概述\n这是我们的第一个产品版本。\n\n## 核心功能\n1. 团队文档库\n2. 任务看板\n3. 数据统计', '张三').lastInsertRowid;

    const insertTask = db.prepare('INSERT INTO tasks (title, description, assignee, due_date, priority, status) VALUES (?, ?, ?, ?, ?, ?)');
    const task1 = insertTask.run('完成用户登录模块', '实现用户登录和权限验证', '李四', '2026-05-20', 'high', 'in_progress').lastInsertRowid;
    const task2 = insertTask.run('设计数据库架构', '设计并优化数据库表结构', '王五', '2026-05-15', 'medium', 'done').lastInsertRowid;
    const task3 = insertTask.run('编写API文档', '为所有接口编写详细文档', '张三', '2026-05-10', 'low', 'todo').lastInsertRowid;

    const insertRelation = db.prepare('INSERT INTO document_tasks (document_id, task_id) VALUES (?, ?)');
    insertRelation.run(doc1, task1);
    insertRelation.run(doc1, task2);

    const insertLog = db.prepare('INSERT INTO activity_logs (operator, action_type, target_type, target_id, target_name) VALUES (?, ?, ?, ?, ?)');
    insertLog.run('系统', 'create', 'category', cat1, '产品设计');
    insertLog.run('张三', 'create', 'document', doc1, '产品需求文档V1.0');
    insertLog.run('系统', 'create', 'task', task1, '完成用户登录模块');
    insertLog.run('系统', 'create', 'task', task2, '设计数据库架构');
  }
}

initDatabase();

module.exports = db;

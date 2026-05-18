const { db } = require('../database');

function getDashboardStats(req, res) {
  try {
    const todoCount = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'todo'").get().count;
    const inProgressCount = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'in_progress'").get().count;
    const doneCount = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'done'").get().count;
    const totalProjects = db.prepare('SELECT COUNT(*) as count FROM projects').get().count;
    const totalTasks = db.prepare('SELECT COUNT(*) as count FROM tasks').get().count;

    const projectProgress = db.prepare(`
      SELECT p.id, p.name,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as total,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'done') as done
      FROM projects p
      ORDER BY p.created_at DESC
    `).all();

    const upcomingTasks = db.prepare(`
      SELECT t.*,
        p.name as project_name,
        u1.username as assignee_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u1 ON t.assignee_id = u1.id
      WHERE t.status != 'done'
        AND t.due_date IS NOT NULL
        AND date(t.due_date) <= date('now', '+7 days')
        AND date(t.due_date) >= date('now')
      ORDER BY t.due_date ASC
      LIMIT 20
    `).all();

    res.json({
      summary: {
        todo: todoCount,
        in_progress: inProgressCount,
        done: doneCount,
        total_projects: totalProjects,
        total_tasks: totalTasks
      },
      project_progress: projectProgress.map(p => ({
        ...p,
        percentage: p.total > 0 ? Math.round((p.done / p.total) * 100) : 0
      })),
      upcoming_tasks: upcomingTasks
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getDashboardStats };

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { api } from '../services/api';
import { formatDate, getDaysUntilDue } from '../utils/helpers';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const data = await api.dashboard.getStats();
      setStats(data);
    } catch (e) {
      console.error('Failed to load dashboard stats:', e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  const chartData = stats?.project_progress || [];
  const colors = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>仪表盘</h1>
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-label">未开始</div>
          <div className="stat-value status-todo">{stats?.summary?.todo || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">进行中</div>
          <div className="stat-value status-in_progress">{stats?.summary?.in_progress || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">已完成</div>
          <div className="stat-value status-done">{stats?.summary?.done || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">项目总数</div>
          <div className="stat-value">{stats?.summary?.total_projects || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">任务总数</div>
          <div className="stat-value">{stats?.summary?.total_tasks || 0}</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h2>各项目完成进度</h2>
          {chartData.length === 0 ? (
            <div className="empty-state small">
              <p>还没有项目数据</p>
            </div>
          ) : (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} />
                  <YAxis dataKey="name" type="category" width={120} />
                  <Tooltip
                    formatter={(value, name, props) => [
                      `${props.payload.done}/${props.payload.total} 已完成 (${value}%)`,
                      '完成度'
                    ]}
                  />
                  <Bar dataKey="percentage" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="dashboard-card">
          <h2>即将到期任务</h2>
          {!stats?.upcoming_tasks || stats.upcoming_tasks.length === 0 ? (
            <div className="empty-state small">
              <p>未来7天内没有即将到期的任务</p>
            </div>
          ) : (
            <div className="upcoming-tasks">
              {stats.upcoming_tasks.map(task => {
                const daysUntil = getDaysUntilDue(task.due_date);
                let urgencyClass = '';
                let urgencyText = '';

                if (daysUntil === 0) {
                  urgencyClass = 'urgency-today';
                  urgencyText = '今天到期';
                } else if (daysUntil <= 2) {
                  urgencyClass = 'urgency-soon';
                  urgencyText = `${daysUntil}天后到期`;
                } else {
                  urgencyClass = 'urgency-normal';
                  urgencyText = `${daysUntil}天后到期`;
                }

                return (
                  <div key={task.id} className="upcoming-task-item">
                    <div className="task-info">
                      <Link to={`/tasks/${task.id}`} className="task-title">
                        {task.title}
                      </Link>
                      <div className="task-meta">
                        <span className="project-tag">{task.project_name}</span>
                        {task.assignee_name && <span>指派人: {task.assignee_name}</span>}
                      </div>
                    </div>
                    <div className={`task-due ${urgencyClass}`}>
                      <span className="due-date">{formatDate(task.due_date)}</span>
                      <span className="due-text">{urgencyText}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

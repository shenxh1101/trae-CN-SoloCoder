import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { useUser } from '../contexts/UserContext';
import Modal from '../components/Modal';
import { formatDate, priorityLabels, statusLabels, getPriorityClass, getStatusClass, getDaysUntilDue } from '../utils/helpers';

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', assignee_id: '' });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignee_id: '',
    due_date: '',
    priority: 'medium',
    status: 'todo'
  });
  const [error, setError] = useState('');

  const { currentUser, users } = useUser();

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    loadTasks();
  }, [filters]);

  async function loadData() {
    try {
      const [projectData, tasksData] = await Promise.all([
        api.projects.getById(id),
        api.tasks.getByProject(id, filters)
      ]);
      setProject(projectData);
      setTasks(tasksData);
    } catch (e) {
      console.error('Failed to load project:', e);
    } finally {
      setLoading(false);
    }
  }

  async function loadTasks() {
    try {
      const data = await api.tasks.getByProject(id, filters);
      setTasks(data);
    } catch (e) {
      console.error('Failed to load tasks:', e);
    }
  }

  function openCreateModal() {
    setEditingTask(null);
    setFormData({
      title: '',
      description: '',
      assignee_id: '',
      due_date: '',
      priority: 'medium',
      status: 'todo'
    });
    setError('');
    setShowCreateModal(true);
  }

  function openEditModal(task) {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      assignee_id: task.assignee_id || '',
      due_date: task.due_date || '',
      priority: task.priority,
      status: task.status
    });
    setError('');
    setShowCreateModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!formData.title.trim()) {
      setError('任务标题不能为空');
      return;
    }

    try {
      const submitData = {
        ...formData,
        assignee_id: formData.assignee_id || null,
        creator_id: currentUser?.id || null
      };

      if (editingTask) {
        await api.tasks.update(editingTask.id, submitData);
      } else {
        await api.tasks.create(id, submitData);
      }

      setShowCreateModal(false);
      loadData();
    } catch (e) {
      setError(e.message || '保存失败');
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return;

    try {
      await api.tasks.delete(deleteConfirm.id);
      setDeleteConfirm(null);
      loadData();
    } catch (e) {
      console.error('Failed to delete task:', e);
    }
  }

  async function handleStatusChange(taskId, newStatus) {
    try {
      await api.tasks.update(taskId, { status: newStatus });
      loadData();
    } catch (e) {
      console.error('Failed to update status:', e);
    }
  }

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (!project) {
    return <div className="empty-state">项目不存在</div>;
  }

  return (
    <div className="project-detail">
      <div className="page-header">
        <div>
          <Link to="/projects" className="back-link">← 返回项目列表</Link>
          <h1>{project.name}</h1>
          {project.description && <p className="project-desc">{project.description}</p>}
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>+ 新建任务</button>
      </div>

      <div className="filters-bar">
        <div className="filter-group">
          <label>状态：</label>
          <select
            className="form-control"
            value={filters.status}
            onChange={e => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">全部</option>
            <option value="todo">未开始</option>
            <option value="in_progress">进行中</option>
            <option value="done">已完成</option>
          </select>
        </div>
        <div className="filter-group">
          <label>指派人：</label>
          <select
            className="form-control"
            value={filters.assignee_id}
            onChange={e => setFilters({ ...filters, assignee_id: e.target.value })}
          >
            <option value="">全部</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.username}</option>
            ))}
          </select>
        </div>
        <div className="tasks-count">
          共 <strong>{tasks.length}</strong> 个任务
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="empty-state">
          <p>该项目还没有任务，点击上方按钮创建第一个任务吧！</p>
        </div>
      ) : (
        <div className="tasks-list">
          {tasks.map(task => {
            const daysUntil = getDaysUntilDue(task.due_date);
            const isOverdue = daysUntil !== null && daysUntil < 0 && task.status !== 'done';

            return (
              <div key={task.id} className="task-card">
                <div className="task-card-header">
                  <Link to={`/tasks/${task.id}`} className="task-title">{task.title}</Link>
                  <div className="task-actions">
                    <span className={`priority-badge ${getPriorityClass(task.priority)}`}>
                      {priorityLabels[task.priority]}
                    </span>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(task)}>编辑</button>
                    <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(task)}>删除</button>
                  </div>
                </div>
                {task.description && <p className="task-desc">{task.description}</p>}
                <div className="task-meta">
                  <span className={`status-badge ${getStatusClass(task.status)}`}>
                    {statusLabels[task.status]}
                  </span>
                  {task.assignee_name && <span>指派人：{task.assignee_name}</span>}
                  {task.due_date && (
                    <span className={isOverdue ? 'overdue' : ''}>
                      截止：{formatDate(task.due_date)}
                      {isOverdue && <span className="text-danger">（已逾期）</span>}
                    </span>
                  )}
                </div>
                <div className="task-status-actions">
                  {task.status !== 'todo' && (
                    <button className="btn btn-sm" onClick={() => handleStatusChange(task.id, 'todo')}>
                      标记未开始
                    </button>
                  )}
                  {task.status !== 'in_progress' && (
                    <button className="btn btn-sm btn-primary" onClick={() => handleStatusChange(task.id, 'in_progress')}>
                      开始进行
                    </button>
                  )}
                  {task.status !== 'done' && (
                    <button className="btn btn-sm btn-success" onClick={() => handleStatusChange(task.id, 'done')}>
                      标记完成
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={editingTask ? '编辑任务' : '新建任务'}
        onConfirm={handleSubmit}
        confirmText={editingTask ? '保存' : '创建'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>标题 *</label>
            <input
              type="text"
              className="form-control"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>描述</label>
            <textarea
              className="form-control"
              rows={3}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>指派人</label>
              <select
                className="form-control"
                value={formData.assignee_id}
                onChange={e => setFormData({ ...formData, assignee_id: e.target.value })}
              >
                <option value="">未分配</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.username}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>截止日期</label>
              <input
                type="date"
                className="form-control"
                value={formData.due_date}
                onChange={e => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>优先级</label>
              <select
                className="form-control"
                value={formData.priority}
                onChange={e => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
            </div>
            <div className="form-group">
              <label>状态</label>
              <select
                className="form-control"
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="todo">未开始</option>
                <option value="in_progress">进行中</option>
                <option value="done">已完成</option>
              </select>
            </div>
          </div>
          {error && <div className="alert alert-error">{error}</div>}
        </form>
      </Modal>

      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="确认删除"
        onConfirm={handleDelete}
        confirmText="删除"
        confirmDanger
      >
        <p>确定要删除任务 <strong>"{deleteConfirm?.title}"</strong> 吗？</p>
        <p className="text-danger">此操作将同时删除该任务下的所有评论，且无法恢复。</p>
      </Modal>
    </div>
  );
}

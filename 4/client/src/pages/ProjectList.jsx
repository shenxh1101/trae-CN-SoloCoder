import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useUser } from '../contexts/UserContext';
import Modal from '../components/Modal';
import { formatDate } from '../utils/helpers';

export default function ProjectList() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [error, setError] = useState('');

  const { currentUser } = useUser();

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        searchProjects();
      } else {
        loadProjects();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function loadProjects() {
    try {
      const data = await api.projects.getAll();
      setProjects(data);
    } catch (e) {
      console.error('Failed to load projects:', e);
    } finally {
      setLoading(false);
    }
  }

  async function searchProjects() {
    try {
      const data = await api.projects.search(searchQuery.trim());
      setProjects(data);
    } catch (e) {
      console.error('Failed to search projects:', e);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError('');

    if (!newProject.name.trim()) {
      setError('项目名称不能为空');
      return;
    }

    try {
      const project = await api.projects.create(newProject);
      setProjects([project, ...projects]);
      setNewProject({ name: '', description: '' });
      setShowCreateModal(false);
    } catch (e) {
      setError(e.message || '创建失败');
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return;

    try {
      await api.projects.delete(deleteConfirm.id);
      setProjects(projects.filter(p => p.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (e) {
      console.error('Failed to delete project:', e);
    }
  }

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="project-list">
      <div className="page-header">
        <h1>项目列表</h1>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          + 新建项目
        </button>
      </div>

      <div className="search-bar">
        <input
          type="text"
          className="form-control"
          placeholder="搜索项目名称..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {projects.length === 0 ? (
        <div className="empty-state">
          <p>{searchQuery ? '没有找到匹配的项目' : '还没有项目，点击上方按钮创建第一个项目吧！'}</p>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map(project => (
            <div key={project.id} className="project-card">
              <div className="project-card-header">
                <Link to={`/projects/${project.id}`} className="project-title">
                  {project.name}
                </Link>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => setDeleteConfirm(project)}
                >
                  删除
                </button>
              </div>
              {project.description && (
                <p className="project-desc">{project.description}</p>
              )}
              <div className="project-meta">
                <span>创建于 {formatDate(project.created_at)}</span>
                <span className={`task-count ${project.pending_tasks > 0 ? 'has-pending' : ''}`}>
                  {project.pending_tasks} 个待完成
                </span>
              </div>
              <div className="project-progress">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: project.total_tasks > 0 ? `${(project.total_tasks - project.pending_tasks) / project.total_tasks * 100}%` : '0%' }}
                  />
                </div>
                <span className="progress-text">
                  {project.total_tasks - project.pending_tasks}/{project.total_tasks} 已完成
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="新建项目"
        onConfirm={handleCreate}
        confirmText="创建"
      >
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label>项目名称 *</label>
            <input
              type="text"
              className="form-control"
              value={newProject.name}
              onChange={e => setNewProject({ ...newProject, name: e.target.value })}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>项目描述</label>
            <textarea
              className="form-control"
              rows={3}
              value={newProject.description}
              onChange={e => setNewProject({ ...newProject, description: e.target.value })}
            />
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
        <p>确定要删除项目 <strong>"{deleteConfirm?.name}"</strong> 吗？</p>
        <p className="text-danger">此操作将同时删除该项目下的所有任务和评论，且无法恢复。</p>
      </Modal>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { useUser } from '../contexts/UserContext';
import Modal from '../components/Modal';
import { formatDate, formatDateTime, priorityLabels, statusLabels, getPriorityClass, getStatusClass } from '../utils/helpers';

export default function TaskDetail() {
  const { id } = useParams();
  const [task, setTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [deleteCommentConfirm, setDeleteCommentConfirm] = useState(null);
  const [deleteTaskConfirm, setDeleteTaskConfirm] = useState(false);
  const [error, setError] = useState('');

  const { currentUser } = useUser();

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      const [taskData, commentsData] = await Promise.all([
        api.tasks.getById(id),
        api.comments.getByTask(id)
      ]);
      setTask(taskData);
      setComments(commentsData);
    } catch (e) {
      console.error('Failed to load task:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddComment(e) {
    e.preventDefault();
    setError('');

    if (!commentText.trim()) {
      setError('评论内容不能为空');
      return;
    }

    if (!currentUser) {
      setError('请先设置当前用户');
      return;
    }

    try {
      await api.comments.create(id, {
        user_id: currentUser.id,
        content: commentText.trim()
      });
      setCommentText('');
      loadData();
    } catch (e) {
      setError(e.message || '评论失败');
    }
  }

  async function handleDeleteComment() {
    if (!deleteCommentConfirm) return;

    try {
      await api.comments.delete(deleteCommentConfirm.id);
      setDeleteCommentConfirm(null);
      loadData();
    } catch (e) {
      console.error('Failed to delete comment:', e);
    }
  }

  async function handleDeleteTask() {
    if (!task) return;

    try {
      await api.tasks.delete(task.id);
      window.location.href = `/projects/${task.project_id}`;
    } catch (e) {
      console.error('Failed to delete task:', e);
    }
  }

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (!task) {
    return <div className="empty-state">任务不存在</div>;
  }

  return (
    <div className="task-detail">
      <div className="page-header">
        <div>
          <Link to={`/projects/${task.project_id}`} className="back-link">← 返回项目</Link>
          <h1>{task.title}</h1>
        </div>
        <button className="btn btn-danger" onClick={() => setDeleteTaskConfirm(true)}>删除任务</button>
      </div>

      <div className="task-info-card">
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">所属项目</span>
            <Link to={`/projects/${task.project_id}`} className="info-value link">
              {task.project_name}
            </Link>
          </div>
          <div className="info-item">
            <span className="info-label">状态</span>
            <span className={`status-badge ${getStatusClass(task.status)}`}>
              {statusLabels[task.status]}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">优先级</span>
            <span className={`priority-badge ${getPriorityClass(task.priority)}`}>
              {priorityLabels[task.priority]}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">截止日期</span>
            <span className="info-value">{formatDate(task.due_date)}</span>
          </div>
          <div className="info-item">
            <span className="info-label">指派人</span>
            <span className="info-value">{task.assignee_name || '未分配'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">创建人</span>
            <span className="info-value">{task.creator_name || '未知'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">创建时间</span>
            <span className="info-value">{formatDateTime(task.created_at)}</span>
          </div>
          <div className="info-item">
            <span className="info-label">更新时间</span>
            <span className="info-value">{formatDateTime(task.updated_at)}</span>
          </div>
        </div>
        {task.description && (
          <div className="task-description">
            <h3>任务描述</h3>
            <p>{task.description}</p>
          </div>
        )}
      </div>

      <div className="comments-section">
        <h2>评论 ({comments.length})</h2>

        <form className="comment-form" onSubmit={handleAddComment}>
          <div className="form-group">
            <textarea
              className="form-control"
              rows={3}
              placeholder={currentUser ? '写下你的评论...' : '请先设置当前用户才能发表评论'}
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              disabled={!currentUser}
            />
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          <button type="submit" className="btn btn-primary" disabled={!currentUser}>
            发表评论
          </button>
        </form>

        {comments.length === 0 ? (
          <div className="empty-state small">
            <p>还没有评论，来发表第一条评论吧！</p>
          </div>
        ) : (
          <div className="comments-list">
            {comments.map(comment => (
              <div key={comment.id} className="comment-item">
                <div className="comment-header">
                  <span className="comment-author">{comment.user_name}</span>
                  <span className="comment-time">{formatDateTime(comment.created_at)}</span>
                  {currentUser && currentUser.id === comment.user_id && (
                    <button
                      className="btn btn-danger btn-xs"
                      onClick={() => setDeleteCommentConfirm(comment)}
                    >
                      删除
                    </button>
                  )}
                </div>
                <div className="comment-content">{comment.content}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={!!deleteCommentConfirm}
        onClose={() => setDeleteCommentConfirm(null)}
        title="确认删除"
        onConfirm={handleDeleteComment}
        confirmText="删除"
        confirmDanger
      >
        <p>确定要删除这条评论吗？此操作无法恢复。</p>
      </Modal>

      <Modal
        isOpen={deleteTaskConfirm}
        onClose={() => setDeleteTaskConfirm(false)}
        title="确认删除"
        onConfirm={handleDeleteTask}
        confirmText="删除"
        confirmDanger
      >
        <p>确定要删除任务 <strong>"{task.title}"</strong> 吗？</p>
        <p className="text-danger">此操作将同时删除该任务下的所有评论，且无法恢复。</p>
      </Modal>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../lib/api';
import Modal from '../components/Modal';
import TaskForm from '../components/TaskForm';
import type { Task, Comment, Subtask, Attachment, ActivityLog } from '../types';

const fieldLabels: Record<string, string> = {
  title: '标题',
  description: '描述',
  status: '状态',
  priority: '优先级',
  dueDate: '截止日期',
  assigneeId: '指派人',
  taskListId: '任务列表',
};

const priorityLabels: Record<string, string> = {
  HIGH: '高',
  MEDIUM: '中',
  LOW: '低',
};

const priorityColors: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-700 border-red-200',
  MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  LOW: 'bg-green-100 text-green-700 border-green-200',
};

const statusLabels: Record<string, string> = {
  TODO: '待处理',
  IN_PROGRESS: '进行中',
  REVIEW: '待审核',
  DONE: '已完成',
};

const statusColors: Record<string, string> = {
  TODO: 'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  REVIEW: 'bg-purple-100 text-purple-700',
  DONE: 'bg-green-100 text-green-700',
};

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [comment, setComment] = useState('');
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [activeTab, setActiveTab] = useState<'comments' | 'activity'>('comments');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTask();
  }, [id]);

  const fetchTask = async () => {
    try {
      const response = await api.get(`/tasks/${id}`);
      setTask(response.data);
    } catch (error) {
      console.error('获取任务详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    try {
      await api.post('/comments', {
        content: comment,
        taskId: id,
      });
      setComment('');
      fetchTask();
    } catch (error) {
      console.error('添加评论失败');
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subtaskTitle.trim()) return;

    try {
      await api.post(`/tasks/${id}/subtasks`, {
        title: subtaskTitle,
      });
      setSubtaskTitle('');
      fetchTask();
    } catch (error) {
      console.error('添加子任务失败');
    }
  };

  const handleToggleSubtask = async (subtask: Subtask) => {
    try {
      await api.put(`/tasks/subtasks/${subtask.id}`, {
        title: subtask.title,
        completed: !subtask.completed,
      });
      fetchTask();
    } catch (error) {
      console.error('更新子任务失败');
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!confirm('确定要删除这个子任务吗？')) return;
    try {
      await api.delete(`/tasks/subtasks/${subtaskId}`);
      fetchTask();
    } catch (error) {
      console.error('删除子任务失败');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post(`/attachments/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      fetchTask();
    } catch (error) {
      console.error('上传附件失败');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownloadAttachment = (attachmentId: string) => {
    window.open(`/api/attachments/${attachmentId}/download`);
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!confirm('确定要删除这个附件吗？')) return;
    try {
      await api.delete(`/attachments/${attachmentId}`);
      fetchTask();
    } catch (error) {
      console.error('删除附件失败');
    }
  };

  const formatFieldValue = (field: string, value: string | null | undefined) => {
    if (!value) return '未设置';
    if (field === 'priority') return priorityLabels[value] || value;
    if (field === 'status') return statusLabels[value] || value;
    if (field === 'dueDate') return format(new Date(value), 'yyyy-MM-dd HH:mm');
    return value;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!task) {
    return <div className="text-center py-20 text-gray-500">任务不存在</div>;
  }

  const completedSubtasks = task.subtasks.filter((s) => s.completed).length;
  const totalSubtasks = task.subtasks.length;

  return (
    <div className="max-w-5xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 text-gray-600 hover:text-gray-900 flex items-center"
      >
        ← 返回
      </button>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-2 py-1 rounded text-xs ${statusColors[task.status]}`}>
                {statusLabels[task.status]}
              </span>
              <span className={`px-2 py-1 rounded text-xs border ${priorityColors[task.priority]}`}>
                {priorityLabels[task.priority]}优先级
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
            <p className="text-sm text-gray-500 mt-1">
              所属项目:{' '}
              <Link to={`/projects/${task.projectId}`} className="text-blue-600 hover:underline">
                {task.project?.name}
              </Link>
            </p>
          </div>
          <button
            onClick={() => setShowEditModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
          >
            编辑任务
          </button>
        </div>

        {task.description && (
          <div className="prose max-w-none mb-6">
            <p className="text-gray-700 whitespace-pre-wrap">{task.description}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">创建人</p>
            <div className="flex items-center mt-2">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                {task.creator?.username?.charAt(0).toUpperCase()}
              </div>
              <span className="ml-2 font-medium">{task.creator?.username}</span>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">指派人</p>
            {task.assignee ? (
              <div className="flex items-center mt-2">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs">
                  {task.assignee.username?.charAt(0).toUpperCase()}
                </div>
                <span className="ml-2 font-medium">{task.assignee.username}</span>
              </div>
            ) : (
              <p className="text-gray-400 mt-2">未指派</p>
            )}
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">截止日期</p>
            <p className={`font-medium mt-2 ${task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE' ? 'text-red-600' : 'text-gray-900'}`}>
              {task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd HH:mm') : '未设置'}
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">子任务进度</p>
            <p className="font-medium mt-2">
              {completedSubtasks}/{totalSubtasks}
              {totalSubtasks > 0 && (
                <span className="text-gray-500 ml-2">
                  ({Math.round((completedSubtasks / totalSubtasks) * 100)}%)
                </span>
              )}
            </p>
          </div>
        </div>

        {task.tags.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">标签</h3>
            <div className="flex flex-wrap gap-2">
              {task.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="px-3 py-1 rounded-full text-sm"
                  style={{ backgroundColor: tag.color + '20', color: tag.color }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">子任务</h3>
            <form onSubmit={handleAddSubtask} className="flex gap-2 mb-4">
              <input
                type="text"
                value={subtaskTitle}
                onChange={(e) => setSubtaskTitle(e.target.value)}
                placeholder="添加子任务..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                添加
              </button>
            </form>
            <div className="space-y-2">
              {task.subtasks.length === 0 ? (
                <p className="text-gray-500 text-center py-4">暂无子任务</p>
              ) : (
                task.subtasks.map((subtask) => (
                  <div
                    key={subtask.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg group"
                  >
                    <input
                      type="checkbox"
                      checked={subtask.completed}
                      onChange={() => handleToggleSubtask(subtask)}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span
                      className={`flex-1 ${
                        subtask.completed ? 'line-through text-gray-400' : 'text-gray-700'
                      }`}
                    >
                      {subtask.title}
                    </span>
                    <button
                      onClick={() => handleDeleteSubtask(subtask.id)}
                      className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition"
                    >
                      🗑️
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200">
            <div className="border-b border-gray-200">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('comments')}
                  className={`px-6 py-3 font-medium text-sm ${
                    activeTab === 'comments'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  评论 ({task.comments.length})
                </button>
                <button
                  onClick={() => setActiveTab('activity')}
                  className={`px-6 py-3 font-medium text-sm ${
                    activeTab === 'activity'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  操作日志 ({task.activityLogs.length})
                </button>
              </div>
            </div>

            <div className="p-6">
              {activeTab === 'comments' ? (
                <>
                  <form onSubmit={handleAddComment} className="mb-6">
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                      placeholder="添加评论... 支持 @用户名 来提及团队成员"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        type="submit"
                        disabled={!comment.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        发表评论
                      </button>
                    </div>
                  </form>

                  <div className="space-y-4">
                    {task.comments.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">暂无评论</p>
                    ) : (
                      task.comments.map((comment: Comment) => (
                        <div key={comment.id} className="flex gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm flex-shrink-0">
                            {comment.author.username?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {comment.author.username}
                              </span>
                              <span className="text-xs text-gray-500">
                                {format(new Date(comment.createdAt), 'yyyy-MM-dd HH:mm')}
                              </span>
                            </div>
                            <p className="text-gray-700 mt-1 whitespace-pre-wrap">
                              {comment.content}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  {task.activityLogs.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">暂无操作日志</p>
                  ) : (
                    task.activityLogs.map((log: ActivityLog) => (
                      <div key={log.id} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xs flex-shrink-0">
                          {log.user.username?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {log.user.username}
                            </span>
                            <span className="text-xs text-gray-500">
                              {format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm')}
                            </span>
                          </div>
                          <p className="text-gray-700 mt-1">
                            修改了{' '}
                            <span className="font-medium">{fieldLabels[log.field] || log.field}</span>
                            {' '}从{' '}
                            <span className="text-red-600">
                              {formatFieldValue(log.field, log.oldValue)}
                            </span>
                            {' '}改为{' '}
                            <span className="text-green-600">
                              {formatFieldValue(log.field, log.newValue)}
                            </span>
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">附件</h3>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                + 上传
              </button>
            </div>
            {task.attachments.length === 0 ? (
              <p className="text-gray-500 text-center py-4 text-sm">暂无附件</p>
            ) : (
              <div className="space-y-2">
                {task.attachments.map((attachment: Attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg group"
                  >
                    <span className="text-2xl">📎</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {attachment.filename}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(attachment.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      onClick={() => handleDownloadAttachment(attachment.id)}
                      className="text-blue-600 hover:text-blue-700 p-1"
                    >
                      ⬇️
                    </button>
                    <button
                      onClick={() => handleDeleteAttachment(attachment.id)}
                      className="text-gray-400 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="编辑任务"
        size="lg"
      >
        <TaskForm
          taskListId={task.taskListId}
          projectId={task.projectId}
          editTask={task}
          onSuccess={() => {
            setShowEditModal(false);
            fetchTask();
          }}
          onCancel={() => setShowEditModal(false)}
        />
      </Modal>
    </div>
  );
}

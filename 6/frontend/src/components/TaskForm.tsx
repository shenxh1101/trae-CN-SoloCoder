import { useState, useEffect } from 'react';
import api from '../lib/api';
import type { Task, TaskPriority, User } from '../types';

interface Props {
  taskListId: string;
  projectId: string;
  onSuccess: () => void;
  onCancel: () => void;
  editTask?: Task | null;
}

export default function TaskForm({ taskListId, projectId, onSuccess, onCancel, editTask }: Props) {
  const [title, setTitle] = useState(editTask?.title || '');
  const [description, setDescription] = useState(editTask?.description || '');
  const [priority, setPriority] = useState<TaskPriority>(editTask?.priority || 'MEDIUM');
  const [dueDate, setDueDate] = useState(
    editTask?.dueDate ? new Date(editTask.dueDate).toISOString().split('T')[0] : ''
  );
  const [assigneeId, setAssigneeId] = useState(editTask?.assigneeId || '');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<{ name: string; color: string }[]>(
    (editTask?.tags.map((t) => ({ name: t.name, color: t.color }))) || []
  );
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const tagColors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const response = await api.get('/auth/team-members');
      setMembers(response.data);
    } catch (error) {
      console.error('获取团队成员失败');
    }
  };

  const addTag = () => {
    if (!tagInput.trim() || tags.find((t) => t.name === tagInput.trim())) return;
    setTags([
      ...tags,
      {
        name: tagInput.trim(),
        color: tagColors[tags.length % tagColors.length],
      },
    ]);
    setTagInput('');
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        title,
        description,
        priority,
        dueDate: dueDate || undefined,
        taskListId,
        projectId,
        assigneeId: assigneeId || undefined,
        tags,
      };

      if (editTask) {
        await api.put(`/tasks/${editTask.id}`, data);
      } else {
        await api.post('/tasks', data);
      }

      onSuccess();
    } catch (error) {
      console.error('保存任务失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          标题 *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          描述
        </label>
        <textarea
          value={description as string}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          placeholder="支持 @用户名 来提及团队成员"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            优先级
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="LOW">低</option>
            <option value="MEDIUM">中</option>
            <option value="HIGH">高</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            截止日期
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          指派人
        </label>
        <select
          value={assigneeId as string}
          onChange={(e) => setAssigneeId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">未指派</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.username}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          标签
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            placeholder="输入标签后按回车"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={addTag}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            添加
          </button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {tags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs"
              style={{ backgroundColor: tag.color + '20', color: tag.color }}
            >
              {tag.name}
              <button
                type="button"
                onClick={() => removeTag(index)}
                className="ml-1 hover:opacity-70"
              >
                ×
              </button>
            </span>
          ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '保存中...' : editTask ? '保存修改' : '创建任务'}
        </button>
      </div>
    </form>
  );
}

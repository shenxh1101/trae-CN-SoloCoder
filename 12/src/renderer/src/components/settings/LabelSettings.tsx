import React, { useState } from 'react';
import { useStore } from '../../store';
import Button from '../ui/Button';
import type { EmailLabel } from '@shared/types';

declare global {
  interface Window {
    api: any;
  }
}

const colors = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#78716c', '#6b7280', '#4b5563'
];

const LabelSettings: React.FC = () => {
  const { labels, addLabel, updateLabel, removeLabel, refreshData } = useStore();
  const [editingLabel, setEditingLabel] = useState<EmailLabel | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLabel, setNewLabel] = useState({
    name: '',
    color: '#3b82f6',
    parentId: undefined as string | undefined
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateLabelName = (name: string, excludeId?: string): boolean => {
    if (!name.trim()) {
      setErrors({ name: '请输入标签名称' });
      return false;
    }
    if (labels.some(l => l.name.toLowerCase() === name.toLowerCase().trim() && l.id !== excludeId)) {
      setErrors({ name: '标签名称已存在' });
      return false;
    }
    if (name.length > 50) {
      setErrors({ name: '标签名称不能超过50个字符' });
      return false;
    }
    setErrors({});
    return true;
  };

  const handleCreateLabel = async () => {
    if (!validateLabelName(newLabel.name)) return;

    try {
      const label = await window.api.label.create({
        name: newLabel.name.trim(),
        color: newLabel.color,
        parentId: newLabel.parentId,
        sortOrder: labels.length
      });
      addLabel(label);
      setShowCreateModal(false);
      setNewLabel({ name: '', color: '#3b82f6', parentId: undefined });
    } catch (error) {
      console.error('Failed to create label:', error);
    }
  };

  const handleUpdateLabel = async () => {
    if (!editingLabel) return;
    if (!validateLabelName(editingLabel.name, editingLabel.id)) return;

    try {
      const updated = await window.api.label.update(editingLabel.id, {
        name: editingLabel.name.trim(),
        color: editingLabel.color,
        parentId: editingLabel.parentId
      });
      updateLabel(updated);
      setEditingLabel(null);
    } catch (error) {
      console.error('Failed to update label:', error);
    }
  };

  const handleDeleteLabel = async (id: string) => {
    const label = labels.find(l => l.id === id);
    const hasChildren = labels.some(l => l.parentId === id);
    
    let message = `确定要删除标签"${label?.name}"吗？`;
    if (hasChildren) {
      message += '\n\n该标签有子标签，删除后子标签也将被删除。';
    }
    
    if (!confirm(message)) return;

    try {
      await window.api.label.delete(id);
      removeLabel(id);
    } catch (error) {
      console.error('Failed to delete label:', error);
    }
  };

  const handleMoveUp = async (label: EmailLabel) => {
    const siblings = labels.filter(l => l.parentId === label.parentId).sort((a, b) => a.sortOrder - b.sortOrder);
    const currentIndex = siblings.findIndex(l => l.id === label.id);
    if (currentIndex <= 0) return;

    const prevSibling = siblings[currentIndex - 1];
    try {
      await Promise.all([
        window.api.label.update(label.id, { sortOrder: prevSibling.sortOrder }),
        window.api.label.update(prevSibling.id, { sortOrder: label.sortOrder })
      ]);
      await refreshData();
    } catch (error) {
      console.error('Failed to reorder labels:', error);
    }
  };

  const handleMoveDown = async (label: EmailLabel) => {
    const siblings = labels.filter(l => l.parentId === label.parentId).sort((a, b) => a.sortOrder - b.sortOrder);
    const currentIndex = siblings.findIndex(l => l.id === label.id);
    if (currentIndex >= siblings.length - 1) return;

    const nextSibling = siblings[currentIndex + 1];
    try {
      await Promise.all([
        window.api.label.update(label.id, { sortOrder: nextSibling.sortOrder }),
        window.api.label.update(nextSibling.id, { sortOrder: label.sortOrder })
      ]);
      await refreshData();
    } catch (error) {
      console.error('Failed to reorder labels:', error);
    }
  };

  const getChildLabels = (parentId?: string) => {
    return labels.filter(l => l.parentId === parentId).sort((a, b) => a.sortOrder - b.sortOrder);
  };

  const getEmailCount = async (labelId: string): Promise<number> => {
    try {
      const result = await window.api.search.query({
        query: '',
        labelIds: [labelId],
        highlightKeywords: false
      });
      return result.total;
    } catch {
      return 0;
    }
  };

  const renderLabelTree = (parentId?: string, level = 0) => {
    const children = getChildLabels(parentId);
    return children.map(label => (
      <div key={label.id}>
        <div
          className={`
            flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-800 mb-2
            ${editingLabel?.id === label.id ? 'bg-primary-50 dark:bg-primary-900/20' : 'bg-white dark:bg-gray-900'}
          `}
          style={{ marginLeft: `${level * 24}px` }}
        >
          {editingLabel?.id === label.id ? (
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex gap-1">
                  {colors.slice(0, 10).map(color => (
                    <button
                      key={color}
                      onClick={() => setEditingLabel({ ...editingLabel, color })}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${
                        editingLabel.color === color ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <input
                  type="text"
                  value={editingLabel.name}
                  onChange={(e) => setEditingLabel({ ...editingLabel, name: e.target.value })}
                  className={`flex-1 px-3 py-2 bg-white dark:bg-gray-800 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.name ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
                  autoFocus
                />
                <select
                  value={editingLabel.parentId || ''}
                  onChange={(e) => setEditingLabel({ ...editingLabel, parentId: e.target.value || undefined })}
                  className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">无父标签</option>
                  {labels.filter(l => l.id !== label.id).map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
              {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => { setEditingLabel(null); setErrors({}); }}>
                  取消
                </Button>
                <Button size="sm" onClick={handleUpdateLabel}>保存</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: label.color }}
                />
                <span className="font-medium text-gray-900 dark:text-white">{label.name}</span>
                {label.parentId && (
                  <span className="text-xs text-gray-400">
                    子标签: {labels.find(l => l.id === label.parentId)?.name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => handleMoveUp(label)} title="上移">
                  ↑
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleMoveDown(label)} title="下移">
                  ↓
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingLabel(label)}>
                  编辑
                </Button>
                <Button size="sm" variant="danger" onClick={() => handleDeleteLabel(label.id)}>
                  删除
                </Button>
              </div>
            </>
          )}
        </div>
        {renderLabelTree(label.id, level + 1)}
      </div>
    ));
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">🏷️ 标签管理</h2>
          <p className="text-gray-500 dark:text-gray-400">创建和管理邮件标签，支持多级分类</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          + 创建标签
        </Button>
      </div>

      {labels.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
          <div className="text-6xl mb-4">🏷️</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">暂无标签</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">创建您的第一个标签来组织邮件</p>
          <Button onClick={() => setShowCreateModal(true)}>
            + 创建标签
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {renderLabelTree()}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">创建新标签</h3>
              <Button variant="ghost" size="icon" onClick={() => { setShowCreateModal(false); setErrors({}); }}>
                ✕
              </Button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  选择颜色
                </label>
                <div className="flex flex-wrap gap-2">
                  {colors.map(color => (
                    <button
                      key={color}
                      onClick={() => setNewLabel(prev => ({ ...prev, color }))}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        newLabel.color === color ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  标签名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newLabel.name}
                  onChange={(e) => setNewLabel(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="输入标签名称"
                  className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.name ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
                />
                {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  父标签
                </label>
                <select
                  value={newLabel.parentId || ''}
                  onChange={(e) => setNewLabel(prev => ({ ...prev, parentId: e.target.value || undefined }))}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">无（作为顶级标签）</option>
                  {labels.map(label => (
                    <option key={label.id} value={label.id}>{label.name}</option>
                  ))}
                </select>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">预览</h4>
                <div className="flex items-center gap-2">
                  <span
                    className="px-3 py-1 text-sm rounded-full text-white"
                    style={{ backgroundColor: newLabel.color }}
                  >
                    {newLabel.name || '标签名称'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => { setShowCreateModal(false); setErrors({}); }}>
                取消
              </Button>
              <Button onClick={handleCreateLabel}>
                创建标签
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabelSettings;

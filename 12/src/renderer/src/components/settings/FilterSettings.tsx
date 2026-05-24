import React, { useState } from 'react';
import { useStore } from '../../store';
import Button from '../ui/Button';
import type { FilterRule, FilterCondition, FilterAction } from '@shared/types';

declare global {
  interface Window {
    api: any;
  }
}

const conditionFields: { value: FilterCondition['field']; label: string }[] = [
  { value: 'from', label: '发件人' },
  { value: 'to', label: '收件人' },
  { value: 'subject', label: '主题' },
  { value: 'body', label: '邮件内容' },
  { value: 'date', label: '日期' },
  { value: 'hasAttachment', label: '有附件' },
  { value: 'size', label: '邮件大小' },
  { value: 'label', label: '标签' },
];

const conditionOperators: { value: FilterCondition['operator']; label: string }[] = [
  { value: 'equals', label: '等于' },
  { value: 'contains', label: '包含' },
  { value: 'startsWith', label: '开头是' },
  { value: 'endsWith', label: '结尾是' },
  { value: 'greaterThan', label: '大于' },
  { value: 'lessThan', label: '小于' },
  { value: 'is', label: '是' },
  { value: 'isNot', label: '不是' },
];

const actionTypes: { value: FilterAction['type']; label: string }[] = [
  { value: 'move', label: '移动到文件夹' },
  { value: 'copy', label: '复制到文件夹' },
  { value: 'delete', label: '删除邮件' },
  { value: 'markRead', label: '标记为已读' },
  { value: 'markUnread', label: '标记为未读' },
  { value: 'star', label: '添加星标' },
  { value: 'addLabel', label: '添加标签' },
  { value: 'removeLabel', label: '移除标签' },
  { value: 'forward', label: '转发邮件' },
  { value: 'reply', label: '自动回复' },
  { value: 'markForwarded', label: '标记为已转发' },
  { value: 'markAnswered', label: '标记为已回复' },
];

const FilterSettings: React.FC = () => {
  const { filters, accounts, folders, labels, addFilter, updateFilter, removeFilter, refreshData } = useStore();
  const [editingFilter, setEditingFilter] = useState<FilterRule | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [testEmailId, setTestEmailId] = useState('');
  const [testResult, setTestResult] = useState<{ filterId: string; success: boolean; matched: boolean } | null>(null);
  const [runningFilter, setRunningFilter] = useState<string | null>(null);

  const defaultFilter: Omit<FilterRule, 'id' | 'createdAt' | 'updatedAt'> = {
    name: '',
    enabled: true,
    priority: 0,
    conditions: [{ field: 'subject', operator: 'contains', value: '' }],
    actions: [{ type: 'addLabel', params: {} }],
    matchType: 'all',
    accountIds: [],
    folderIds: [],
  };

  const [newFilter, setNewFilter] = useState<Omit<FilterRule, 'id' | 'createdAt' | 'updatedAt'>>(defaultFilter);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateFilter = (filter: Partial<FilterRule>): boolean => {
    const newErrors: Record<string, string> = {};
    if (!filter.name?.trim()) {
      newErrors.name = '请输入规则名称';
    }
    if (filter.conditions && filter.conditions.length === 0) {
      newErrors.conditions = '至少需要一个条件';
    }
    if (filter.actions && filter.actions.length === 0) {
      newErrors.actions = '至少需要一个操作';
    }
    filter.conditions?.forEach((cond, index) => {
      if (cond.field !== 'hasAttachment' && (cond.value === '' || cond.value === undefined)) {
        newErrors[`condition_${index}`] = '请输入条件值';
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateFilter = async () => {
    if (!validateFilter(newFilter)) return;

    try {
      const filter = await window.api.filter.create({
        ...newFilter,
        name: newFilter.name.trim(),
        priority: filters.length
      });
      addFilter(filter);
      setShowCreateModal(false);
      setNewFilter(defaultFilter);
    } catch (error) {
      console.error('Failed to create filter:', error);
    }
  };

  const handleUpdateFilter = async () => {
    if (!editingFilter) return;
    if (!validateFilter(editingFilter)) return;

    try {
      const updated = await window.api.filter.update(editingFilter.id, {
        ...editingFilter,
        name: editingFilter.name.trim()
      });
      updateFilter(updated);
      setEditingFilter(null);
    } catch (error) {
      console.error('Failed to update filter:', error);
    }
  };

  const handleDeleteFilter = async (id: string) => {
    if (!confirm('确定要删除此过滤规则吗？')) return;

    try {
      await window.api.filter.delete(id);
      removeFilter(id);
    } catch (error) {
      console.error('Failed to delete filter:', error);
    }
  };

  const handleToggleFilter = async (filter: FilterRule) => {
    try {
      const updated = await window.api.filter.update(filter.id, { enabled: !filter.enabled });
      updateFilter(updated);
    } catch (error) {
      console.error('Failed to toggle filter:', error);
    }
  };

  const handleTestFilter = async (filterId: string) => {
    if (!testEmailId) {
      setErrors({ test: '请输入邮件ID进行测试' });
      return;
    }

    try {
      const matched = await window.api.filter.test(filterId, testEmailId);
      setTestResult({ filterId, success: true, matched });
    } catch (error: any) {
      setTestResult({ filterId, success: false, matched: false });
    }
  };

  const handleRunFilter = async (filterId: string) => {
    if (!confirm('运行此规则将对所有匹配的邮件执行操作，确定继续吗？')) return;

    setRunningFilter(filterId);
    try {
      const count = await window.api.filter.run(filterId);
      alert(`规则已执行，共处理 ${count} 封邮件`);
      await refreshData();
    } catch (error) {
      console.error('Failed to run filter:', error);
    } finally {
      setRunningFilter(null);
    }
  };

  const addCondition = (target: 'new' | 'edit') => {
    const newCondition: FilterCondition = { field: 'subject', operator: 'contains', value: '' };
    if (target === 'new') {
      setNewFilter(prev => ({ ...prev, conditions: [...prev.conditions, newCondition] }));
    } else if (editingFilter) {
      setEditingFilter({ ...editingFilter, conditions: [...editingFilter.conditions, newCondition] });
    }
  };

  const removeCondition = (target: 'new' | 'edit', index: number) => {
    if (target === 'new') {
      setNewFilter(prev => ({
        ...prev,
        conditions: prev.conditions.filter((_, i) => i !== index)
      }));
    } else if (editingFilter) {
      setEditingFilter({
        ...editingFilter,
        conditions: editingFilter.conditions.filter((_, i) => i !== index)
      });
    }
  };

  const updateCondition = (target: 'new' | 'edit', index: number, field: keyof FilterCondition, value: any) => {
    if (target === 'new') {
      setNewFilter(prev => ({
        ...prev,
        conditions: prev.conditions.map((c, i) => i === index ? { ...c, [field]: value } : c)
      }));
    } else if (editingFilter) {
      setEditingFilter({
        ...editingFilter,
        conditions: editingFilter.conditions.map((c, i) => i === index ? { ...c, [field]: value } : c)
      });
    }
  };

  const addAction = (target: 'new' | 'edit') => {
    const newAction: FilterAction = { type: 'addLabel', params: {} };
    if (target === 'new') {
      setNewFilter(prev => ({ ...prev, actions: [...prev.actions, newAction] }));
    } else if (editingFilter) {
      setEditingFilter({ ...editingFilter, actions: [...editingFilter.actions, newAction] });
    }
  };

  const removeAction = (target: 'new' | 'edit', index: number) => {
    if (target === 'new') {
      setNewFilter(prev => ({
        ...prev,
        actions: prev.actions.filter((_, i) => i !== index)
      }));
    } else if (editingFilter) {
      setEditingFilter({
        ...editingFilter,
        actions: editingFilter.actions.filter((_, i) => i !== index)
      });
    }
  };

  const updateAction = (target: 'new' | 'edit', index: number, field: keyof FilterAction, value: any) => {
    if (target === 'new') {
      setNewFilter(prev => ({
        ...prev,
        actions: prev.actions.map((a, i) => i === index ? { ...a, [field]: value } : a)
      }));
    } else if (editingFilter) {
      setEditingFilter({
        ...editingFilter,
        actions: editingFilter.actions.map((a, i) => i === index ? { ...a, [field]: value } : a)
      });
    }
  };

  const renderFilterForm = (filter: Partial<FilterRule>, target: 'new' | 'edit') => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            规则名称 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={filter.name || ''}
            onChange={(e) => target === 'new'
              ? setNewFilter(prev => ({ ...prev, name: e.target.value }))
              : editingFilter && setEditingFilter({ ...editingFilter, name: e.target.value })
            }
            placeholder="输入规则名称"
            className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.name ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
          />
          {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            匹配方式
          </label>
          <select
            value={filter.matchType || 'all'}
            onChange={(e) => target === 'new'
              ? setNewFilter(prev => ({ ...prev, matchType: e.target.value as 'all' | 'any' }))
              : editingFilter && setEditingFilter({ ...editingFilter, matchType: e.target.value as 'all' | 'any' })
            }
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">匹配所有条件</option>
            <option value="any">匹配任一条件</option>
          </select>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            条件
          </label>
          <Button size="sm" variant="outline" onClick={() => addCondition(target)}>
            + 添加条件
          </Button>
        </div>
        {filter.conditions?.map((condition, index) => (
          <div key={index} className="flex items-center gap-2 mb-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            {index > 0 && (
              <span className="text-sm text-gray-500 dark:text-gray-400 px-2">
                {filter.matchType === 'all' ? '且' : '或'}
              </span>
            )}
            <select
              value={condition.field}
              onChange={(e) => updateCondition(target, index, 'field', e.target.value)}
              className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {conditionFields.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
            <select
              value={condition.operator}
              onChange={(e) => updateCondition(target, index, 'operator', e.target.value)}
              className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {conditionOperators.map(op => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
            {condition.field !== 'hasAttachment' && (
              condition.field === 'label' ? (
                <select
                  value={condition.value as string}
                  onChange={(e) => updateCondition(target, index, 'value', e.target.value)}
                  className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">选择标签</option>
                  {labels.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={condition.value as string}
                  onChange={(e) => updateCondition(target, index, 'value', e.target.value)}
                  placeholder="输入条件值"
                  className={`flex-1 px-3 py-2 bg-white dark:bg-gray-900 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors[`condition_${index}`] ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
                />
              )
            )}
            {filter.conditions && filter.conditions.length > 1 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeCondition(target, index)}
              >
                ✕
              </Button>
            )}
          </div>
        ))}
        {errors.conditions && <p className="mt-1 text-sm text-red-500">{errors.conditions}</p>}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            操作
          </label>
          <Button size="sm" variant="outline" onClick={() => addAction(target)}>
            + 添加操作
          </Button>
        </div>
        {filter.actions?.map((action, index) => (
          <div key={index} className="flex items-center gap-2 mb-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <select
              value={action.type}
              onChange={(e) => updateAction(target, index, 'type', e.target.value)}
              className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {actionTypes.map(a => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
            {['move', 'copy'].includes(action.type) && (
              <select
                value={action.params.folderId || ''}
                onChange={(e) => updateAction(target, index, 'params', { ...action.params, folderId: e.target.value })}
                className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">选择文件夹</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            )}
            {['addLabel', 'removeLabel'].includes(action.type) && (
              <select
                value={action.params.labelId || ''}
                onChange={(e) => updateAction(target, index, 'params', { ...action.params, labelId: e.target.value })}
                className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">选择标签</option>
                {labels.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            )}
            {['forward', 'reply'].includes(action.type) && (
              <input
                type="text"
                value={action.params.email || ''}
                onChange={(e) => updateAction(target, index, 'params', { ...action.params, email: e.target.value })}
                placeholder="输入邮箱地址"
                className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            )}
            {filter.actions && filter.actions.length > 1 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeAction(target, index)}
              >
                ✕
              </Button>
            )}
          </div>
        ))}
        {errors.actions && <p className="mt-1 text-sm text-red-500">{errors.actions}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          应用范围
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">账户</label>
            <div className="flex flex-wrap gap-2">
              {accounts.map(acc => (
                <label key={acc.id} className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filter.accountIds?.includes(acc.id) || false}
                    onChange={(e) => {
                      const current = filter.accountIds || [];
                      const updated = e.target.checked
                        ? [...current, acc.id]
                        : current.filter(id => id !== acc.id);
                      if (target === 'new') {
                        setNewFilter(prev => ({ ...prev, accountIds: updated }));
                      } else if (editingFilter) {
                        setEditingFilter({ ...editingFilter, accountIds: updated });
                      }
                    }}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{acc.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">文件夹</label>
            <div className="flex flex-wrap gap-2">
              {folders.slice(0, 5).map(f => (
                <label key={f.id} className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filter.folderIds?.includes(f.id) || false}
                    onChange={(e) => {
                      const current = filter.folderIds || [];
                      const updated = e.target.checked
                        ? [...current, f.id]
                        : current.filter(id => id !== f.id);
                      if (target === 'new') {
                        setNewFilter(prev => ({ ...prev, folderIds: updated }));
                      } else if (editingFilter) {
                        setEditingFilter({ ...editingFilter, folderIds: updated });
                      }
                    }}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{f.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">🔍 过滤规则</h2>
          <p className="text-gray-500 dark:text-gray-400">创建规则自动处理邮件</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          + 创建规则
        </Button>
      </div>

      {filters.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
          <div className="text-6xl mb-4">⚙️</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">暂无过滤规则</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">创建规则自动分类和处理邮件</p>
          <Button onClick={() => setShowCreateModal(true)}>
            + 创建规则
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {filters.sort((a, b) => a.priority - b.priority).map(filter => (
            <div
              key={filter.id}
              className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden ${!filter.enabled ? 'opacity-60' : ''}`}
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{filter.name}</h3>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${filter.enabled ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                        {filter.enabled ? '已启用' : '已禁用'}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        优先级: {filter.priority}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      <span className="font-medium">条件: </span>
                      {filter.conditions.map((c, i) => (
                        <span key={i}>
                          {i > 0 && ` ${filter.matchType === 'all' ? '且' : '或'} `}
                          <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                            {conditionFields.find(f => f.value === c.field)?.label} {conditionOperators.find(op => op.value === c.operator)?.label} "{c.value}"
                          </code>
                        </span>
                      ))}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium">操作: </span>
                      {filter.actions.map((a, i) => (
                        <span key={i}>
                          {i > 0 && ', '}
                          <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                            {actionTypes.find(at => at.value === a.type)?.label}
                          </code>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filter.enabled}
                        onChange={() => handleToggleFilter(filter)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        placeholder="邮件ID测试"
                        value={testResult?.filterId === filter.id ? testEmailId : ''}
                        onChange={(e) => setTestEmailId(e.target.value)}
                        className="w-24 px-2 py-1 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTestFilter(filter.id)}
                      >
                        测试
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      loading={runningFilter === filter.id}
                      onClick={() => handleRunFilter(filter.id)}
                    >
                      运行
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingFilter(filter)}
                    >
                      编辑
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDeleteFilter(filter.id)}
                    >
                      删除
                    </Button>
                  </div>
                </div>

                {testResult && testResult.filterId === filter.id && (
                  <div className={`mt-4 p-3 rounded-lg ${testResult.matched ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                    {testResult.success
                      ? testResult.matched ? '✅ 该邮件匹配此规则' : '⚠️ 该邮件不匹配此规则'
                      : '❌ 测试失败'
                    }
                  </div>
                )}

                {editingFilter?.id === filter.id && (
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
                    {renderFilterForm(editingFilter, 'edit')}
                    <div className="mt-6 flex justify-end gap-3">
                      <Button variant="ghost" onClick={() => { setEditingFilter(null); setErrors({}); }}>
                        取消
                      </Button>
                      <Button onClick={handleUpdateFilter}>
                        保存更改
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto my-8">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">创建过滤规则</h3>
                <Button variant="ghost" size="icon" onClick={() => { setShowCreateModal(false); setErrors({}); }}>
                  ✕
                </Button>
              </div>
            </div>
            <div className="p-6">
              {renderFilterForm(newFilter, 'new')}
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 sticky bottom-0">
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => { setShowCreateModal(false); setErrors({}); }}>
                  取消
                </Button>
                <Button onClick={handleCreateFilter}>
                  创建规则
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterSettings;

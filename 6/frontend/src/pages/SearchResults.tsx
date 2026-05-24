import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../lib/api';
import type { Task } from '../types';

const priorityLabels: Record<string, string> = {
  HIGH: '高',
  MEDIUM: '中',
  LOW: '低',
};

const priorityColors: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  LOW: 'bg-green-100 text-green-700',
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

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (query) {
      search();
    }
  }, [query]);

  const search = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/search?q=${encodeURIComponent(query)}`);
      setResults(response.data);
    } catch (error) {
      console.error('搜索失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          搜索结果
        </h1>
        <p className="text-gray-600">
          搜索 "{query}" 找到 {results.length} 个结果
        </p>
      </div>

      {results.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500 mb-2">未找到匹配的任务</p>
          <p className="text-sm text-gray-400">请尝试使用其他关键词搜索</p>
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((task: any) => (
            <Link
              key={task.id}
              to={`/tasks/${task.id}`}
              className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${statusColors[task.status]}`}>
                      {statusLabels[task.status] || task.status}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs ${priorityColors[task.priority]}`}>
                      {priorityLabels[task.priority]}优先级
                    </span>
                    {task.projectName && (
                      <span className="text-xs text-gray-500">
                        📁 {task.projectName}
                      </span>
                    )}
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1">
                    {highlightText(task.title, query)}
                  </h3>
                  {task.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {highlightText(task.description, query)}
                    </p>
                  )}
                </div>
                {task.dueDate && (
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-500">截止日期</p>
                    <p className="text-sm font-medium text-gray-700">
                      {format(new Date(task.dueDate), 'yyyy-MM-dd')}
                    </p>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function highlightText(text: string, query: string) {
  if (!query) return text;
  const regex = new RegExp(`(${query})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-yellow-200 px-0.5 rounded">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

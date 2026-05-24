import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format, differenceInDays, addDays } from 'date-fns';
import api from '../lib/api';
import type { GanttData } from '../types';

const priorityColors: Record<string, string> = {
  HIGH: '#ef4444',
  MEDIUM: '#f59e0b',
  LOW: '#10b981',
};

const statusColors: Record<string, string> = {
  TODO: '#6b7280',
  IN_PROGRESS: '#3b82f6',
  REVIEW: '#8b5cf6',
  DONE: '#10b981',
};

export default function GanttView() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<GanttData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const response = await api.get(`/dashboard/gantt/${id}`);
      setData(response.data);
    } catch (error) {
      console.error('获取甘特图数据失败');
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

  if (!data) {
    return <div className="text-center py-20 text-gray-500">项目不存在</div>;
  }

  const allDates = data.tasks
    .filter((t) => t.endDate)
    .flatMap((t) => [new Date(t.startDate), new Date(t.endDate!)]) as Date[];

  const projectStart = data.project.startDate ? new Date(data.project.startDate) : new Date();
  const projectEnd = data.project.endDate ? new Date(data.project.endDate) : new Date();

  const minDate = allDates.length > 0 ? new Date(Math.min(...allDates.map((d) => d.getTime()), projectStart.getTime())) : projectStart;
  const maxDate = allDates.length > 0 ? new Date(Math.max(...allDates.map((d) => d.getTime()), projectEnd.getTime())) : addDays(projectEnd, 7);

  const totalDays = Math.max(differenceInDays(maxDate, minDate) + 1, 1);
  const dayWidth = Math.max(40, 800 / totalDays);

  const getDatePosition = (date: Date) => {
    return differenceInDays(date, minDate) * dayWidth;
  };

  const getTaskWidth = (start: Date, end: Date) => {
    return Math.max(differenceInDays(end, start) + 1, 1) * dayWidth - 4;
  };

  const dayHeaders = [];
  for (let i = 0; i < totalDays; i++) {
    const date = addDays(minDate, i);
    dayHeaders.push(date);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to={`/projects/${id}`} className="text-blue-600 hover:underline mb-2 inline-block">
            ← 返回看板
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">甘特图 - {data.project.name}</h1>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          <div className="flex-shrink-0 w-64 p-4 border-r border-gray-200 bg-gray-50 font-medium text-gray-700">
            任务
          </div>
          <div className="flex flex-shrink-0" style={{ width: `${totalDays * dayWidth}px` }}>
            {dayHeaders.map((date, i) => (
              <div
                key={i}
                className="flex-shrink-0 text-center text-xs text-gray-500 p-2 border-r border-gray-100"
                style={{ width: `${dayWidth}px` }}
              >
                <div>{format(date, 'MM/dd')}</div>
                <div className="text-gray-400">{format(date, 'EEE')}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <div style={{ minWidth: `${600 + totalDays * dayWidth}px` }}>
            {data.tasks.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                暂无任务，请先创建任务
              </div>
            ) : (
              data.tasks.map((task, taskIndex) => (
                <div
                  key={task.id}
                  className={`flex border-b border-gray-100 ${
                    taskIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex-shrink-0 w-64 p-4 border-r border-gray-200">
                    <Link
                      to={`/tasks/${task.id}`}
                      className="font-medium text-gray-900 hover:text-blue-600 hover:underline block truncate"
                    >
                      {task.title}
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: priorityColors[task.priority] }}
                      />
                      {task.assignee && (
                        <span className="text-xs text-gray-500">
                          {task.assignee.username}
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className="relative flex-shrink-0"
                    style={{ width: `${totalDays * dayWidth}px`, height: '72px' }}
                  >
                    {task.endDate && (
                      <Link
                        to={`/tasks/${task.id}`}
                        className="absolute top-1/2 transform -translate-y-1/2 rounded-md shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                        style={{
                          left: `${getDatePosition(new Date(task.startDate))}px`,
                          width: `${getTaskWidth(new Date(task.startDate), new Date(task.endDate))}px`,
                          backgroundColor: statusColors[task.status],
                          height: '32px',
                        }}
                      >
                        <div
                          className="h-full opacity-30"
                          style={{
                            width: `${task.progress}%`,
                            backgroundColor: 'white',
                          }}
                        />
                        <div className="absolute inset-0 flex items-center px-2 text-xs text-white font-medium truncate">
                          <span className="truncate">
                            {task.progress > 0 ? `${task.progress}%` : ''} {task.title}
                          </span>
                        </div>
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">状态:</span>
              {Object.entries(statusColors).map(([status, color]) => (
                <div key={status} className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
                  <span className="text-xs text-gray-600">
                    {status === 'TODO'
                      ? '待处理'
                      : status === 'IN_PROGRESS'
                      ? '进行中'
                      : status === 'REVIEW'
                      ? '待审核'
                      : '已完成'}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">优先级:</span>
              {Object.entries(priorityColors).map(([priority, color]) => (
                <div key={priority} className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-xs text-gray-600">
                    {priority === 'HIGH' ? '高' : priority === 'MEDIUM' ? '中' : '低'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

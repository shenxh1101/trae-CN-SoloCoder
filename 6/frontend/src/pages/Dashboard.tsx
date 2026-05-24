import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import api from '../lib/api';
import type { DashboardStats, WorkloadItem, CompletionRate } from '../types';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [workload, setWorkload] = useState<WorkloadItem[]>([]);
  const [completionRates, setCompletionRates] = useState<CompletionRate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, workloadRes, ratesRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/workload'),
        api.get('/dashboard/completion-rate'),
      ]);
      setStats(statsRes.data);
      setWorkload(workloadRes.data);
      setCompletionRates(ratesRes.data);
    } catch (error) {
      console.error('获取仪表盘数据失败');
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

  const statusData = [
    { name: '待处理', value: stats?.todoTasks || 0, color: '#6b7280' },
    { name: '进行中', value: stats?.inProgressTasks || 0, color: '#3b82f6' },
    { name: '待审核', value: stats?.reviewTasks || 0, color: '#8b5cf6' },
    { name: '已完成', value: stats?.completedTasks || 0, color: '#10b981' },
  ];

  const workloadChartData = workload.map((item) => ({
    name: item.username,
    任务数: item.taskCount,
    高优先级: item.highPriority,
    逾期: item.overdue,
  }));

  const completionChartData = completionRates.map((item) => ({
    name: item.username,
    完成率: item.rate,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">仪表盘</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500">总任务数</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {stats?.totalTasks || 0}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500">完成率</p>
          <p className="text-3xl font-bold text-green-600 mt-1">
            {stats?.completionRate || 0}%
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500">进行中</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">
            {stats?.inProgressTasks || 0}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500">逾期任务</p>
          <p className="text-3xl font-bold text-red-600 mt-1">
            {stats?.overdueTasks || 0}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">任务状态分布</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {statusData.map((item) => (
              <div key={item.name} className="flex items-center">
                <span
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-gray-600">
                  {item.name}: {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">成员工作负载</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workloadChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="任务数" fill="#3b82f6" />
                <Bar dataKey="高优先级" fill="#ef4444" />
                <Bar dataKey="逾期" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">成员完成率</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={completionChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis domain={[0, 100]} fontSize={12} />
              <Tooltip formatter={(value) => `${value}%`} />
              <Bar dataKey="完成率" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">工作负载详情</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600">成员</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">任务数</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">高优先级</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">逾期</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">完成率</th>
              </tr>
            </thead>
            <tbody>
              {workload.map((item) => {
                const rate = completionRates.find((r) => r.userId === item.userId);
                return (
                  <tr key={item.userId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium mr-3">
                          {item.username?.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{item.username}</span>
                      </div>
                    </td>
                    <td className="text-center py-3 px-4">{item.taskCount}</td>
                    <td className="text-center py-3 px-4">
                      <span className="text-red-600">{item.highPriority}</span>
                    </td>
                    <td className="text-center py-3 px-4">
                      <span className="text-orange-600">{item.overdue}</span>
                    </td>
                    <td className="text-center py-3 px-4">
                      <span className={rate && rate.rate >= 80 ? 'text-green-600' : 'text-gray-600'}>
                        {rate ? `${rate.rate}%` : '-'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

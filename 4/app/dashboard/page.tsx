'use client';

import { useEffect, useState } from 'react';

interface LowStockMaterial {
  id: number;
  material_id: number;
  name: string;
  unit: string;
  quantity: number;
  safe_threshold: number;
}

interface DeliveryByDay {
  date: string;
  count: number;
}

interface StoreStat {
  id: number;
  name: string;
  count: number;
}

interface PurchaseSuggestion {
  id: number;
  name: string;
  unit: string;
  planned_production: number;
  current_stock: number;
  suggested_purchase: number;
}

interface DashboardStats {
  lowStockMaterials: LowStockMaterial[];
  pendingCount: number;
  deliveriesByDay: DeliveryByDay[];
  storeApplicationStats: StoreStat[];
  purchaseSuggestions: PurchaseSuggestion[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard');
      const data = await res.json();
      setStats(data.stats);
    } catch (error) {
      console.error('获取统计数据失败', error);
    } finally {
      setLoading(false);
    }
  };

  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date.toISOString().split('T')[0]);
    }
    return days;
  };

  const getBarChartData = () => {
    if (!stats) return [];
    const days = getLast7Days();
    return days.map(day => {
      const record = stats.deliveriesByDay.find(d => d.date === day);
      return {
        date: day.slice(5),
        count: record ? record.count : 0
      };
    });
  };

  const getPieChartData = () => {
    if (!stats || stats.storeApplicationStats.length === 0) return [];
    const total = stats.storeApplicationStats.reduce((sum, s) => sum + s.count, 0);
    if (total === 0) return [];
    
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    return stats.storeApplicationStats.map((store, index) => ({
      ...store,
      percentage: Math.round((store.count / total) * 100),
      color: colors[index % colors.length]
    }));
  };

  if (loading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  if (!stats) {
    return <div className="text-center py-8">加载失败</div>;
  }

  const barData = getBarChartData();
  const maxCount = Math.max(...barData.map(d => d.count), 1);
  const pieData = getPieChartData();

  return (
    <div className="space-y-6">
      <div className="grid-3">
        <div className="card">
          <div className="card-title">待处理申请单</div>
          <div className="card-value">{stats.pendingCount}</div>
          <div className="text-sm text-gray-500 mt-1">待审核 + 已审核 + 生产中</div>
        </div>
        <div className="card">
          <div className="card-title">库存预警原料</div>
          <div className="card-value text-red-500">{stats.lowStockMaterials.length}</div>
          <div className="text-sm text-gray-500 mt-1">低于安全阈值</div>
        </div>
        <div className="card">
          <div className="card-title">已完成门店</div>
          <div className="card-value text-blue-500">
            {stats.storeApplicationStats.filter(s => s.count > 0).length}
          </div>
          <div className="text-sm text-gray-500 mt-1">有已配送申请的门店</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="page-container">
          <h2 className="page-title">库存预警</h2>
          {stats.lowStockMaterials.length === 0 ? (
            <div className="text-center py-4 text-gray-500">所有原料库存正常</div>
          ) : (
            <div className="space-y-2">
              {stats.lowStockMaterials.map(material => (
                <div
                  key={material.id}
                  className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                >
                  <div>
                    <span className="font-medium text-red-800">{material.name}</span>
                    <span className="text-sm text-red-600 ml-2">
                      当前：{material.quantity} {material.unit}
                    </span>
                  </div>
                  <div className="text-sm text-red-600">
                    安全阈值：{material.safe_threshold} {material.unit}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="page-container">
          <h2 className="page-title">原料采购建议</h2>
          <table className="table">
            <thead>
              <tr>
                <th>原料名称</th>
                <th>当前库存</th>
                <th>未来三天计划生产</th>
                <th>建议采购量</th>
              </tr>
            </thead>
            <tbody>
              {stats.purchaseSuggestions.map(item => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.current_stock} {item.unit}</td>
                  <td>{item.planned_production} {item.unit}</td>
                  <td className={item.suggested_purchase > 0 ? 'text-red-600 font-semibold' : ''}>
                    {item.suggested_purchase > 0 ? `${item.suggested_purchase} ${item.unit}` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid-2">
        <div className="page-container">
          <h2 className="page-title">最近七天配送量</h2>
          <div className="h-64 flex items-end justify-around gap-2">
            {barData.map((item, index) => (
              <div key={index} className="flex flex-col items-center flex-1">
                <div className="text-sm font-medium text-gray-600 mb-2">{item.count}</div>
                <div
                  className="w-full bg-blue-500 rounded-t transition-all duration-500"
                  style={{
                    height: `${Math.max((item.count / maxCount) * 100, 5)}%`,
                    minHeight: '4px'
                  }}
                />
                <div className="text-xs text-gray-500 mt-2">{item.date}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="page-container">
          <h2 className="page-title">各门店申请占比（已配送）</h2>
          {pieData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无已配送的申请单</div>
          ) : (
            <div className="flex items-center gap-8">
              <div
                className="w-48 h-48 rounded-full relative"
                style={{
                  background: `conic-gradient(${pieData.map((d, i) => {
                    const startAngle = pieData.slice(0, i).reduce((sum, p) => sum + p.percentage, 0) * 3.6;
                    const endAngle = startAngle + d.percentage * 3.6;
                    return `${d.color} ${startAngle}deg ${endAngle}deg`;
                  }).join(', ')})`
                }}
              >
                <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {stats.storeApplicationStats.reduce((sum, s) => sum + s.count, 0)}
                    </div>
                    <div className="text-sm text-gray-500">总单数</div>
                  </div>
                </div>
              </div>
              <div className="flex-1 space-y-3">
                {pieData.map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="flex-1">{item.name}</span>
                    <span className="text-gray-600">{item.count} 单</span>
                    <span className="text-gray-500 text-sm">({item.percentage}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

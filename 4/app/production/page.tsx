'use client';

import { useEffect, useState } from 'react';

interface Application {
  id: number;
  application_no: string;
  store_id: number;
  store_name: string;
  application_date: string;
  expected_date: string;
  status: string;
  items: {
    id: number;
    material_id: number;
    material_name: string;
    quantity: number;
    unit: string;
  }[];
}

interface ProductionOrder {
  id: number;
  order_no: string;
  material_id: number;
  material_name: string;
  required_quantity: number;
  actual_quantity: number;
  planned_date: string;
  status: string;
  unit: string;
}

export default function ProductionPage() {
  const [approvedApplications, setApprovedApplications] = useState<Application[]>([]);
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([]);
  const [selectedApps, setSelectedApps] = useState<number[]>([]);
  const [plannedDate, setPlannedDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
  });
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'convert' | 'orders'>('convert');
  const [editingOrder, setEditingOrder] = useState<{
    id: number;
    actualQuantity: number;
    plannedDate: string;
  } | null>(null);

  useEffect(() => {
    if (activeTab === 'convert') {
      fetchApprovedApplications();
    } else {
      fetchProductionOrders();
    }
  }, [activeTab]);

  const fetchApprovedApplications = async () => {
    const res = await fetch('/api/production/convert');
    const data = await res.json();
    setApprovedApplications(data.applications);
  };

  const fetchProductionOrders = async () => {
    const res = await fetch('/api/production/orders');
    const data = await res.json();
    setProductionOrders(data.orders);
  };

  const toggleAppSelection = (id: number) => {
    if (selectedApps.includes(id)) {
      setSelectedApps(selectedApps.filter(a => a !== id));
    } else {
      setSelectedApps([...selectedApps, id]);
    }
  };

  const handleConvert = async () => {
    if (selectedApps.length === 0) {
      setError('请至少选择一个申请单');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/production/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationIds: selectedApps,
          plannedDate
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '转换失败');
      }

      setSuccess(`成功生成 ${data.orders.length} 个生产工单`);
      setSelectedApps([]);
      fetchApprovedApplications();
    } catch (err) {
      setError(err instanceof Error ? err.message : '转换失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrder = async () => {
    if (!editingOrder) return;

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/production/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingOrder.id,
          actualQuantity: editingOrder.actualQuantity,
          plannedDate: editingOrder.plannedDate
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '更新失败');
      }

      setSuccess('工单更新成功');
      setEditingOrder(null);
      fetchProductionOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失败');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      '进行中': 'badge-pending',
      '已完成': 'badge-completed'
    };
    return badges[status] || 'badge-pending';
  };

  return (
    <div className="space-y-6">
      <div className="page-container">
        <div className="flex gap-2 mb-6">
          <button
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'convert'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setActiveTab('convert')}
          >
            申请单转换
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'orders'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setActiveTab('orders')}
          >
            生产工单管理
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {activeTab === 'convert' && (
          <>
            <div className="flex items-center gap-4 mb-4">
              <div className="form-group mb-0">
                <label className="form-label">计划生产日期</label>
                <input
                  type="date"
                  className="form-input"
                  value={plannedDate}
                  onChange={(e) => setPlannedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <button
                className="btn btn-primary"
                onClick={handleConvert}
                disabled={selectedApps.length === 0 || loading}
              >
                {loading ? '转换中...' : `转换为生产工单（已选${selectedApps.length}个）`}
              </button>
            </div>

            {approvedApplications.length === 0 ? (
              <div className="text-center py-8 text-gray-500">暂无待转换的申请单</div>
            ) : (
              <div className="space-y-4">
                {approvedApplications.map(app => (
                  <div
                    key={app.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedApps.includes(app.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => toggleAppSelection(app.id)}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <input
                        type="checkbox"
                        checked={selectedApps.includes(app.id)}
                        onChange={() => toggleAppSelection(app.id)}
                        className="w-5 h-5"
                      />
                      <span className="font-semibold">{app.application_no}</span>
                      <span className="text-gray-500">{app.store_name}</span>
                      <span className="text-sm text-gray-400">申请日期：{app.application_date}</span>
                      <span className="text-sm text-gray-400">期望送达：{app.expected_date}</span>
                    </div>
                    <div className="ml-8">
                      <div className="flex flex-wrap gap-2">
                        {app.items.map(item => (
                          <span
                            key={item.id}
                            className="inline-flex items-center px-3 py-1 bg-gray-100 rounded-full text-sm"
                          >
                            {item.material_name}: {item.quantity}{item.unit}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'orders' && (
          <div>
            {productionOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">暂无生产工单</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>工单号</th>
                    <th>原料名称</th>
                    <th>所需数量</th>
                    <th>实际完成</th>
                    <th>计划日期</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {productionOrders.map(order => (
                    <tr key={order.id}>
                      <td>{order.order_no}</td>
                      <td>{order.material_name}</td>
                      <td>{order.required_quantity} {order.unit}</td>
                      <td>
                        {editingOrder?.id === order.id ? (
                          <input
                            type="number"
                            className="form-input w-24"
                            value={editingOrder.actualQuantity}
                            onChange={(e) => setEditingOrder({
                              ...editingOrder,
                              actualQuantity: parseFloat(e.target.value) || 0
                            })}
                            min="0"
                            step="0.01"
                          />
                        ) : (
                          `${order.actual_quantity} ${order.unit}`
                        )}
                      </td>
                      <td>
                        {editingOrder?.id === order.id ? (
                          <input
                            type="date"
                            className="form-input w-32"
                            value={editingOrder.plannedDate}
                            onChange={(e) => setEditingOrder({
                              ...editingOrder,
                              plannedDate: e.target.value
                            })}
                          />
                        ) : (
                          order.planned_date
                        )}
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadge(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td>
                        {editingOrder?.id === order.id ? (
                          <div className="flex gap-2">
                            <button
                              className="btn btn-success btn-sm"
                              onClick={handleUpdateOrder}
                              disabled={loading}
                            >
                              保存
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => setEditingOrder(null)}
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => setEditingOrder({
                              id: order.id,
                              actualQuantity: order.actual_quantity,
                              plannedDate: order.planned_date
                            })}
                          >
                            编辑
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

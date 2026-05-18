'use client';

import { useEffect, useState } from 'react';

interface Material {
  id: number;
  name: string;
  unit: string;
  stock: number;
}

interface ApplicationItem {
  materialId: number;
  quantity: number;
}

interface Application {
  id: number;
  application_no: string;
  store_id: number;
  store_name: string;
  application_date: string;
  expected_date: string;
  status: string;
  created_at: string;
  items: {
    id: number;
    material_id: number;
    material_name: string;
    quantity: number;
    unit: string;
  }[];
}

export default function ApplicationPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentStoreId, setCurrentStoreId] = useState<string>('');

  const [applicationDate, setApplicationDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [expectedDate, setExpectedDate] = useState<string>('');
  const [items, setItems] = useState<ApplicationItem[]>([
    { materialId: 0, quantity: 0 }
  ]);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const storeSelect = document.querySelector('header select') as HTMLSelectElement;
    if (storeSelect && storeSelect.value) {
      setCurrentStoreId(storeSelect.value);
    }

    const handleStoreChange = () => {
      if (storeSelect) {
        setCurrentStoreId(storeSelect.value);
      }
    };

    if (storeSelect) {
      storeSelect.addEventListener('change', handleStoreChange);
    }

    return () => {
      if (storeSelect) {
        storeSelect.removeEventListener('change', handleStoreChange);
      }
    };
  }, []);

  useEffect(() => {
    fetchMaterials();
  }, []);

  useEffect(() => {
    if (currentStoreId) {
      fetchApplications();
    }
  }, [currentStoreId, statusFilter]);

  const fetchMaterials = async () => {
    const res = await fetch('/api/materials');
    const data = await res.json();
    setMaterials(data.materials);
  };

  const fetchApplications = async () => {
    const params = new URLSearchParams();
    params.append('storeId', currentStoreId);
    if (statusFilter) {
      params.append('status', statusFilter);
    }
    const res = await fetch(`/api/applications?${params.toString()}`);
    const data = await res.json();
    setApplications(data.applications);
  };

  const addItem = () => {
    setItems([...items, { materialId: 0, quantity: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof ApplicationItem, value: number) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      '待审核': 'badge-pending',
      '已审核': 'badge-approved',
      '生产中': 'badge-producing',
      '已完成生产': 'badge-producing',
      '已配送': 'badge-delivered',
      '已取消': 'badge-cancelled'
    };
    return badges[status] || 'badge-pending';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const validItems = items.filter(item => item.materialId > 0 && item.quantity > 0);

      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: currentStoreId,
          applicationDate,
          expectedDate,
          items: validItems
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '提交失败');
      }

      setSuccess(`申请单创建成功！单号：${data.applicationNo}`);
      setApplicationDate(new Date().toISOString().split('T')[0]);
      setExpectedDate('');
      setItems([{ materialId: 0, quantity: 0 }]);
      fetchApplications();
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm('确定要取消这个申请单吗？')) return;

    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '取消失败');
      }

      setSuccess('申请单已取消');
      fetchApplications();
    } catch (err) {
      setError(err instanceof Error ? err.message : '取消失败');
    }
  };

  const handleApprove = async (id: number) => {
    if (!confirm('确定要审核通过这个申请单吗？')) return;

    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '审核失败');
      }

      setSuccess('申请单已审核通过');
      fetchApplications();
    } catch (err) {
      setError(err instanceof Error ? err.message : '审核失败');
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-container">
        <h2 className="page-title">新建原料申请</h2>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">申请日期</label>
              <input
                type="date"
                className="form-input"
                value={applicationDate}
                onChange={(e) => setApplicationDate(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">期望送达日期</label>
              <input
                type="date"
                className="form-input"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                min={applicationDate}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">原料明细</label>
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <select
                      className="form-select"
                      value={item.materialId}
                      onChange={(e) => updateItem(index, 'materialId', parseInt(e.target.value))}
                      required
                    >
                      <option value={0}>请选择原料</option>
                      {materials.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name}（{m.unit}）
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-32">
                    <input
                      type="number"
                      className="form-input"
                      placeholder="数量"
                      min="0.01"
                      step="0.01"
                      value={item.quantity || ''}
                      onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm mt-2"
              onClick={addItem}
            >
              + 添加原料
            </button>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? '提交中...' : '提交申请'}
            </button>
          </div>
        </form>
      </div>

      <div className="page-container">
        <div className="flex items-center justify-between mb-4">
          <h2 className="page-title mb-0">历史申请单</h2>
          <select
            className="form-select w-40"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">全部状态</option>
            <option value="待审核">待审核</option>
            <option value="已审核">已审核</option>
            <option value="生产中">生产中</option>
            <option value="已完成生产">已完成生产</option>
            <option value="已配送">已配送</option>
            <option value="已取消">已取消</option>
          </select>
        </div>

        {applications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">暂无申请单</div>
        ) : (
          <div className="space-y-4">
            {applications.map(app => (
              <div key={app.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{app.application_no}</span>
                    <span className={`badge ${getStatusBadge(app.status)}`}>
                      {app.status}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {app.status === '待审核' && (
                      <>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleApprove(app.id)}
                        >
                          审核通过
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleCancel(app.id)}
                        >
                          取消
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="grid-4 text-sm text-gray-600 mb-3">
                  <div>申请日期：{app.application_date}</div>
                  <div>期望送达：{app.expected_date}</div>
                  <div>提交时间：{new Date(app.created_at).toLocaleString()}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>原料名称</th>
                        <th>申请数量</th>
                        <th>单位</th>
                      </tr>
                    </thead>
                    <tbody>
                      {app.items.map(item => (
                        <tr key={item.id}>
                          <td>{item.material_name}</td>
                          <td>{item.quantity}</td>
                          <td>{item.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

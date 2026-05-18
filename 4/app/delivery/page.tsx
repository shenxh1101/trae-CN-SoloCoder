'use client';

import { useEffect, useState } from 'react';

interface InventoryItem {
  id: number;
  material_id: number;
  name: string;
  unit: string;
  quantity: number;
  safe_threshold: number;
}

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

interface DeliveryRecord {
  id: number;
  delivery_no: string;
  application_id: number;
  application_no: string;
  store_id: number;
  store_name: string;
  delivery_date: string;
  created_at: string;
  items: {
    id: number;
    material_id: number;
    material_name: string;
    quantity: number;
    unit: string;
  }[];
}

export default function DeliveryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [readyApplications, setReadyApplications] = useState<Application[]>([]);
  const [deliveryRecords, setDeliveryRecords] = useState<DeliveryRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'inventory' | 'delivery' | 'records'>('inventory');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [checkingDelivery, setCheckingDelivery] = useState<number | null>(null);

  useEffect(() => {
    if (activeTab === 'inventory') {
      fetchInventory();
    } else if (activeTab === 'delivery') {
      fetchReadyApplications();
    } else {
      fetchDeliveryRecords();
    }
  }, [activeTab]);

  const fetchInventory = async () => {
    const res = await fetch('/api/inventory');
    const data = await res.json();
    setInventory(data.inventory);
  };

  const fetchReadyApplications = async () => {
    const res = await fetch('/api/delivery?type=ready');
    const data = await res.json();
    setReadyApplications(data.applications);
  };

  const fetchDeliveryRecords = async () => {
    const res = await fetch('/api/delivery?type=records');
    const data = await res.json();
    setDeliveryRecords(data.records);
  };

  const checkDeliveryFeasibility = async (applicationId: number) => {
    setCheckingDelivery(applicationId);
    try {
      const res = await fetch('/api/delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, action: 'check' })
      });
      const data = await res.json();
      if (!data.feasible) {
        const shortageText = data.shortages.map((s: any) =>
          `${s.name}（需${s.required}${s.unit}，现有${s.available}${s.unit}）`
        ).join('、');
        alert(`库存不足，缺少：${shortageText}`);
        setCheckingDelivery(null);
        return false;
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '检查库存失败');
      setCheckingDelivery(null);
      return false;
    }
  };

  const handleDeliver = async (applicationId: number) => {
    const feasible = await checkDeliveryFeasibility(applicationId);
    if (!feasible) return;

    if (!confirm('确定要配送这个申请单吗？')) {
      setCheckingDelivery(null);
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, action: 'deliver' })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '配送失败');
      }

      setSuccess(`配送成功！配送单号：${data.deliveryNo}`);
      fetchReadyApplications();
      fetchInventory();
    } catch (err) {
      setError(err instanceof Error ? err.message : '配送失败');
    } finally {
      setLoading(false);
      setCheckingDelivery(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-container">
        <div className="flex gap-2 mb-6">
          <button
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'inventory'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setActiveTab('inventory')}
          >
            库存管理
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'delivery'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setActiveTab('delivery')}
          >
            待配送申请
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'records'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setActiveTab('records')}
          >
            配送记录
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {activeTab === 'inventory' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">当前库存</h3>
            {inventory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">暂无库存数据</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>原料名称</th>
                    <th>当前库存</th>
                    <th>单位</th>
                    <th>安全阈值</th>
                    <th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map(item => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td className={item.quantity < item.safe_threshold ? 'text-red-600 font-semibold' : ''}>
                        {item.quantity}
                      </td>
                      <td>{item.unit}</td>
                      <td>{item.safe_threshold}</td>
                      <td>
                        {item.quantity < item.safe_threshold ? (
                          <span className="badge badge-pending">库存不足</span>
                        ) : (
                          <span className="badge badge-approved">正常</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'delivery' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">待配送申请单</h3>
            {readyApplications.length === 0 ? (
              <div className="text-center py-8 text-gray-500">暂无待配送的申请单</div>
            ) : (
              <div className="space-y-4">
                {readyApplications.map(app => (
                  <div key={app.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{app.application_no}</span>
                        <span className="text-gray-600">{app.store_name}</span>
                        <span className="text-sm text-gray-400">申请日期：{app.application_date}</span>
                        <span className="text-sm text-gray-400">期望送达：{app.expected_date}</span>
                      </div>
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleDeliver(app.id)}
                        disabled={checkingDelivery === app.id || loading}
                      >
                        {checkingDelivery === app.id ? '检查中...' : '配送'}
                      </button>
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
        )}

        {activeTab === 'records' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">配送记录</h3>
            {deliveryRecords.length === 0 ? (
              <div className="text-center py-8 text-gray-500">暂无配送记录</div>
            ) : (
              <div className="space-y-4">
                {deliveryRecords.map(record => (
                  <div key={record.id} className="border rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="font-semibold">{record.delivery_no}</span>
                      <span className="text-gray-600">对应申请：{record.application_no}</span>
                      <span className="text-gray-600">{record.store_name}</span>
                      <span className="text-sm text-gray-400">配送日期：{record.delivery_date}</span>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>原料名称</th>
                            <th>配送数量</th>
                            <th>单位</th>
                          </tr>
                        </thead>
                        <tbody>
                          {record.items.map(item => (
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
        )}
      </div>
    </div>
  );
}

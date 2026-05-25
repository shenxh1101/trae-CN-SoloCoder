import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAppStore } from '../store';
import { Transaction, TransactionType } from '../types';
import { getCategoriesByType, getCategoryByKey } from '../constants/categories';
import { formatDate } from '../utils/date';
import { getCurrencySymbol } from '../utils/currency';

interface RecordFormProps {
  record?: Transaction | null;
  onClose: () => void;
}

export const RecordForm = ({ record, onClose }: RecordFormProps) => {
  const { addRecord, updateRecord, settings } = useAppStore();
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(formatDate(new Date()));
  const [note, setNote] = useState('');

  const categories = getCategoriesByType(type);
  const symbol = getCurrencySymbol(settings.currency);

  useEffect(() => {
    if (record) {
      setType(record.type);
      setAmount(record.amount.toString());
      setCategory(record.category);
      setDate(record.date);
      setNote(record.note);
    }
  }, [record]);

  useEffect(() => {
    if (!record && categories.length > 0) {
      setCategory(categories[0].key);
    }
  }, [type, categories, record]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    
    if (!numAmount || numAmount <= 0) {
      alert('请输入有效的金额');
      return;
    }
    if (!category) {
      alert('请选择类别');
      return;
    }

    const recordData = {
      type,
      amount: numAmount,
      category,
      date,
      note
    };

    if (record) {
      updateRecord(record.id, recordData);
    } else {
      addRecord(recordData);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{record ? '编辑记录' : '添加记录'}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-5">
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                type === 'expense'
                  ? 'bg-white text-rose-500 shadow-sm'
                  : 'text-gray-500'
              }`}
            >
              支出
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                type === 'income'
                  ? 'bg-white text-emerald-500 shadow-sm'
                  : 'text-gray-500'
              }`}
            >
              收入
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">金额</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">
                {symbol}
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-3 text-2xl font-mono border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">类别</label>
            <div className="grid grid-cols-3 gap-2">
              {categories.map(cat => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setCategory(cat.key)}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    category === cat.key
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className="text-2xl mb-1">{cat.icon}</div>
                  <div className="text-xs text-gray-700">{cat.name}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">日期</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">备注</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="添加备注..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className={`flex-1 py-3 rounded-xl font-medium text-white transition-colors ${
                type === 'income' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'
              }`}
            >
              {record ? '保存修改' : '添加记录'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

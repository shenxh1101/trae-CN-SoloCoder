import { useState, useRef } from 'react';
import { X, DollarSign, Target, Repeat, Database, Plus, Trash2, Download, Upload, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../store';
import { EXPENSE_CATEGORIES, getCategoriesByType, getCategoryByKey } from '../constants/categories';
import { exportToCSV, downloadCSV, parseCSV } from '../utils/csv';
import { formatAmount, getCurrencySymbol } from '../utils/currency';
import { TransactionType, RecurringTransaction } from '../types';

interface SettingsModalProps {
  onClose: () => void;
}

type TabType = 'budget' | 'recurring' | 'currency' | 'data';

export const SettingsModal = ({ onClose }: SettingsModalProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('budget');
  const {
    settings,
    updateSettings,
    setBudget,
    getBudget,
    getCategoryExpense,
    recurring,
    addRecurring,
    deleteRecurring,
    addRecurringToCurrentMonth,
    records,
    importRecords,
    currentLedgerId,
    currentMonth
  } = useAppStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs = [
    { id: 'budget', label: '预算设置', icon: Target },
    { id: 'recurring', label: '固定收支', icon: Repeat },
    { id: 'currency', label: '货币设置', icon: DollarSign },
    { id: 'data', label: '数据管理', icon: Database },
  ];

  const handleExport = () => {
    const ledgerRecords = records.filter(r => r.ledgerId === currentLedgerId);
    if (ledgerRecords.length === 0) {
      alert('当前账本没有记录可导出');
      return;
    }
    const csvContent = exportToCSV(ledgerRecords);
    const filename = `记账记录_${currentMonth.year}${currentMonth.month.toString().padStart(2, '0')}.csv`;
    downloadCSV(csvContent, filename);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const importedRecords = await parseCSV(file);
      if (importedRecords.length === 0) {
        alert('没有找到有效的记录');
        return;
      }

      const confirm = window.confirm(`确定要导入 ${importedRecords.length} 条记录吗？`);
      if (confirm) {
        importRecords(importedRecords);
        alert(`成功导入 ${importedRecords.length} 条记录`);
      }
    } catch (error) {
      alert('导入失败：' + (error as Error).message);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between z-10">
          <h3 className="text-lg font-semibold">设置</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-gray-100 px-4 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={18} />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'budget' && <BudgetSettings setBudget={setBudget} getBudget={getBudget} getCategoryExpense={getCategoryExpense} settings={settings} />}
          {activeTab === 'recurring' && <RecurringSettings recurring={recurring} addRecurring={addRecurring} deleteRecurring={deleteRecurring} addRecurringToCurrentMonth={addRecurringToCurrentMonth} settings={settings} />}
          {activeTab === 'currency' && <CurrencySettings settings={settings} updateSettings={updateSettings} />}
          {activeTab === 'data' && (
            <DataSettings
              onExport={handleExport}
              onImportClick={() => fileInputRef.current?.click()}
              fileInputRef={fileInputRef}
              onFileChange={handleImport}
              records={records}
              currentLedgerId={currentLedgerId}
            />
          )}
        </div>
      </div>
    </div>
  );
};

const BudgetSettings = ({ setBudget, getBudget, getCategoryExpense, settings }: {
  setBudget: (category: string, amount: number) => void;
  getBudget: (category: string) => number;
  getCategoryExpense: () => { category: string; amount: number }[];
  settings: any;
}) => {
  const categoryExpense = getCategoryExpense();
  const expenseMap: { [key: string]: number } = {};
  categoryExpense.forEach(item => { expenseMap[item.category] = item.amount; });

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 mb-4">
        为每个支出类别设置月度预算，当支出超过预算时会显示红色警告。
      </p>
      <div className="grid gap-3">
        {EXPENSE_CATEGORIES.map(category => {
          const budget = getBudget(category.key);
          const spent = expenseMap[category.key] || 0;
          const isOverBudget = budget > 0 && spent > budget;
          const percentage = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;

          return (
            <div key={category.key} className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{category.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{category.name}</span>
                      {isOverBudget && <AlertTriangle size={14} className="text-rose-500" />}
                    </div>
                    <p className="text-xs text-gray-500">
                      已支出 {formatAmount(spent, settings)}
                      {budget > 0 && ` / 预算 ${formatAmount(budget, settings)}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">{getCurrencySymbol(settings.currency)}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={budget || ''}
                    onChange={(e) => setBudget(category.key, parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              {budget > 0 && (
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${isOverBudget ? 'bg-rose-500' : 'bg-blue-500'}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const RecurringSettings = ({ recurring, addRecurring, deleteRecurring, addRecurringToCurrentMonth, settings }: {
  recurring: RecurringTransaction[];
  addRecurring: (item: any) => void;
  deleteRecurring: (id: string) => void;
  addRecurringToCurrentMonth: (id: string) => void;
  settings: any;
}) => {
  const [showAdd, setShowAdd] = useState(false);
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');

  const categories = getCategoriesByType(type);
  const symbol = getCurrencySymbol(settings.currency);

  const handleAdd = () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      alert('请输入有效的金额');
      return;
    }
    if (!category) {
      alert('请选择类别');
      return;
    }

    addRecurring({
      type,
      amount: numAmount,
      category,
      note,
      period: 'monthly' as const
    });

    setAmount('');
    setNote('');
    setCategory(categories[0]?.key || '');
    setShowAdd(false);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 mb-4">
        设置固定周期的收入或支出项目，如每月工资、房租等，可以一键添加为当月记录。
      </p>

      {recurring.length > 0 && (
        <div className="space-y-2 mb-4">
          {recurring.map(item => {
            const cat = getCategoryByKey(item.category);
            return (
              <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{cat?.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{cat?.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        item.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {item.type === 'income' ? '收入' : '支出'}
                      </span>
                    </div>
                    {item.note && <p className="text-xs text-gray-500">{item.note}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-mono font-semibold ${
                    item.type === 'income' ? 'text-emerald-600' : 'text-gray-800'
                  }`}>
                    {symbol}{item.amount.toFixed(2)}
                  </span>
                  <button
                    onClick={() => addRecurringToCurrentMonth(item.id)}
                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    title="添加到本月"
                  >
                    <Plus size={16} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('确定要删除这个固定项目吗？')) {
                        deleteRecurring(item.id);
                      }
                    }}
                    className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd ? (
        <div className="p-4 border border-gray-200 rounded-xl space-y-4">
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button
              type="button"
              onClick={() => { setType('expense'); setCategory(''); }}
              className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                type === 'expense' ? 'bg-white text-rose-500 shadow-sm' : 'text-gray-500'
              }`}
            >
              支出
            </button>
            <button
              type="button"
              onClick={() => { setType('income'); setCategory(''); }}
              className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                type === 'income' ? 'bg-white text-emerald-500 shadow-sm' : 'text-gray-500'
              }`}
            >
              收入
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">金额</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">{symbol}</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className={`p-2 rounded-lg border-2 transition-all ${
                    category === cat.key
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className="text-xl mb-1">{cat.icon}</div>
                  <div className="text-xs">{cat.name}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">备注</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="如：每月工资、房租等"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowAdd(false)}
              className="flex-1 py-2 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleAdd}
              className="flex-1 py-2 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
            >
              添加
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => {
            setShowAdd(true);
            setCategory(categories[0]?.key || '');
          }}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          添加固定收支项目
        </button>
      )}
    </div>
  );
};

const CurrencySettings = ({ settings, updateSettings }: {
  settings: any;
  updateSettings: (settings: any) => void;
}) => {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">货币单位</label>
        <div className="flex gap-3">
          {(['CNY', 'USD'] as const).map(currency => (
            <button
              key={currency}
              onClick={() => updateSettings({ currency })}
              className={`flex-1 py-4 px-4 rounded-xl border-2 transition-all ${
                settings.currency === currency
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-1">{currency === 'CNY' ? '¥' : '$'}</div>
              <div className="font-medium">{currency === 'CNY' ? '人民币 (CNY)' : '美元 (USD)'}</div>
            </button>
          ))}
        </div>
      </div>

      {settings.currency === 'USD' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            汇率 (1 USD = ? CNY)
          </label>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">1 $ = </span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={settings.exchangeRate}
              onChange={(e) => updateSettings({ exchangeRate: parseFloat(e.target.value) || 7 })}
              className="w-32 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-500">¥</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            所有金额默认以人民币存储，显示时会根据汇率转换为美元
          </p>
        </div>
      )}
    </div>
  );
};

const DataSettings = ({ onExport, onImportClick, fileInputRef, onFileChange, records, currentLedgerId }: {
  onExport: () => void;
  onImportClick: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  records: any[];
  currentLedgerId: string;
}) => {
  const ledgerRecords = records.filter(r => r.ledgerId === currentLedgerId);
  
  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-medium text-gray-800 mb-2">导出数据</h4>
        <p className="text-sm text-gray-500 mb-3">
          将当前账本的所有记录导出为CSV文件，可用于备份或在其他软件中打开。
        </p>
        <div className="mb-3 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
          <span className="text-sm text-blue-700">当前账本共有</span>
          <span className="text-lg font-bold text-blue-700">{ledgerRecords.length} 条记录</span>
        </div>
        <button
          onClick={onExport}
          disabled={ledgerRecords.length === 0}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            ledgerRecords.length === 0 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
              : 'bg-emerald-500 text-white hover:bg-emerald-600'
          }`}
        >
          <Download size={18} />
          导出CSV文件
        </button>
      </div>

      <div className="border-t border-gray-100 pt-6">
        <h4 className="font-medium text-gray-800 mb-2">导入数据</h4>
        <p className="text-sm text-gray-500 mb-3">
          从CSV文件导入历史记录到当前账本。CSV文件格式：日期,类型,类别,金额,备注
        </p>
        <button
          onClick={onImportClick}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Upload size={18} />
          导入CSV文件
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={onFileChange}
          className="hidden"
        />
      </div>

      <div className="border-t border-gray-100 pt-6">
        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
          <h4 className="font-medium text-amber-800 mb-1">⚠️ 注意</h4>
          <p className="text-sm text-amber-700">
            所有数据存储在您浏览器的localStorage中。清除浏览器数据会导致数据丢失，
            建议定期导出数据进行备份。
          </p>
        </div>
      </div>
    </div>
  );
};

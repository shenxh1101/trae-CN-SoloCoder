import { useMemo } from 'react';
import { Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../store';
import { Transaction } from '../types';
import { getCategoryByKey } from '../constants/categories';
import { formatDisplayDate } from '../utils/date';
import { formatAmount } from '../utils/currency';

interface RecordListProps {
  records: Transaction[];
  filterCategory?: string | null;
  onEdit: (record: Transaction) => void;
}

export const RecordList = ({ records, filterCategory, onEdit }: RecordListProps) => {
  const { deleteRecord, settings, getBudget, getCategoryExpense } = useAppStore();

  const filteredRecords = filterCategory
    ? records.filter(r => r.category === filterCategory)
    : records;

  const categoryExpenseMap = useMemo(() => {
    const expenses = getCategoryExpense();
    const map: { [key: string]: number } = {};
    expenses.forEach(item => {
      map[item.category] = item.amount;
    });
    return map;
  }, [records]);

  const budgetOverMap = useMemo(() => {
    const map: { [key: string]: boolean } = {};
    Object.keys(categoryExpenseMap).forEach(category => {
      const budget = getBudget(category);
      map[category] = budget > 0 && categoryExpenseMap[category] > budget;
    });
    return map;
  }, [categoryExpenseMap, getBudget]);

  if (filteredRecords.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-4xl mb-3">📝</p>
        <p className="text-lg">暂无记录</p>
        <p className="text-sm mt-1">点击右下角按钮添加第一笔记录</p>
      </div>
    );
  }

  const groupedByDate: { [key: string]: Transaction[] } = {};
  filteredRecords.forEach(record => {
    if (!groupedByDate[record.date]) {
      groupedByDate[record.date] = [];
    }
    groupedByDate[record.date].push(record);
  });

  const handleDelete = (record: Transaction) => {
    if (confirm('确定要删除这条记录吗？')) {
      deleteRecord(record.id);
    }
  };

  return (
    <div className="space-y-4">
      {Object.entries(groupedByDate).map(([date, dateRecords]) => {
        const dayIncome = dateRecords.filter(r => r.type === 'income').reduce((sum, r) => sum + r.amount, 0);
        const dayExpense = dateRecords.filter(r => r.type === 'expense').reduce((sum, r) => sum + r.amount, 0);

        return (
          <div key={date} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 flex items-center justify-between border-b border-gray-100">
              <span className="font-medium text-gray-700">{formatDisplayDate(date)}</span>
              <div className="flex gap-4 text-sm">
                {dayIncome > 0 && (
                  <span className="text-emerald-600 font-medium">收 {formatAmount(dayIncome, settings)}</span>
                )}
                {dayExpense > 0 && (
                  <span className="text-rose-600 font-medium">支 {formatAmount(dayExpense, settings)}</span>
                )}
              </div>
            </div>

            <div className="divide-y divide-gray-50">
              {dateRecords.map(record => {
                const category = getCategoryByKey(record.category);
                const isOverBudget = record.type === 'expense' && budgetOverMap[record.category] === true;

                return (
                  <div
                    key={record.id}
                    className={`px-4 py-3 flex items-center gap-3 transition-colors group ${
                      isOverBudget 
                        ? 'bg-rose-50 hover:bg-rose-100 border-l-4 border-rose-500' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ backgroundColor: category?.color + '15' }}
                    >
                      {category?.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium truncate ${isOverBudget ? 'text-rose-800' : 'text-gray-800'}`}>
                          {category?.name}
                        </span>
                        {isOverBudget && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-rose-100 text-rose-600 text-xs rounded-full">
                            <AlertTriangle size={12} />
                            超预算
                          </span>
                        )}
                      </div>
                      {record.note && (
                        <p className={`text-sm truncate ${isOverBudget ? 'text-rose-600' : 'text-gray-500'}`}>{record.note}</p>
                      )}
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className={`font-mono font-semibold ${
                        record.type === 'income' ? 'text-emerald-600' : 'text-gray-800'
                      }`}>
                        {record.type === 'income' ? '+' : '-'}{formatAmount(record.amount, settings)}
                      </div>
                    </div>

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={() => onEdit(record)}
                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(record)}
                        className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

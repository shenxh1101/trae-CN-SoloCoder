import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useAppStore } from '../store';
import { Transaction } from '../types';
import { Header } from '../components/Header';
import { LedgerTabs } from '../components/LedgerTabs';
import { Charts } from '../components/Charts';
import { SearchBar } from '../components/SearchBar';
import { RecordList } from '../components/RecordList';
import { RecordForm } from '../components/RecordForm';
import { SettingsModal } from '../components/SettingsModal';

export default function Home() {
  const { getMonthlyRecords, searchRecords } = useAppStore();
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Transaction | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  const monthlyRecords = getMonthlyRecords();
  const searchResults = searchKeyword ? searchRecords(searchKeyword) : null;
  const displayRecords = searchResults || monthlyRecords;

  const handleEdit = (record: Transaction) => {
    setEditingRecord(record);
    setShowRecordForm(true);
  };

  const handleCloseForm = () => {
    setShowRecordForm(false);
    setEditingRecord(null);
  };

  const handleAdd = () => {
    setEditingRecord(null);
    setShowRecordForm(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          💰 个人记账
        </h1>

        <Header onOpenSettings={() => setShowSettings(true)} />

        <LedgerTabs />

        <SearchBar onSearch={setSearchKeyword} />

        {searchKeyword && (
          <div className="mb-4 p-3 bg-blue-50 rounded-xl text-sm text-blue-700">
            搜索 "{searchKeyword}" 的结果：找到 {displayRecords.length} 条记录
          </div>
        )}

        {!searchKeyword && (
          <Charts
            filterCategory={filterCategory}
            onFilterChange={setFilterCategory}
          />
        )}

        {filterCategory && !searchKeyword && (
          <div className="mb-4 p-3 bg-blue-50 rounded-xl flex items-center justify-between">
            <span className="text-sm text-blue-700">
              已筛选类别，显示 {displayRecords.filter(r => r.category === filterCategory).length} 条记录
            </span>
            <button
              onClick={() => setFilterCategory(null)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              清除筛选
            </button>
          </div>
        )}

        <RecordList
          records={displayRecords}
          filterCategory={filterCategory}
          onEdit={handleEdit}
        />
      </div>

      <button
        onClick={handleAdd}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-40"
      >
        <Plus size={28} />
      </button>

      {showRecordForm && (
        <RecordForm record={editingRecord} onClose={handleCloseForm} />
      )}

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}

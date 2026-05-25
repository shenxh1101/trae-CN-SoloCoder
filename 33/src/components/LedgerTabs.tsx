import { useState, useRef } from 'react';
import { Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppStore } from '../store';
import { Ledger } from '../types';

export const LedgerTabs = () => {
  const { ledgers, currentLedgerId, switchLedger, addLedger, deleteLedger } = useAppStore();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 150;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleAdd = () => {
    if (newName.trim()) {
      addLedger(newName.trim());
      setNewName('');
      setShowAdd(false);
    }
  };

  const handleDelete = (ledger: Ledger) => {
    if (ledgers.length <= 1) {
      alert('至少需要保留一个账本');
      return;
    }
    if (confirm(`确定要删除账本"${ledger.name}"吗？相关的所有记录也会被删除。`)) {
      deleteLedger(ledger.id);
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2">
        <button
          onClick={() => scroll('left')}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
        >
          <ChevronLeft size={18} />
        </button>
        
        <div
          ref={scrollRef}
          className="flex-1 flex gap-2 overflow-x-auto scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {ledgers.map(ledger => (
            <div
              key={ledger.id}
              className={`relative flex-shrink-0 group ${
                currentLedgerId === ledger.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              } px-4 py-2 rounded-xl cursor-pointer transition-all shadow-sm border border-gray-200`}
              onClick={() => switchLedger(ledger.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                setDeleteConfirm(ledger.id);
              }}
            >
              <span className="font-medium">{ledger.name}</span>
              
              {ledgers.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirm(ledger.id);
                  }}
                  className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${
                    currentLedgerId === ledger.id ? 'bg-white/20 hover:bg-white/30' : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
          
          {showAdd ? (
            <div className="flex items-center gap-2 flex-shrink-0">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="账本名称"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm w-32"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
              <button
                onClick={handleAdd}
                className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Plus size={18} />
              </button>
              <button
                onClick={() => { setShowAdd(false); setNewName(''); }}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAdd(true)}
              className="flex-shrink-0 p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors border-2 border-dashed border-gray-300 hover:border-blue-400"
            >
              <Plus size={18} />
            </button>
          )}
        </div>
        
        <button
          onClick={() => scroll('right')}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};

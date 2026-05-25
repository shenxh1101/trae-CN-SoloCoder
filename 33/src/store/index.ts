import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppData, Ledger, Transaction, Budget, RecurringTransaction, Settings, MonthlyStats, CategoryExpense, DailyTrend } from '../types';
import { isInMonth, getLast7Days, formatDate } from '../utils/date';

const STORAGE_KEY = 'accounting_app_data';

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const getDefaultLedger = (): Ledger => ({
  id: generateId(),
  name: '日常生活',
  createdAt: new Date().toISOString()
});

const getDefaultSettings = (): Settings => ({
  currency: 'CNY',
  exchangeRate: 7.2
});

interface AppState extends AppData {
  currentMonth: { year: number; month: number };
  setCurrentMonth: (year: number, month: number) => void;
  
  addLedger: (name: string) => void;
  switchLedger: (id: string) => void;
  deleteLedger: (id: string) => void;
  
  addRecord: (record: Omit<Transaction, 'id' | 'ledgerId' | 'createdAt'>) => void;
  updateRecord: (id: string, updates: Partial<Transaction>) => void;
  deleteRecord: (id: string) => void;
  importRecords: (records: Omit<Transaction, 'id' | 'ledgerId' | 'createdAt'>[]) => void;
  
  setBudget: (category: string, amount: number) => void;
  getBudget: (category: string) => number;
  
  addRecurring: (item: Omit<RecurringTransaction, 'id' | 'ledgerId' | 'createdAt'>) => void;
  deleteRecurring: (id: string) => void;
  addRecurringToCurrentMonth: (id: string) => void;
  
  updateSettings: (settings: Partial<Settings>) => void;
  
  getMonthlyRecords: () => Transaction[];
  getMonthlyStats: () => MonthlyStats;
  getCategoryExpense: () => CategoryExpense[];
  getLast7DaysTrend: () => DailyTrend[];
  searchRecords: (keyword: string) => Transaction[];
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => {
      const defaultLedger = getDefaultLedger();
      return {
        ledgers: [defaultLedger],
        currentLedgerId: defaultLedger.id,
        records: [],
        budgets: [],
        recurring: [],
        settings: getDefaultSettings(),
        currentMonth: { year: new Date().getFullYear(), month: new Date().getMonth() + 1 },
        
        setCurrentMonth: (year, month) => set({ currentMonth: { year, month } }),
        
        addLedger: (name) => set((state) => {
          const newLedger: Ledger = {
            id: generateId(),
            name,
            createdAt: new Date().toISOString()
          };
          return {
            ledgers: [...state.ledgers, newLedger],
            currentLedgerId: newLedger.id
          };
        }),
        
        switchLedger: (id) => set({ currentLedgerId: id }),
        
        deleteLedger: (id) => set((state) => {
          if (state.ledgers.length <= 1) return state;
          const newLedgers = state.ledgers.filter(l => l.id !== id);
          return {
            ledgers: newLedgers,
            currentLedgerId: state.currentLedgerId === id ? newLedgers[0].id : state.currentLedgerId,
            records: state.records.filter(r => r.ledgerId !== id),
            budgets: state.budgets.filter(b => b.ledgerId !== id),
            recurring: state.recurring.filter(r => r.ledgerId !== id)
          };
        }),
        
        addRecord: (record) => set((state) => ({
          records: [...state.records, {
            ...record,
            id: generateId(),
            ledgerId: state.currentLedgerId,
            createdAt: new Date().toISOString()
          }]
        })),
        
        updateRecord: (id, updates) => set((state) => ({
          records: state.records.map(r => r.id === id ? { ...r, ...updates } : r)
        })),
        
        deleteRecord: (id) => set((state) => ({
          records: state.records.filter(r => r.id !== id)
        })),
        
        importRecords: (records) => set((state) => {
          const newRecords = records.map(r => ({
            ...r,
            id: generateId(),
            ledgerId: state.currentLedgerId,
            createdAt: new Date().toISOString()
          }));
          return { records: [...state.records, ...newRecords] };
        }),
        
        setBudget: (category, amount) => set((state) => {
          const existingIndex = state.budgets.findIndex(
            b => b.ledgerId === state.currentLedgerId && b.category === category
          );
          
          if (existingIndex >= 0) {
            const newBudgets = [...state.budgets];
            newBudgets[existingIndex] = { ...newBudgets[existingIndex], amount };
            return { budgets: newBudgets };
          } else {
            return {
              budgets: [...state.budgets, {
                ledgerId: state.currentLedgerId,
                category,
                amount
              }]
            };
          }
        }),
        
        getBudget: (category) => {
          const state = get();
          const budget = state.budgets.find(
            b => b.ledgerId === state.currentLedgerId && b.category === category
          );
          return budget?.amount || 0;
        },
        
        addRecurring: (item) => set((state) => ({
          recurring: [...state.recurring, {
            ...item,
            id: generateId(),
            ledgerId: state.currentLedgerId,
            createdAt: new Date().toISOString()
          }]
        })),
        
        deleteRecurring: (id) => set((state) => ({
          recurring: state.recurring.filter(r => r.id !== id)
        })),
        
        addRecurringToCurrentMonth: (id) => {
          const state = get();
          const recurring = state.recurring.find(r => r.id === id);
          if (!recurring) return;
          
          const now = new Date();
          const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
          const dateStr = formatDate(firstDay);
          
          set((state) => ({
            records: [...state.records, {
              id: generateId(),
              ledgerId: state.currentLedgerId,
              type: recurring.type,
              amount: recurring.amount,
              category: recurring.category,
              date: dateStr,
              note: recurring.note,
              createdAt: new Date().toISOString()
            }]
          }));
        },
        
        updateSettings: (settings) => set((state) => ({
          settings: { ...state.settings, ...settings }
        })),
        
        getMonthlyRecords: () => {
          const state = get();
          const { year, month } = state.currentMonth;
          return state.records
            .filter(r => r.ledgerId === state.currentLedgerId && isInMonth(r.date, year, month))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        },
        
        getMonthlyStats: () => {
          const records = get().getMonthlyRecords();
          const income = records.filter(r => r.type === 'income').reduce((sum, r) => sum + r.amount, 0);
          const expense = records.filter(r => r.type === 'expense').reduce((sum, r) => sum + r.amount, 0);
          return { income, expense, balance: income - expense };
        },
        
        getCategoryExpense: () => {
          const records = get().getMonthlyRecords();
          const expenseRecords = records.filter(r => r.type === 'expense');
          const categoryMap: { [key: string]: number } = {};
          
          expenseRecords.forEach(r => {
            categoryMap[r.category] = (categoryMap[r.category] || 0) + r.amount;
          });
          
          return Object.entries(categoryMap)
            .map(([category, amount]) => ({ category, amount }))
            .sort((a, b) => b.amount - a.amount);
        },
        
        getLast7DaysTrend: () => {
          const state = get();
          const days = getLast7Days();
          const dayMap: { [key: string]: number } = {};
          
          days.forEach(day => { dayMap[day] = 0; });
          
          state.records
            .filter(r => r.ledgerId === state.currentLedgerId && r.type === 'expense' && dayMap[r.date] !== undefined)
            .forEach(r => {
              dayMap[r.date] += r.amount;
            });
          
          return days.map(date => ({ date, amount: dayMap[date] }));
        },
        
        searchRecords: (keyword) => {
          const state = get();
          if (!keyword.trim()) return [];
          const lowerKeyword = keyword.toLowerCase();
          return state.records
            .filter(r => r.ledgerId === state.currentLedgerId && 
              r.note.toLowerCase().includes(lowerKeyword))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }
      };
    },
    {
      name: STORAGE_KEY,
    }
  )
);

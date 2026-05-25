import { Category } from '../types';

export const INCOME_CATEGORIES: Category[] = [
  { key: 'salary', name: '工资', icon: '💰', color: '#10b981' },
  { key: 'bonus', name: '奖金', icon: '🎁', color: '#059669' },
  { key: 'investment', name: '理财', icon: '📈', color: '#047857' },
  { key: 'other_income', name: '其他', icon: '💵', color: '#065f46' },
];

export const EXPENSE_CATEGORIES: Category[] = [
  { key: 'food', name: '餐饮', icon: '🍜', color: '#ef4444' },
  { key: 'shopping', name: '购物', icon: '🛒', color: '#f97316' },
  { key: 'transport', name: '交通', icon: '🚗', color: '#eab308' },
  { key: 'entertainment', name: '娱乐', icon: '🎮', color: '#8b5cf6' },
  { key: 'housing', name: '住房', icon: '🏠', color: '#ec4899' },
  { key: 'utilities', name: '水电', icon: '💡', color: '#06b6d4' },
  { key: 'medical', name: '医疗', icon: '💊', color: '#14b8a6' },
  { key: 'education', name: '教育', icon: '📚', color: '#6366f1' },
  { key: 'other_expense', name: '其他', icon: '📝', color: '#64748b' },
];

export const ALL_CATEGORIES: Category[] = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

export const getCategoryByKey = (key: string): Category | undefined => {
  return ALL_CATEGORIES.find(c => c.key === key);
};

export const getCategoriesByType = (type: 'income' | 'expense'): Category[] => {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
};

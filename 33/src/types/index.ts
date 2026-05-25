export type TransactionType = 'income' | 'expense';

export interface Category {
  key: string;
  name: string;
  icon: string;
  color: string;
}

export interface Ledger {
  id: string;
  name: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  ledgerId: string;
  type: TransactionType;
  amount: number;
  category: string;
  date: string;
  note: string;
  createdAt: string;
}

export interface Budget {
  ledgerId: string;
  category: string;
  amount: number;
}

export interface RecurringTransaction {
  id: string;
  ledgerId: string;
  type: TransactionType;
  amount: number;
  category: string;
  note: string;
  period: 'monthly';
  createdAt: string;
}

export interface Settings {
  currency: 'CNY' | 'USD';
  exchangeRate: number;
}

export interface AppData {
  ledgers: Ledger[];
  currentLedgerId: string;
  records: Transaction[];
  budgets: Budget[];
  recurring: RecurringTransaction[];
  settings: Settings;
}

export interface MonthlyStats {
  income: number;
  expense: number;
  balance: number;
}

export interface CategoryExpense {
  category: string;
  amount: number;
}

export interface DailyTrend {
  date: string;
  amount: number;
}

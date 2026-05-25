import { Transaction, Category } from '../types';
import { getCategoryByKey, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../constants/categories';

export const exportToCSV = (records: Transaction[]): string => {
  const headers = ['日期', '类型', '类别', '金额', '备注'];
  const rows = records.map(record => {
    const category = getCategoryByKey(record.category);
    return [
      record.date,
      record.type === 'income' ? '收入' : '支出',
      category?.name || record.category,
      record.amount.toString(),
      record.note || ''
    ];
  });
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n');
  
  return csvContent;
};

export const downloadCSV = (content: string, filename: string): void => {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const parseCSV = (file: File): Promise<Transaction[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const lines = content.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          reject(new Error('CSV文件格式不正确'));
          return;
        }
        
        const records: Transaction[] = [];
        const typeMap: { [key: string]: 'income' | 'expense' } = {
          '收入': 'income',
          '支出': 'expense'
        };
        
        const categoryNameToKey: { [key: string]: string } = {};
        const allCategories: Category[] = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];
        allCategories.forEach((cat: Category) => {
          categoryNameToKey[cat.name] = cat.key;
        });
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
          const cleanedValues = values.map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"'));
          
          if (cleanedValues.length < 4) continue;
          
          const [date, type, category, amount, note] = cleanedValues;
          
          const recordType = typeMap[type] || 'expense';
          const categoryKey = categoryNameToKey[category] || 'other_expense';
          
          records.push({
            id: `imported_${Date.now()}_${i}`,
            ledgerId: '',
            type: recordType,
            amount: parseFloat(amount) || 0,
            category: categoryKey,
            date: date || new Date().toISOString().split('T')[0],
            note: note || '',
            createdAt: new Date().toISOString()
          });
        }
        
        resolve(records);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file, 'UTF-8');
  });
};

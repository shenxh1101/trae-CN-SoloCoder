import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { useAppStore } from '../store';
import { getCategoryByKey, EXPENSE_CATEGORIES } from '../constants/categories';
import { formatAmount } from '../utils/currency';
import { formatDisplayDate } from '../utils/date';

interface ChartsProps {
  filterCategory: string | null;
  onFilterChange: (category: string | null) => void;
}

export const Charts = ({ filterCategory, onFilterChange }: ChartsProps) => {
  const { getCategoryExpense, getLast7DaysTrend, settings, getMonthlyStats } = useAppStore();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const categoryData = getCategoryExpense();
  const trendData = getLast7DaysTrend();
  const stats = getMonthlyStats();

  const pieData = categoryData.map(item => {
    const category = getCategoryByKey(item.category);
    return {
      name: category?.name || item.category,
      value: item.amount,
      category: item.category,
      color: category?.color || '#64748b'
    };
  });

  const totalExpense = stats.expense;

  const handleLegendClick = (data: any) => {
    const clickedCategory = categoryData.find(c => {
      const cat = getCategoryByKey(c.category);
      return cat?.name === data.value;
    });
    if (clickedCategory) {
      if (filterCategory === clickedCategory.category) {
        onFilterChange(null);
      } else {
        onFilterChange(clickedCategory.category);
      }
    }
  };

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, value }: any) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">支出占比</h3>
        {pieData.length > 0 ? (
          <>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={renderCustomLabel}
                    onMouseEnter={(_, index) => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        opacity={filterCategory === null || filterCategory === entry.category ? 1 : 0.3}
                        strokeWidth={activeIndex === index ? 2 : 0}
                        stroke="white"
                        style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [
                      formatAmount(value, settings),
                      '支出'
                    ]}
                    contentStyle={{
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Legend
                    onClick={handleLegendClick}
                    formatter={(value) => (
                      <span
                        className={`text-sm cursor-pointer ${
                          filterCategory === categoryData.find(c => {
                            const cat = getCategoryByKey(c.category);
                            return cat?.name === value;
                          })?.category
                            ? 'font-bold text-blue-600'
                            : ''
                        }`}
                      >
                        {value}
                      </span>
                    )}
                    wrapperStyle={{ paddingTop: '20px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {filterCategory && (
              <div className="mt-2 text-center">
                <button
                  onClick={() => onFilterChange(null)}
                  className="text-sm text-blue-500 hover:text-blue-600"
                >
                  清除筛选
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-400">
            暂无支出数据
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">最近7天支出趋势</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <XAxis
                dataKey="date"
                tickFormatter={(date) => {
                  const d = new Date(date);
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                }}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickLine={false}
                tickFormatter={(value) => {
                  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
                  return value.toString();
                }}
              />
              <Tooltip
                formatter={(value: number) => [
                  formatAmount(value, settings),
                  '支出'
                ]}
                labelFormatter={(label) => formatDisplayDate(label)}
                contentStyle={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: '#2563eb' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

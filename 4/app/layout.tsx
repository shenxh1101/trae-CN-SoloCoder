'use client';

import './globals.css';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [stores, setStores] = useState<any[]>([]);
  const [currentStoreId, setCurrentStoreId] = useState<string>('');

  useEffect(() => {
    fetch('/api/stores')
      .then(res => res.json())
      .then(data => {
        setStores(data.stores);
        if (data.stores.length > 0 && !currentStoreId) {
          setCurrentStoreId(String(data.stores[0].id));
        }
      });
  }, []);

  const navItems = [
    { href: '/', label: '门店申请' },
    { href: '/production', label: '中央厨房' },
    { href: '/delivery', label: '库存与配送' },
    { href: '/dashboard', label: '仪表盘' },
  ];

  const currentStore = stores.find(s => String(s.id) === currentStoreId);

  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-8">
                <h1 className="text-xl font-bold text-gray-800">餐饮中央厨房调度系统</h1>
                <nav className="flex gap-1">
                  {navItems.map(item => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        pathname === item.href
                          ? 'bg-blue-500 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600">当前门店：</label>
                <select
                  value={currentStoreId}
                  onChange={(e) => setCurrentStoreId(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}

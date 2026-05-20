'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    window.location.href = '/';
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-xl font-bold text-gray-900">
            个人博客
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-gray-600 hover:text-gray-900 transition">
              首页
            </Link>
            <Link href="/archive" className="text-gray-600 hover:text-gray-900 transition">
              归档
            </Link>
            <Link href="/tags" className="text-gray-600 hover:text-gray-900 transition">
              标签
            </Link>
            {isLoggedIn ? (
              <>
                <Link href="/admin" className="text-gray-600 hover:text-gray-900 transition">
                  管理
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-gray-900 transition"
                >
                  退出
                </button>
              </>
            ) : (
              <Link href="/login" className="text-gray-600 hover:text-gray-900 transition">
                登录
              </Link>
            )}
          </div>

          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            <Link
              href="/"
              className="block py-2 text-gray-600 hover:text-gray-900"
              onClick={() => setIsMenuOpen(false)}
            >
              首页
            </Link>
            <Link
              href="/archive"
              className="block py-2 text-gray-600 hover:text-gray-900"
              onClick={() => setIsMenuOpen(false)}
            >
              归档
            </Link>
            <Link
              href="/tags"
              className="block py-2 text-gray-600 hover:text-gray-900"
              onClick={() => setIsMenuOpen(false)}
            >
              标签
            </Link>
            {isLoggedIn ? (
              <>
                <Link
                  href="/admin"
                  className="block py-2 text-gray-600 hover:text-gray-900"
                  onClick={() => setIsMenuOpen(false)}
                >
                  管理
                </Link>
                <button
                  onClick={handleLogout}
                  className="block py-2 text-gray-600 hover:text-gray-900"
                >
                  退出
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="block py-2 text-gray-600 hover:text-gray-900"
                onClick={() => setIsMenuOpen(false)}
              >
                登录
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

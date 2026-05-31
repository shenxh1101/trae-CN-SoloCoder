import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BookOpen, HelpCircle, Database, LogOut, Scale } from 'lucide-react';
import { useAdminStore } from '../store/useChatStore';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, username } = useAdminStore();

  const navItems = [
    { path: '/admin/dashboard', label: '数据概览', icon: LayoutDashboard },
    { path: '/admin/knowledge', label: '知识库管理', icon: BookOpen },
    { path: '/admin/missed', label: '未命中问题', icon: HelpCircle },
    { path: '/admin/backups', label: '备份管理', icon: Database },
  ];

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-primary-800 text-white flex flex-col">
        <div className="p-6 border-b border-primary-700">
          <Link to="/" className="flex items-center gap-3">
            <Scale className="w-8 h-8 text-gold-400" />
            <div>
              <h1 className="font-serif text-xl font-bold">法律AI</h1>
              <p className="text-xs text-primary-300">管理员后台</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary-700 text-gold-400'
                        : 'text-primary-100 hover:bg-primary-700 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-primary-700">
          <div className="flex items-center justify-between px-4 py-2 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gold-500 flex items-center justify-center text-primary-900 font-bold">
                {username?.[0]?.toUpperCase()}
              </div>
              <span className="text-sm">{username}</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>退出登录</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

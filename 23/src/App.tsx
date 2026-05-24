import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { Image, History, BarChart3, Brain } from 'lucide-react';
import { ClassifyPage } from './pages/ClassifyPage';
import { HistoryPage } from './pages/HistoryPage';
import { AnalysisPage } from './pages/AnalysisPage';

function Navbar() {
  const navItems = [
    { path: '/', label: '图像分类', icon: Image },
    { path: '/history', label: '历史记录', icon: History },
    { path: '/analysis', label: '模型分析', icon: BarChart3 },
  ];

  return (
    <nav className="sticky top-0 z-40 border-b border-dark-700/50 bg-dark-900/80 backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/30">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold gradient-text">AI 图像分类</h1>
              <p className="text-[10px] text-dark-500 -mt-1">MobileNet Demo</p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-dark-800/50 rounded-full p-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `nav-link flex items-center gap-2 ${
                    isActive ? 'nav-link-active' : ''
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<ClassifyPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/analysis" element={<AnalysisPage />} />
          </Routes>
        </main>

        <footer className="border-t border-dark-800/50 mt-16 py-8">
          <div className="container mx-auto px-4 text-center text-sm text-dark-500">
            <p>
              基于 TensorFlow MobileNetV2 预训练模型 · 支持 1000+ 类别识别
            </p>
            <p className="mt-1 text-xs">
              © 2024 AI Image Classification Demo</p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

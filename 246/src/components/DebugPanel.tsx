import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader, ChevronDown, ChevronUp } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'pending' | 'running';
  message: string;
  data?: any;
}

export default function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<TestResult[]>([
    { name: 'Canvas 存在', status: 'pending', message: '等待检测...' },
    { name: 'Canvas toDataURL (截图)', status: 'pending', message: '等待检测...' },
    { name: 'Canvas getImageData (GIF录制)', status: 'pending', message: '等待检测...' },
    { name: 'Store cameraPosition', status: 'pending', message: '等待检测...' },
    { name: 'gif.js CDN 可访问', status: 'pending', message: '等待检测...' },
  ]);

  const runTests = async () => {
    setResults(prev => prev.map(r => ({ ...r, status: 'pending', message: '测试中...' })));

    const updateResult = (index: number, status: TestResult['status'], message: string, data?: any) => {
      setResults(prev => {
        const next = [...prev];
        next[index] = { ...next[index], status, message, data };
        return next;
      });
    };

    updateResult(0, 'running', '检测Canvas...');
    await new Promise(r => setTimeout(r, 100));
    
    const canvas = document.querySelector('canvas');
    if (canvas) {
      updateResult(0, 'pass', `找到Canvas: ${canvas.width}x${canvas.height}`);
    } else {
      updateResult(0, 'fail', '未找到Canvas元素');
    }

    updateResult(1, 'running', '测试截图功能...');
    await new Promise(r => setTimeout(r, 100));
    
    try {
      if (canvas) {
        const dataUrl = canvas.toDataURL('image/png');
        const size = Math.round(dataUrl.length / 1024);
        updateResult(1, 'pass', `✅ 正常，数据大小: ${size} KB`, { dataUrl: dataUrl.substring(0, 100) + '...' });
      } else {
        updateResult(1, 'fail', 'Canvas不存在');
      }
    } catch (e: any) {
      updateResult(1, 'fail', `错误: ${e.message}`);
    }

    updateResult(2, 'running', '测试帧捕获...');
    await new Promise(r => setTimeout(r, 100));
    
    try {
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const imageData = ctx.getImageData(0, 0, Math.min(100, canvas.width), Math.min(100, canvas.height));
          updateResult(2, 'pass', `✅ 正常，像素数: ${imageData.data.length.toLocaleString()}`);
        } else {
          updateResult(2, 'fail', '无法获取2D上下文');
        }
      } else {
        updateResult(2, 'fail', 'Canvas不存在');
      }
    } catch (e: any) {
      updateResult(2, 'fail', `错误: ${e.message}`);
    }

    updateResult(3, 'running', '检测Store状态...');
    await new Promise(r => setTimeout(r, 100));
    
    try {
      const store = (window as any).cloudStore;
      if (store && store.getState) {
        const state = store.getState();
        const { cameraPosition } = state;
        const isValid = cameraPosition && 
                       Array.isArray(cameraPosition) && 
                       cameraPosition.length === 3 &&
                       cameraPosition.every((v: any) => typeof v === 'number' && !isNaN(v));
        
        updateResult(3, isValid ? 'pass' : 'fail', 
          isValid 
            ? `✅ 有效: [${cameraPosition.map((v: number) => v.toFixed(1)).join(', ')}]`
            : `❌ 无效: ${JSON.stringify(cameraPosition)}`,
          { cameraPosition }
        );
      } else {
        updateResult(3, 'pending', 'Store未暴露到window，请检查代码');
      }
    } catch (e: any) {
      updateResult(3, 'fail', `错误: ${e.message}`);
    }

    updateResult(4, 'running', '检测gif.js...');
    await new Promise(r => setTimeout(r, 100));
    
    try {
      if (typeof (window as any).GIF !== 'undefined') {
        updateResult(4, 'pass', '✅ gif.js 已加载');
      } else {
        updateResult(4, 'pending', '⏳ 点击录制按钮时会动态加载');
      }
    } catch (e: any) {
      updateResult(4, 'fail', `错误: ${e.message}`);
    }
  };

  useEffect(() => {
    const timer = setTimeout(runTests, 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="absolute bottom-6 right-6 z-50 glass-panel px-3 py-2 text-xs text-white/60 hover:text-white/80 transition-all"
      >
        🔧 功能检测
      </button>
    );
  }

  const allPass = results.every(r => r.status === 'pass');
  const hasFail = results.some(r => r.status === 'fail');

  return (
    <div className="absolute bottom-6 right-6 z-50 w-80 glass-panel p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {allPass ? <CheckCircle size={16} className="text-green-400" /> : 
           hasFail ? <XCircle size={16} className="text-red-400" /> : 
           <Loader size={16} className="animate-spin text-yellow-400" />}
          <span className="text-sm font-serif text-white/80">功能检测面板</span>
        </div>
        <button 
          onClick={() => setIsOpen(false)}
          className="text-white/40 hover:text-white/70 transition-colors"
        >
          <ChevronDown size={16} />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {results.map((result, i) => (
          <div key={i} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/70">{result.name}</span>
              <span className={`
                ${result.status === 'pass' ? 'text-green-400' : ''}
                ${result.status === 'fail' ? 'text-red-400' : ''}
                ${result.status === 'pending' ? 'text-yellow-400' : ''}
                ${result.status === 'running' ? 'text-blue-400' : ''}
              `}>
                {result.status === 'running' && <Loader size={10} className="inline animate-spin mr-1" />}
                {result.status === 'pass' && <CheckCircle size={10} className="inline mr-1" />}
                {result.status === 'fail' && <XCircle size={10} className="inline mr-1" />}
                {result.message}
              </span>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={runTests}
        className="w-full py-1.5 text-xs bg-white/10 hover:bg-white/20 text-white/70 rounded transition-all"
      >
        🔄 重新检测
      </button>
    </div>
  );
}

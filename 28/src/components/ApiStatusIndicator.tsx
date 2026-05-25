import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw, AlertTriangle, Server, Database, Settings, X } from 'lucide-react';
import { useApiStatusStore } from '../store/apiStatusStore';
import { cn } from '../lib/utils';

const statusConfig = {
  checking: {
    icon: RefreshCw,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/20',
    label: '连接中',
    spin: true,
  },
  online: {
    icon: Wifi,
    color: 'text-green-400',
    bgColor: 'bg-green-400/20',
    label: '在线',
    spin: false,
  },
  fallback: {
    icon: Database,
    color: 'text-amber-400',
    bgColor: 'bg-amber-400/20',
    label: '演示模式',
    spin: false,
  },
  offline: {
    icon: WifiOff,
    color: 'text-red-400',
    bgColor: 'bg-red-400/20',
    label: '离线',
    spin: false,
  },
};

export default function ApiStatusIndicator() {
  const {
    status,
    provider,
    currentEndpoint,
    error,
    useMockFallback,
    checkApiHealth,
    setUseMockFallback,
  } = useApiStatusStore();

  const [showPanel, setShowPanel] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const config = statusConfig[status];
  const Icon = config.icon;

  const handleRecheck = async () => {
    setIsChecking(true);
    await checkApiHealth();
    setTimeout(() => setIsChecking(false), 1000);
  };

  return (
    <>
      <button
        onClick={() => setShowPanel(true)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg glass-hover transition-all duration-300',
          status === 'fallback' && 'ring-1 ring-amber-400/30'
        )}
      >
        <div className={cn('p-1 rounded-full', config.bgColor)}>
          <Icon
            className={cn('w-4 h-4', config.color, config.spin && 'animate-spin')}
          />
        </div>
        <span className={cn('text-sm font-medium', config.color)}>
          {config.label}
        </span>
      </button>

      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowPanel(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="glass rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={cn('p-2 rounded-xl', config.bgColor)}>
                    <Icon className={cn('w-6 h-6', config.color)} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">API 连接状态</h3>
                    <p className={cn('text-sm', config.color)}>{config.label}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPanel(false)}
                  className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <X className="w-5 h-5 text-text-secondary" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-bg-tertiary">
                  <div className="flex items-center gap-2 mb-2">
                    <Server className="w-4 h-4 text-text-muted" />
                    <span className="text-sm font-medium text-text-secondary">当前接口</span>
                  </div>
                  <p className="text-sm font-mono break-all text-text-primary">
                    {currentEndpoint}
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    数据提供方: {provider === 'netease' ? '网易云音乐 API' : '本地演示数据'}
                  </p>
                </div>

                {error && (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-400">提示</p>
                        <p className="text-sm text-text-secondary mt-1">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-4 rounded-xl bg-bg-tertiary">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4 text-text-muted" />
                      <span className="text-sm font-medium text-text-secondary">演示模式</span>
                    </div>
                    <button
                      onClick={() => setUseMockFallback(!useMockFallback)}
                      className={cn(
                        'w-12 h-6 rounded-full transition-colors duration-300 relative',
                        useMockFallback ? 'bg-accent-purple' : 'bg-white/20'
                      )}
                    >
                      <motion.div
                        animate={{ x: useMockFallback ? 26 : 2 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-lg"
                      />
                    </button>
                  </div>
                  <p className="text-xs text-text-muted">
                    {useMockFallback
                      ? '已启用：API不可用时自动切换到本地演示数据'
                      : '已禁用：API不可用时将显示错误'}
                  </p>
                </div>

                <button
                  onClick={handleRecheck}
                  disabled={isChecking}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-accent text-white font-medium
                           hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <RefreshCw className={cn('w-5 h-5', isChecking && 'animate-spin')} />
                  {isChecking ? '检测中...' : '重新检测连接'}
                </button>

                {status === 'fallback' && (
                  <div className="p-4 rounded-xl bg-gradient-to-r from-accent-purple/20 to-accent-cyan/20 border border-accent-purple/30">
                    <p className="text-sm text-text-primary text-center">
                      🎵 当前使用演示数据，您可以体验所有核心功能
                    </p>
                    <p className="text-xs text-text-muted text-center mt-1">
                      包含 25+ 首示例歌曲、完整歌词、评论和歌单数据
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import Button from '../ui/Button';
import { formatFileSize } from '../../utils/format';
import type { PluginInfo } from '@shared/types';

declare global {
  interface Window {
    api: any;
    dialog: {
      openFile: (options?: any) => Promise<string>;
      openDirectory: () => Promise<string>;
    };
  }
}

const PluginSettings: React.FC = () => {
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [enablingPlugin, setEnablingPlugin] = useState<string | null>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [selectedPluginPath, setSelectedPluginPath] = useState('');
  const [selectedPlugin, setSelectedPlugin] = useState<PluginInfo | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadPlugins();
  }, []);

  const loadPlugins = async () => {
    try {
      const result = await window.api.plugin.list();
      setPlugins(result);
    } catch (error) {
      console.error('Failed to load plugins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChoosePlugin = async () => {
    try {
      const result = await window.api.dialog.openFile({
        filters: [{ name: 'Plugin Packages', extensions: ['zip', 'tar.gz', 'json'] }]
      });
      if (result) {
        setSelectedPluginPath(result);
        setErrors({});
      }
    } catch (error) {
      console.error('Failed to choose plugin:', error);
    }
  };

  const handleInstallPlugin = async () => {
    if (!selectedPluginPath) {
      setErrors({ install: '请选择插件文件' });
      return;
    }

    setInstalling(true);
    try {
      const plugin = await window.api.plugin.install(selectedPluginPath);
      setPlugins([...plugins, plugin]);
      setShowInstallModal(false);
      setSelectedPluginPath('');
      setErrors({});
    } catch (error: any) {
      setErrors({ install: error.message || '安装插件失败' });
    } finally {
      setInstalling(false);
    }
  };

  const handleTogglePlugin = async (plugin: PluginInfo) => {
    setEnablingPlugin(plugin.id);
    try {
      if (plugin.enabled) {
        await window.api.plugin.disable(plugin.id);
      } else {
        await window.api.plugin.enable(plugin.id);
      }
      await loadPlugins();
    } catch (error) {
      console.error('Failed to toggle plugin:', error);
    } finally {
      setEnablingPlugin(null);
    }
  };

  const handleUninstallPlugin = async (pluginId: string) => {
    const plugin = plugins.find(p => p.id === pluginId);
    if (!confirm(`确定要卸载插件"${plugin?.name}"吗？`)) return;

    try {
      await window.api.plugin.uninstall(pluginId);
      setPlugins(plugins.filter(p => p.id !== pluginId));
      if (selectedPlugin?.id === pluginId) {
        setSelectedPlugin(null);
      }
    } catch (error) {
      console.error('Failed to uninstall plugin:', error);
    }
  };

  const handleReloadPlugin = async (pluginId: string) => {
    try {
      await window.api.plugin.reload(pluginId);
      await loadPlugins();
    } catch (error) {
      console.error('Failed to reload plugin:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-500 dark:text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">🔌 插件管理</h2>
          <p className="text-gray-500 dark:text-gray-400">扩展邮件客户端的功能</p>
        </div>
        <Button onClick={() => setShowInstallModal(true)}>
          + 安装插件
        </Button>
      </div>

      {plugins.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
          <div className="text-6xl mb-4">🔌</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">暂无插件</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">安装插件扩展邮件客户端功能</p>
          <Button onClick={() => setShowInstallModal(true)}>
            + 安装插件
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {plugins.map(plugin => (
              <div
                key={plugin.id}
                className={`bg-white dark:bg-gray-900 rounded-xl border overflow-hidden transition-all ${
                  selectedPlugin?.id === plugin.id
                    ? 'border-primary-500 ring-2 ring-primary-500/20'
                    : 'border-gray-200 dark:border-gray-800'
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white text-2xl">
                        {plugin.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{plugin.name}</h3>
                          <span className="text-xs text-gray-500 dark:text-gray-400">v{plugin.version}</span>
                          {!plugin.enabled && (
                            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 rounded-full">
                              已禁用
                            </span>
                          )}
                          {plugin.error && (
                            <span className="px-2 py-0.5 text-xs bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-full">
                              错误
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{plugin.description}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">作者: {plugin.author}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={plugin.enabled}
                        onChange={() => handleTogglePlugin(plugin)}
                        disabled={enablingPlugin === plugin.id}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                    </label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedPlugin(plugin)}
                    >
                      详情
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReloadPlugin(plugin.id)}
                    >
                      重新加载
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleUninstallPlugin(plugin.id)}
                    >
                      卸载
                    </Button>
                  </div>

                  {plugin.error && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <p className="text-sm text-red-600 dark:text-red-400">❌ {plugin.error}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {selectedPlugin && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 h-fit sticky top-4">
              <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-white">插件详情</h3>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedPlugin(null)}>
                    ✕
                  </Button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white text-3xl">
                    {selectedPlugin.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedPlugin.name}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">v{selectedPlugin.version}</p>
                  </div>
                </div>

                <div>
                  <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">描述</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{selectedPlugin.description}</p>
                </div>

                <div>
                  <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">作者</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{selectedPlugin.author}</p>
                </div>

                <div>
                  <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">入口文件</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">{selectedPlugin.main}</p>
                </div>

                {selectedPlugin.renderer && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">渲染器入口</h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">{selectedPlugin.renderer}</p>
                  </div>
                )}

                <div>
                  <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">安装路径</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-mono text-xs break-all">{selectedPlugin.path}</p>
                </div>

                {selectedPlugin.permissions && selectedPlugin.permissions.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">权限</h5>
                    <div className="flex flex-wrap gap-1">
                      {selectedPlugin.permissions.map((perm, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded"
                        >
                          {perm}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedPlugin.dependencies && Object.keys(selectedPlugin.dependencies).length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">依赖</h5>
                    <div className="space-y-1">
                      {Object.entries(selectedPlugin.dependencies).map(([name, version]) => (
                        <div key={name} className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400 font-mono">{name}</span>
                          <span className="text-gray-500 dark:text-gray-500">{version}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {showInstallModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">安装插件</h3>
                <Button variant="ghost" size="icon" onClick={() => { setShowInstallModal(false); setErrors({}); }}>
                  ✕
                </Button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  选择插件文件
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={selectedPluginPath}
                    readOnly
                    placeholder="选择插件包 (.zip, .tar.gz)"
                    className={`flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg text-sm focus:outline-none ${errors.install ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
                  />
                  <Button variant="outline" onClick={handleChoosePlugin}>
                    浏览
                  </Button>
                </div>
                {errors.install && <p className="mt-1 text-sm text-red-500">{errors.install}</p>}
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">支持的格式</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• .zip - 压缩包格式</li>
                  <li>• .tar.gz - 压缩包格式</li>
                  <li>• package.json - 插件清单文件</li>
                </ul>
              </div>

              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  ⚠️ 安全提示：仅安装您信任来源的插件。恶意插件可能会访问您的邮件数据。
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => { setShowInstallModal(false); setErrors({}); }}>
                  取消
                </Button>
                <Button onClick={handleInstallPlugin} loading={installing} disabled={!selectedPluginPath}>
                  安装
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">🔌 插件开发</h4>
        <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
          您可以开发自定义插件扩展邮件客户端功能。插件使用标准的Web技术（HTML, CSS, JavaScript）构建。
        </p>
        <div className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
          <p>• 插件可以添加新的菜单项和工具栏按钮</p>
          <p>• 插件可以访问邮件数据和账户信息</p>
          <p>• 插件可以注册自定义的邮件处理规则</p>
          <p>• 插件支持通过IPC与主进程通信</p>
        </div>
      </div>
    </div>
  );
};

export default PluginSettings;

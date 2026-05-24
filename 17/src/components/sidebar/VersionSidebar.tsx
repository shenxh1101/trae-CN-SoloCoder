import { useState } from 'react';
import { X, Clock, GitCompare, Tag, User, ChevronRight, MoreHorizontal, Download, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SnippetVersion } from '@/shared/types';

interface VersionSidebarProps {
  versions: SnippetVersion[];
  currentVersionId?: string;
  onClose: () => void;
  onVersionSelect: (version: SnippetVersion) => void;
  onCompare?: (version1: SnippetVersion, version2: SnippetVersion) => void;
  onRestore?: (version: SnippetVersion) => void;
  onDownload?: (version: SnippetVersion) => void;
  className?: string;
}

interface VersionItemProps {
  version: SnippetVersion;
  isActive: boolean;
  onSelect: (version: SnippetVersion) => void;
  onRestore?: (version: SnippetVersion) => void;
  onDownload?: (version: SnippetVersion) => void;
}

function VersionItem({ version, isActive, onSelect, onRestore, onDownload }: VersionItemProps) {
  const [showMenu, setShowMenu] = useState(false);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className={cn(
        'group rounded-lg border p-3 cursor-pointer transition-all duration-200',
        isActive
          ? 'border-deep-blue-500 bg-deep-blue-50 dark:bg-deep-blue-900/30'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
      )}
      onClick={() => onSelect(version)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium font-mono',
                isActive
                  ? 'bg-deep-blue-100 text-deep-blue-700 dark:bg-deep-blue-800 dark:text-deep-blue-200'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
              )}
            >
              <Tag className="h-3 w-3" />
              v{version.version}
            </span>
            {version.label && (
              <span className="badge badge-purple">{version.label}</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Clock className="h-3 w-3" />
            {formatDate(version.createdAt)}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="inline-flex items-center gap-1">
              <User className="h-3 w-3" />
              {version.language}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4 text-gray-500" />
            </button>
            {showMenu && (
              <div
                className="absolute right-0 mt-1 w-32 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 z-10"
                onClick={(e) => e.stopPropagation()}
              >
                {onRestore && (
                  <button
                    onClick={() => {
                      onRestore(version);
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    <RotateCcw className="h-3 w-3" />
                    恢复此版本
                  </button>
                )}
                {onDownload && (
                  <button
                    onClick={() => {
                      onDownload(version);
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    <Download className="h-3 w-3" />
                    下载
                  </button>
                )}
              </div>
            )}
          </div>
          <ChevronRight
            className={cn('h-4 w-4 transition-transform', isActive ? 'text-deep-blue-500 rotate-90' : 'text-gray-400')}
          />
        </div>
      </div>
    </div>
  );
}

export default function VersionSidebar({
  versions,
  currentVersionId,
  onClose,
  onVersionSelect,
  onCompare,
  onRestore,
  onDownload,
  className,
}: VersionSidebarProps) {
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string | null>(null);

  const handleVersionClick = (version: SnippetVersion) => {
    if (compareMode && selectedForCompare && selectedForCompare !== version.id) {
      const v1 = versions.find(v => v.id === selectedForCompare);
      if (v1 && onCompare) {
        onCompare(v1, version);
      }
      setCompareMode(false);
      setSelectedForCompare(null);
    } else if (compareMode) {
      setSelectedForCompare(version.id);
    } else {
      onVersionSelect(version);
    }
  };

  return (
    <aside className={cn('sidebar-panel animate-slide-in-right', className)}>
      <div className="sidebar-header">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-deep-blue-600 dark:text-deep-blue-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">版本历史</h3>
          <span className="badge badge-cyan">{versions.length}</span>
        </div>
        <div className="flex items-center gap-1">
          {onCompare && (
            <button
              onClick={() => {
                setCompareMode(!compareMode);
                setSelectedForCompare(null);
              }}
              className={cn(
                'flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors',
                compareMode
                  ? 'bg-electric-purple-100 text-electric-purple-700 dark:bg-electric-purple-900/30 dark:text-electric-purple-300'
                  : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              )}
            >
              <GitCompare className="h-3 w-3" />
              对比
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {compareMode && (
        <div className="bg-electric-purple-50 dark:bg-electric-purple-900/20 px-4 py-2 text-xs text-electric-purple-700 dark:text-electric-purple-300">
          {selectedForCompare
            ? '请选择要对比的第二个版本'
            : '请选择要对比的第一个版本'}
        </div>
      )}

      <div className="sidebar-content space-y-2">
        {versions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Clock className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">暂无版本历史</p>
          </div>
        ) : (
          versions.map((version) => (
            <VersionItem
              key={version.id}
              version={version}
              isActive={version.id === currentVersionId || version.id === selectedForCompare}
              onSelect={handleVersionClick}
              onRestore={onRestore}
              onDownload={onDownload}
            />
          ))
        )}
      </div>
    </aside>
  );
}

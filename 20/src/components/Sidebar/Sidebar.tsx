import { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  BookOpen,
  Plus,
  Search,
  Tag,
  Hash,
  BookMarked,
  Clock,
} from 'lucide-react';
import { useDrag, useDrop } from 'react-dnd';
import { useAppStore } from '../../store/useAppStore';
import type { TreeNode } from '../../types';
import { getRelativeTime } from '../../utils/helpers';

interface TreeItemProps {
  node: TreeNode;
  level: number;
  onSelect: (node: TreeNode) => void;
  onToggle: (id: string) => void;
  expanded: Set<string>;
  selectedId?: string;
}

function TreeItem({ node, level, onSelect, onToggle, expanded, selectedId }: TreeItemProps) {
  const isExpanded = expanded.has(node.id);
  const isSelected = selectedId === node.id;
  const isFolder = node.type === 'folder';
  const hasChildren = isFolder && node.children && node.children.length > 0;

  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'NOTE_OR_FOLDER',
    item: { id: node.id, type: node.type, path: node.path },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'NOTE_OR_FOLDER',
    canDrop: (item: { id: string; type: string }) => {
      return isFolder && item.id !== node.id;
    },
    drop: (item: { id: string }) => {
      useAppStore.getState().moveNode(item.id, node.id);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFolder) {
      onToggle(node.id);
    } else {
      onSelect(node);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isFolder) {
      onSelect(node);
    }
  };

  return (
    <div ref={drop} className={isOver && canDrop ? 'drag-over rounded-md' : ''}>
      <div
        ref={drag}
        className={`tree-item ${isSelected ? 'active' : ''} ${isDragging ? 'dragging' : ''}`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        {isFolder ? (
          <span className="flex-shrink-0 text-[var(--text-muted)]">
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </span>
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}

        <span className="flex-shrink-0">
          {isFolder ? (
            isExpanded ? (
              <FolderOpen size={16} className="text-[var(--accent-amber)]" />
            ) : (
              <Folder size={16} className="text-[var(--accent-amber)]" />
            )
          ) : node.encrypted ? (
            <span className="text-sm">🔒</span>
          ) : (
            <FileText size={16} className="text-[var(--text-muted)]" />
          )}
        </span>

        <span className="truncate flex-1">{node.name.replace(/\.md$/, '')}</span>

        {node.tags && node.tags.length > 0 && (
          <span className="flex-shrink-0 text-xs text-[var(--accent-primary)]">
            #{node.tags[0]}
          </span>
        )}
      </div>

      {isFolder && hasChildren && isExpanded && (
        <div className="tree-item-children">
          {node.children!.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              onToggle={onToggle}
              expanded={expanded}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const {
    fileTree,
    expandedFolders,
    currentNote,
    toggleFolder,
    loadNote,
    tags,
    pinnedNotes,
    currentNotebook,
    versions,
    activeTagFilter,
    filterByTag,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'files' | 'tags' | 'backlinks' | 'history'>('files');

  const handleSelectNote = async (node: TreeNode) => {
    if (node.type === 'note') {
      await loadNote(node.path);
    }
  };

  const renderFilesTab = () => (
    <div className="flex-1 overflow-y-auto py-2">
      {!currentNotebook ? (
        <div className="px-4 py-8 text-center text-[var(--text-muted)]">
          <BookOpen size={48} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm mb-2">没有打开的笔记本</p>
          <button className="btn btn-primary text-sm">
            <Plus size={16} />
            打开笔记本
          </button>
        </div>
      ) : fileTree.length === 0 ? (
        <div className="px-4 py-8 text-center text-[var(--text-muted)]">
          <FileText size={48} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm mb-2">暂无笔记</p>
          <p className="text-xs">点击 + 创建第一个笔记</p>
        </div>
      ) : (
        fileTree.map((node) => (
          <TreeItem
            key={node.id}
            node={node}
            level={0}
            onSelect={handleSelectNote}
            onToggle={toggleFolder}
            expanded={expandedFolders}
            selectedId={currentNote?.id}
          />
        ))
      )}
    </div>
  );

  const renderTagsTab = () => (
    <div className="flex-1 overflow-y-auto py-4 px-4">
      {activeTagFilter && (
        <div className="mb-4 p-3 bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hash size={14} className="text-[var(--accent-primary)]" />
            <span className="text-sm text-[var(--text-primary)]">
              正在筛选: <span className="font-medium">#{activeTagFilter}</span>
            </span>
          </div>
          <button
            onClick={() => filterByTag(null)}
            className="text-xs px-2 py-1 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            清除筛选
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {tags.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] text-center w-full py-8">
            暂无标签
            <br />
            <span className="text-xs">在笔记中使用 #标签名 创建标签</span>
          </p>
        ) : (
          tags
            .sort((a, b) => b.count - a.count)
            .map((tag) => {
              const maxCount = Math.max(...tags.map((t) => t.count));
              const size = 0.8 + (tag.count / maxCount) * 0.6;
              const isActive = activeTagFilter === tag.name;
              return (
                <span
                  key={tag.name}
                  className={`tag-cloud-item cursor-pointer inline-flex items-center gap-1 px-3 py-1 rounded-full transition-all ${
                    isActive
                      ? 'bg-[var(--accent-primary)] text-white'
                      : 'bg-[var(--bg-tertiary)] hover:bg-[var(--accent-primary)] hover:text-white'
                  }`}
                  style={{ fontSize: `${size}rem` }}
                  onClick={() => filterByTag(isActive ? null : tag.name)}
                >
                  <Hash size={12} />
                  {tag.name}
                  <span className="text-xs opacity-70">{tag.count}</span>
                </span>
              );
            })
        )}
      </div>

      {activeTagFilter && (
        <div className="mt-6">
          <h4 className="text-sm font-medium mb-3 text-[var(--text-primary)]">包含该标签的笔记</h4>
          <div className="space-y-1">
            {(() => {
              return fileTree
                .filter((node) => node.type === 'note' && node.tags?.includes(activeTagFilter))
                .map((node) => (
                  <div
                    key={node.id}
                    onClick={() => handleSelectNote(node)}
                    className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors ${
                      currentNote?.id === node.id
                        ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                        : 'hover:bg-[var(--bg-tertiary)]'
                    }`}
                  >
                    <FileText size={14} />
                    <span className="truncate text-sm">{node.name.replace(/\.md$/, '')}</span>
                  </div>
                ));
            })()}
          </div>
        </div>
      )}
    </div>
  );

  const renderBacklinksTab = () => (
    <div className="flex-1 overflow-y-auto py-2">
      {!currentNote ? (
        <p className="text-sm text-[var(--text-muted)] text-center py-8 px-4">
          选择笔记查看反向链接
        </p>
      ) : currentNote.backlinks.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] text-center py-8 px-4">
          暂无反向链接
          <br />
          <span className="text-xs">在其他笔记中使用 [[{currentNote.title}]] 创建链接</span>
        </p>
      ) : (
        currentNote.backlinks.map((link, index) => (
          <div
            key={index}
            className="tree-item cursor-pointer hover:bg-[var(--bg-tertiary)]"
            onClick={() => loadNote(link.sourceNotePath)}
          >
            <FileText size={16} className="text-[var(--text-muted)]" />
            <span className="truncate">{link.sourceNoteTitle}</span>
          </div>
        ))
      )}
    </div>
  );

  const renderHistoryTab = () => (
    <div className="flex-1 overflow-y-auto py-2">
      {!currentNote ? (
        <p className="text-sm text-[var(--text-muted)] text-center py-8 px-4">
          选择笔记查看版本历史
        </p>
      ) : versions.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] text-center py-8 px-4">
          暂无历史版本
          <br />
          <span className="text-xs">保存笔记时会自动创建快照</span>
        </p>
      ) : (
        versions.map((version, index) => (
          <div
            key={version.id}
            className="px-4 py-3 border-b border-[var(--border-color)] last:border-b-0 hover:bg-[var(--bg-tertiary)] cursor-pointer"
            onClick={() => console.log('Restore version:', version.id)}
          >
            <div className="flex items-center gap-2 text-sm">
              <Clock size={14} className="text-[var(--text-muted)]" />
              <span>{getRelativeTime(version.timestamp)}</span>
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1">
              {formatFileSize(version.size)} · {version.message || '自动保存'}
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div
      className="w-72 flex flex-col bg-[var(--bg-secondary)]"
      style={{ minWidth: '240px', maxWidth: '360px' }}
    >
      <div className="p-4 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-2 mb-3">
          <BookMarked size={20} className="text-[var(--accent-primary)]" />
          <h2 className="font-semibold">
            {currentNotebook?.name || 'MarkNote'}
          </h2>
        </div>
        <div
          className="relative"
          onClick={() => {
            const event = new CustomEvent('open-search');
            window.dispatchEvent(event);
          }}
        >
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="搜索笔记..."
            className="input pl-10 py-1.5 text-sm"
            readOnly
          />
        </div>
      </div>

      <div className="flex border-b border-[var(--border-color)]">
        {[
          { id: 'files', icon: Folder, label: '文件' },
          { id: 'tags', icon: Tag, label: '标签' },
          { id: 'backlinks', icon: Hash, label: '反向链接' },
          { id: 'history', icon: Clock, label: '历史' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex-1 py-2 flex flex-col items-center gap-0.5 transition-colors ${
              activeTab === tab.id
                ? 'text-[var(--accent-primary)] border-b-2 border-[var(--accent-primary)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <tab.icon size={16} />
            <span className="text-[10px]">{tab.label}</span>
          </button>
        ))}
      </div>

      {pinnedNotes.length > 0 && (
        <div className="border-b border-[var(--border-color)] py-2 px-3">
          <div className="text-xs text-[var(--text-muted)] mb-2 px-1 font-medium">
            固定笔记
          </div>
          {pinnedNotes.slice(0, 3).map((pinned) => (
            <div
              key={pinned.notePath}
              className="tree-item text-sm"
              onClick={() => loadNote(pinned.notePath)}
            >
              <span className="text-[var(--accent-amber)]">📌</span>
              <span className="truncate">{pinned.noteTitle}</span>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'files' && renderFilesTab()}
      {activeTab === 'tags' && renderTagsTab()}
      {activeTab === 'backlinks' && renderBacklinksTab()}
      {activeTab === 'history' && renderHistoryTab()}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

import {
  Search,
  Settings,
  Save,
  Plus,
  FolderPlus,
  Download,
  Pin,
  PinOff,
  History,
  Lock,
  SplitSquareVertical,
  Edit3,
  Eye,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useSettingsStore } from '../../store/useSettingsStore';

interface ToolbarProps {
  onSearch: () => void;
  onSettings: () => void;
  onSave: () => void;
  unsavedChanges: boolean;
}

export default function Toolbar({ onSearch, onSettings, onSave, unsavedChanges }: ToolbarProps) {
  const {
    currentNote,
    currentNotebook,
    viewMode,
    showSidebar,
    setViewMode,
    toggleSidebar,
    createNote,
    pinNote,
    unpinNote,
    pinnedNotes,
  } = useAppStore();

  const { settings, setTheme } = useSettingsStore();

  const isPinned = currentNote ? pinnedNotes.some((p) => p.notePath === currentNote.path) : false;

  const handleNewNote = async () => {
    if (!currentNotebook) return;
    const title = prompt('请输入笔记标题:');
    if (title) {
      await createNote(currentNotebook.path, title);
    }
  };

  const handleNewFolder = () => {
    console.log('New folder');
  };

  const handleExport = async (format: 'pdf' | 'html' | 'image' | 'zip') => {
    if (!currentNote || !window.electronAPI) return;

    const result = (await window.electronAPI.app.showSaveDialog({
      title: `导出为 ${format.toUpperCase()}`,
      defaultPath: `${currentNote.title}.${format === 'image' ? 'png' : format}`,
    })) as { filePath?: string };

    if (result.filePath) {
      const previewEl = document.querySelector('.markdown-preview');
      if (previewEl) {
        const html = previewEl.innerHTML;
        if (format === 'html') {
          await window.electronAPI.export.html(html, result.filePath);
        } else if (format === 'pdf') {
          await window.electronAPI.export.pdf(html, result.filePath);
        } else if (format === 'image' && previewEl) {
          try {
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(previewEl as HTMLElement, {
              backgroundColor: null,
              scale: 2,
            });
            const dataUrl = canvas.toDataURL('image/png');
            await window.electronAPI.export.image(dataUrl, result.filePath);
          } catch (error) {
            console.error('Export image error:', error);
          }
        }
      }
    }
  };

  const handlePinToggle = async () => {
    if (!currentNote) return;
    if (isPinned) {
      await unpinNote(currentNote.path);
    } else {
      await pinNote(currentNote.path, currentNote.title);
    }
  };

  const handleEncrypt = async () => {
    if (!currentNote || !window.electronAPI) return;
    const password = prompt('请设置密码:');
    if (password) {
      const encrypted = (await window.electronAPI.crypto.encrypt(currentNote.content, password)) as string;
      const noteContent = `ENCRYPTED:${encrypted}`;
      await window.electronAPI.file.write(currentNote.path, noteContent, true, password);
    }
  };

  const handleVersionHistory = () => {
    console.log('Version history');
  };

  return (
    <div
      className="h-12 flex items-center justify-between px-4 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex-shrink-0"
      style={({ WebkitAppRegion: 'drag' } as React.CSSProperties & { WebkitAppRegion: string })}
    >
      <div className="flex items-center gap-1" style={({ WebkitAppRegion: 'no-drag' } as React.CSSProperties & { WebkitAppRegion: string })}>
        <button
          onClick={toggleSidebar}
          className="btn btn-ghost !p-2"
          title={showSidebar ? '隐藏侧边栏' : '显示侧边栏'}
        >
          {showSidebar ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
        </button>

        <div className="w-px h-5 bg-[var(--border-color)] mx-1" />

        <button onClick={handleNewNote} className="btn btn-ghost !p-2" title="新建笔记 (⌘N)">
          <Plus size={18} />
        </button>

        <button onClick={handleNewFolder} className="btn btn-ghost !p-2" title="新建文件夹">
          <FolderPlus size={18} />
        </button>

        <div className="w-px h-5 bg-[var(--border-color)] mx-1" />

        <div className="flex items-center bg-[var(--bg-tertiary)] rounded-md p-0.5">
          <button
            onClick={() => setViewMode('editor')}
            className={`btn !p-1.5 ${viewMode === 'editor' ? 'bg-[var(--bg-secondary)] shadow-sm' : '!bg-transparent'}`}
            title="仅编辑"
          >
            <Edit3 size={16} />
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`btn !p-1.5 ${viewMode === 'split' ? 'bg-[var(--bg-secondary)] shadow-sm' : '!bg-transparent'}`}
            title="分栏视图"
          >
            <SplitSquareVertical size={16} />
          </button>
          <button
            onClick={() => setViewMode('preview')}
            className={`btn !p-1.5 ${viewMode === 'preview' ? 'bg-[var(--bg-secondary)] shadow-sm' : '!bg-transparent'}`}
            title="仅预览"
          >
            <Eye size={16} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1" style={({ WebkitAppRegion: 'no-drag' } as React.CSSProperties & { WebkitAppRegion: string })}>
        {currentNote && (
          <>
            <button
              onClick={onSave}
              className={`btn !py-1.5 !px-3 ${unsavedChanges ? 'btn-primary' : 'btn-ghost'}`}
              title="保存 (⌘S)"
            >
              <Save size={16} />
              <span className="text-sm">{unsavedChanges ? '保存*' : '保存'}</span>
            </button>

            <div className="relative group">
              <button className="btn btn-ghost !p-2" title="导出">
                <Download size={18} />
              </button>
              <div className="absolute right-0 top-full mt-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg shadow-lg py-1 min-w-[120px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <button
                  onClick={() => handleExport('pdf')}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)]"
                >
                  导出 PDF
                </button>
                <button
                  onClick={() => handleExport('html')}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)]"
                >
                  导出 HTML
                </button>
                <button
                  onClick={() => handleExport('image')}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)]"
                >
                  导出图片
                </button>
                <button
                  onClick={() => handleExport('zip')}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)]"
                >
                  导出 Zip
                </button>
              </div>
            </div>

            <button
              onClick={handlePinToggle}
              className="btn btn-ghost !p-2"
              title={isPinned ? '取消固定' : '固定到托盘'}
            >
              {isPinned ? <Pin size={18} className="text-[var(--accent-amber)]" /> : <PinOff size={18} />}
            </button>

            <button onClick={handleEncrypt} className="btn btn-ghost !p-2" title="加密笔记">
              <Lock size={18} />
            </button>

            <button onClick={handleVersionHistory} className="btn btn-ghost !p-2" title="版本历史">
              <History size={18} />
            </button>

            <div className="w-px h-5 bg-[var(--border-color)] mx-1" />
          </>
        )}

        <div className="relative group">
          <button className="btn btn-ghost !p-2" title="主题">
            {settings.theme === 'dark' ? '🌙' : settings.theme === 'light' ? '☀️' : '🖥️'}
          </button>
          <div className="absolute right-0 top-full mt-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg shadow-lg py-1 min-w-[120px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
            <button
              onClick={() => setTheme('light')}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] flex items-center gap-2 ${settings.theme === 'light' ? 'text-[var(--accent-primary)]' : ''}`}
            >
              ☀️ 亮色
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] flex items-center gap-2 ${settings.theme === 'dark' ? 'text-[var(--accent-primary)]' : ''}`}
            >
              🌙 暗色
            </button>
            <button
              onClick={() => setTheme('system')}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] flex items-center gap-2 ${settings.theme === 'system' ? 'text-[var(--accent-primary)]' : ''}`}
            >
              🖥️ 跟随系统
            </button>
          </div>
        </div>

        <button onClick={onSearch} className="btn btn-ghost !p-2" title="搜索 (⌘K)">
          <Search size={18} />
        </button>

        <button onClick={onSettings} className="btn btn-ghost !p-2" title="设置 (⌘⇧P)">
          <Settings size={18} />
        </button>
      </div>
    </div>
  );
}

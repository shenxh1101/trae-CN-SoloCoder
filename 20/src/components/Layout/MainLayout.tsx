import { useState, useCallback, useEffect, useRef } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import Sidebar from '../Sidebar/Sidebar';
import Toolbar from '../Toolbar/Toolbar';
import MarkdownEditor from '../Editor/MarkdownEditor';
import MarkdownPreview from '../Preview/MarkdownPreview';
import StatusBar from '../StatusBar/StatusBar';
import SearchModal from '../Search/SearchModal';
import SettingsModal from '../Settings/SettingsModal';
import { useAppStore } from '../../store/useAppStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useSearchStore } from '../../store/useSearchStore';
import { debounce } from '../../utils/helpers';

export default function MainLayout() {
  const {
    currentNote,
    showSidebar,
    viewMode,
    editorWidth,
    previewWidth,
    unsavedChanges,
    updateNote,
    saveNote,
    setUnsavedChanges,
    setEditorWidth,
    setPreviewWidth,
    loadNote,
  } = useAppStore();

  const { settings } = useSettingsStore();
  const { search, clearSearch } = useSearchStore();

  const [showSearch, setShowSearch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (query.trim()) {
        await search(query);
      } else {
        clearSearch();
      }
    }, 300),
    [search, clearSearch]
  );

  const handleContentChange = useCallback(
    (newContent: string) => {
      if (!currentNote) return;

      updateNote(currentNote.id, { content: newContent });
      setUnsavedChanges(true);

      if (settings.autoSave && autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      if (settings.autoSave) {
        autoSaveTimerRef.current = setTimeout(async () => {
          if (currentNote) {
            await saveNote(currentNote.id);
          }
        }, settings.autoSaveInterval);
      }
    },
    [currentNote, updateNote, setUnsavedChanges, saveNote, settings.autoSave, settings.autoSaveInterval]
  );

  const handleSave = useCallback(async () => {
    if (currentNote) {
      await saveNote(currentNote.id);
    }
  }, [currentNote, saveNote]);

  const handleWikiLinkClick = useCallback(
    async (targetName: string, anchor?: string) => {
      console.log('Wiki link clicked:', targetName, anchor);
    },
    []
  );

  const handleTagClick = useCallback((tag: string) => {
    console.log('Tag clicked:', tag);
    setShowSearch(true);
  }, []);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleResizeMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;
      const container = document.getElementById('editor-preview-container');
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const percentage = ((e.clientX - rect.left) / rect.width) * 100;
      const newEditorWidth = Math.max(20, Math.min(80, percentage));
      setEditorWidth(newEditorWidth);
      setPreviewWidth(100 - newEditorWidth);
    },
    [isResizing, setEditorWidth, setPreviewWidth]
  );

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }
    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'p') {
        e.preventDefault();
        setShowSettings(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.on('tray:openNote', (notePath: unknown) => {
        loadNote(notePath as string);
      });
      window.electronAPI.on('tray:newNote', () => {
        console.log('Create new note from tray');
      });
    }
  }, [loadNote]);

  const renderEditorArea = () => {
    if (!currentNote) {
      return (
        <div className="flex-1 flex items-center justify-center bg-[var(--bg-secondary)]">
          <div className="text-center text-[var(--text-muted)]">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-xl font-semibold mb-2">欢迎使用 MarkNote</h2>
            <p className="text-sm">选择左侧笔记或创建新笔记开始编辑</p>
            <p className="text-xs mt-4 opacity-60">
              快捷键: ⌘N 新建笔记 · ⌘S 保存 · ⌘K 搜索 · ⌘⇧P 设置
            </p>
          </div>
        </div>
      );
    }

    if (currentNote.encrypted) {
      return (
        <div className="flex-1 flex items-center justify-center bg-[var(--bg-secondary)]">
          <div className="card max-w-md text-center">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-lg font-semibold mb-2">笔记已加密</h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">请输入密码以查看内容</p>
            <input
              type="password"
              className="input mb-4"
              placeholder="输入密码"
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  const password = (e.target as HTMLInputElement).value;
                  if (window.electronAPI && currentNote) {
                    const decrypted = (await window.electronAPI.crypto.decrypt(
                      currentNote.content.slice(10),
                      password
                    )) as string | null;
                    if (decrypted) {
                      updateNote(currentNote.id, { content: decrypted, encrypted: false });
                    }
                  }
                }
              }}
            />
          </div>
        </div>
      );
    }

    if (viewMode === 'editor') {
      return (
        <div className="flex-1 h-full">
          <MarkdownEditor
            content={currentNote.content}
            onChange={handleContentChange}
            onSave={handleSave}
          />
        </div>
      );
    }

    if (viewMode === 'preview') {
      return (
        <div className="flex-1 h-full bg-[var(--bg-primary)]">
          <MarkdownPreview
            content={currentNote.content}
            onWikiLinkClick={handleWikiLinkClick}
            onTagClick={handleTagClick}
          />
        </div>
      );
    }

    return (
      <div id="editor-preview-container" className="flex-1 flex h-full overflow-hidden">
        <div
          className="h-full overflow-hidden"
          style={{ width: `${editorWidth}%`, minWidth: '300px' }}
        >
          <MarkdownEditor
            content={currentNote.content}
            onChange={handleContentChange}
            onSave={handleSave}
          />
        </div>
        <div
          className={`resizer flex-shrink-0 h-full ${isResizing ? 'active' : ''}`}
          onMouseDown={handleResizeStart}
        />
        <div
          className="h-full overflow-hidden bg-[var(--bg-primary)]"
          style={{ width: `${previewWidth}%`, minWidth: '300px' }}
        >
          <MarkdownPreview
            content={currentNote.content}
            onWikiLinkClick={handleWikiLinkClick}
            onTagClick={handleTagClick}
          />
        </div>
      </div>
    );
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-screen w-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden">
        <Toolbar
          onSearch={() => setShowSearch(true)}
          onSettings={() => setShowSettings(true)}
          onSave={handleSave}
          unsavedChanges={unsavedChanges}
        />
        <div className="flex-1 flex overflow-hidden">
          {showSidebar && (
            <>
              <Sidebar />
              <div className="w-px bg-[var(--border-color)] flex-shrink-0" />
            </>
          )}
          <div className="flex-1 flex flex-col overflow-hidden">
            {renderEditorArea()}
          </div>
        </div>
        <StatusBar />

        {showSearch && (
          <SearchModal
            onClose={() => setShowSearch(false)}
            onSearch={debouncedSearch}
          />
        )}

        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      </div>
    </DndProvider>
  );
}

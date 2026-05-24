import { Save, Cloud, CloudOff, FileText, Hash, Clock, CheckCircle } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { formatDate } from '../../utils/helpers';

export default function StatusBar() {
  const { currentNote, unsavedChanges, loading } = useAppStore();
  const { settings } = useSettingsStore();

  const wordCount = currentNote ? currentNote.content.replace(/\s/g, '').length : 0;
  const charCount = currentNote ? currentNote.content.length : 0;
  const lineCount = currentNote ? currentNote.content.split('\n').length : 0;

  return (
    <div className="h-7 flex items-center justify-between px-4 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-muted)] text-xs flex-shrink-0">
      <div className="flex items-center gap-4">
        {currentNote ? (
          <>
            <div className="flex items-center gap-1">
              <FileText size={12} />
              <span>{currentNote.title}</span>
            </div>
            <div className="flex items-center gap-1">
              <Hash size={12} />
              <span>{lineCount} 行</span>
            </div>
            <div className="flex items-center gap-1">
              <span>{wordCount} 字</span>
            </div>
            <div className="flex items-center gap-1">
              <span>{charCount} 字符</span>
            </div>
            {currentNote.tags && currentNote.tags.length > 0 && (
              <div className="flex items-center gap-1">
                <span>🏷️ {currentNote.tags.join(', ')}</span>
              </div>
            )}
          </>
        ) : (
          <span>未打开笔记</span>
        )}
      </div>

      <div className="flex items-center gap-4">
        {loading && (
          <div className="flex items-center gap-1">
            <span className="animate-pulse">加载中...</span>
          </div>
        )}

        {unsavedChanges && (
          <div className="flex items-center gap-1 text-[var(--accent-amber)]">
            <Save size={12} />
            <span>未保存</span>
          </div>
        )}

        {!unsavedChanges && currentNote && (
          <div className="flex items-center gap-1 text-[var(--accent-green)]">
            <CheckCircle size={12} />
            <span>已保存</span>
          </div>
        )}

        {settings.autoSave && (
          <div className="flex items-center gap-1">
            <Cloud size={12} />
            <span>自动保存</span>
          </div>
        )}

        {!settings.autoSave && (
          <div className="flex items-center gap-1">
            <CloudOff size={12} />
            <span>手动保存</span>
          </div>
        )}

        {currentNote && (
          <div className="flex items-center gap-1">
            <Clock size={12} />
            <span>更新于 {formatDate(currentNote.updatedAt, 'HH:mm')}</span>
          </div>
        )}

        <div className="flex items-center gap-1">
          <span>UTF-8</span>
        </div>

        <div className="flex items-center gap-1">
          <span>Markdown</span>
        </div>
      </div>
    </div>
  );
}

import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Play,
  Save,
  Share2,
  Users,
  ChevronDown,
  Clock,
  GitBranch,
  MessageSquare,
  Settings,
  Copy,
  Check,
  Globe,
  Lock,
  Loader2,
  Code2,
  Plus,
  Trash2,
  Edit3,
  Tag,
  X,
  GitCompare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Navbar from '@/components/layout/Navbar';
import CodeEditor from '@/components/editor/CodeEditor';
import RunPanel from '@/components/editor/RunPanel';
import Modal from '@/components/common/Modal';
import DiffViewer from '@/components/editor/DiffViewer';
import { useAuthStore } from '@/stores/useAuthStore';
import { useEditorStore } from '@/stores/useEditorStore';
import { useSnippetStore } from '@/stores/useSnippetStore';
import { apiClient } from '@/lib/apiClient';
import type { Language, RunResponse, SnippetVersion, Comment, Snippet } from '@/shared/types';

const languageOptions: { value: Language; label: string; icon: string }[] = [
  { value: 'javascript', label: 'JavaScript', icon: 'JS' },
  { value: 'python', label: 'Python', icon: 'PY' },
  { value: 'go', label: 'Go', icon: 'GO' },
  { value: 'rust', label: 'Rust', icon: 'RS' },
];

const defaultVersions: SnippetVersion[] = [
  {
    id: 'v1',
    snippetId: '1',
    version: '1.0',
    label: '初始版本',
    code: '// 初始代码\nconsole.log("Hello World");',
    language: 'javascript',
    createdAt: new Date('2024-01-01'),
  },
];

const defaultComments: Comment[] = [
  {
    id: 'c1',
    snippetId: '1',
    authorId: 'u1',
    author: {
      id: 'u1',
      username: 'demo_user',
      email: 'demo@example.com',
      createdAt: new Date(),
    },
    content: '这段代码写得很好！可以考虑添加错误处理。',
    lineNumber: 5,
    createdAt: new Date('2024-01-15'),
  },
];

type RightPanelTab = 'run' | 'versions' | 'comments';

export default function EditorPage() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { code, language, settings, setCode, setLanguage } = useEditorStore();
  const { currentSnippet, isLoading, fetchSnippetByShortCode, createSnippet, updateSnippet, setCurrentSnippet } = useSnippetStore();
  
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<RunResponse | null>(null);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showVersionDropdown, setShowVersionDropdown] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('run');
  const [versions, setVersions] = useState<SnippetVersion[]>(defaultVersions);
  const [comments, setComments] = useState<Comment[]>(defaultComments);
  const [newComment, setNewComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [title, setTitle] = useState('未命名代码片段');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [collaborators, setCollaborators] = useState<string[]>([]);
  const [selectedVersions, setSelectedVersions] = useState<Set<string>>(new Set());
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [diffVersions, setDiffVersions] = useState<{ old: SnippetVersion; new: SnippetVersion } | null>(null);

  const isNew = shortCode === 'new';

  useEffect(() => {
    if (!isNew && shortCode) {
      fetchSnippetByShortCode(shortCode);
    } else {
      setCurrentSnippet(null);
    }
  }, [isNew, shortCode, fetchSnippetByShortCode, setCurrentSnippet]);

  useEffect(() => {
    if (currentSnippet && !isNew) {
      setTitle(currentSnippet.title);
      setDescription(currentSnippet.description || '');
      setTags(currentSnippet.tags);
      setIsPublic(currentSnippet.isPublic);
      setCode(currentSnippet.code);
      setLanguage(currentSnippet.language);
    }
  }, [currentSnippet, isNew, setCode, setLanguage]);

  const handleRun = useCallback(async (stdin: string) => {
    setIsRunning(true);
    setRunResult(null);
    try {
      const { data } = await apiClient.post<RunResponse>('/run', {
        language,
        code,
        stdin,
      });
      setRunResult(data);
      return data;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setRunResult({
        stdout: '',
        stderr: error.response?.data?.message || '运行失败',
        exitCode: 1,
        executionTime: 0,
        memoryUsed: 0,
        error: error.response?.data?.message,
      });
      return null;
    } finally {
      setIsRunning(false);
    }
  }, [language, code]);

  const handleSave = useCallback(async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setIsSaving(true);
    try {
      const snippetData = {
        title,
        description,
        language,
        code,
        isPublic,
        tags,
      };
      
      if (isNew) {
        const result = await createSnippet(snippetData);
        navigate(`/editor/${result.shortCode}`);
      } else if (currentSnippet) {
        await updateSnippet(currentSnippet.id, snippetData);
      }
    } catch {
      // 错误已在 store 中处理
    } finally {
      setIsSaving(false);
    }
  }, [user, title, description, language, code, isPublic, tags, isNew, currentSnippet, createSnippet, updateSnippet, navigate]);

  const handleShare = useCallback(async () => {
    if (isNew) {
      await handleSave();
    }
    setShowShareModal(true);
  }, [isNew, handleSave]);

  const handleCopyLink = useCallback(async () => {
    const url = window.location.href;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleAddTag = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim() && !tags.includes(tagInput.trim())) {
      e.preventDefault();
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  }, [tagInput, tags]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  }, [tags]);

  const handleVersionSelect = useCallback((versionId: string) => {
    setSelectedVersions((prev) => {
      const next = new Set(prev);
      if (next.has(versionId)) {
        next.delete(versionId);
      } else {
        if (next.size >= 2) {
          const first = next.values().next().value;
          next.delete(first);
        }
        next.add(versionId);
      }
      return next;
    });
  }, []);

  const handleCompareVersions = useCallback(() => {
    const selectedArray = Array.from(selectedVersions);
    if (selectedArray.length !== 2) return;

    const v1 = versions.find(v => v.id === selectedArray[0]);
    const v2 = versions.find(v => v.id === selectedArray[1]);

    if (!v1 || !v2) return;

    const d1 = new Date(v1.createdAt);
    const d2 = new Date(v2.createdAt);

    if (d1 <= d2) {
      setDiffVersions({ old: v1, new: v2 });
    } else {
      setDiffVersions({ old: v2, new: v1 });
    }

    setShowDiffModal(true);
  }, [selectedVersions, versions]);

  const handleAddComment = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;
    
    const comment: Comment = {
      id: `c${Date.now()}`,
      snippetId: currentSnippet?.id || 'temp',
      authorId: user.id,
      author: user,
      content: newComment.trim(),
      createdAt: new Date(),
    };
    setComments([comment, ...comments]);
    setNewComment('');
  }, [newComment, user, currentSnippet, comments]);

  const handleLanguageChange = useCallback((lang: Language) => {
    setLanguage(lang);
    setShowLanguageDropdown(false);
  }, [setLanguage]);

  const handleNewSnippet = () => {
    navigate('/editor/new');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const currentLang = languageOptions.find(l => l.value === language) || languageOptions[0];

  const rightPanelTabs = [
    { key: 'run' as const, label: '运行', icon: Play },
    { key: 'versions' as const, label: '版本', icon: GitBranch, count: versions.length },
    { key: 'comments' as const, label: '评论', icon: MessageSquare, count: comments.length },
  ];

  return (
    <div className="flex h-screen flex-col bg-gray-50 dark:bg-gray-950">
      <Navbar
        user={user}
        onNewSnippet={handleNewSnippet}
        onLogout={logout}
        onLogin={handleLogin}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {isEditingTitle ? (
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={() => setIsEditingTitle(false)}
                    onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
                    className="rounded-md border border-gray-300 bg-gray-50 px-2 py-1 text-lg font-semibold text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    autoFocus
                  />
                ) : (
                  <button
                    onClick={() => setIsEditingTitle(true)}
                    className="group flex items-center gap-2"
                  >
                    <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {title}
                    </h1>
                    <Edit3 className="h-4 w-4 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                )}
                
                <button
                  onClick={() => setIsPublic(!isPublic)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                    isPublic
                      ? 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                  )}
                >
                  {isPublic ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                  {isPublic ? '公开' : '私有'}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <span className="rounded bg-gray-200 px-1.5 py-0.5 text-xs font-mono font-bold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                    {currentLang.icon}
                  </span>
                  {currentLang.label}
                  <ChevronDown className={cn('h-4 w-4 transition-transform', { 'rotate-180': showLanguageDropdown })} />
                </button>
                
                {showLanguageDropdown && (
                  <div className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                    {languageOptions.map((lang) => (
                      <button
                        key={lang.value}
                        onClick={() => handleLanguageChange(lang.value)}
                        className={cn(
                          'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                          language === lang.value
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                        )}
                      >
                        <span className="rounded bg-gray-200 px-1.5 py-0.5 text-xs font-mono font-bold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                          {lang.icon}
                        </span>
                        {lang.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowVersionDropdown(!showVersionDropdown)}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <GitBranch className="h-4 w-4" />
                  v1.0
                  <ChevronDown className={cn('h-4 w-4 transition-transform', { 'rotate-180': showVersionDropdown })} />
                </button>
                
                {showVersionDropdown && (
                  <div className="absolute right-0 top-full z-20 mt-1 w-64 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                    <div className="border-b border-gray-100 px-3 py-2 dark:border-gray-700">
                      <button className="flex w-full items-center gap-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">
                        <Plus className="h-4 w-4" />
                        保存新版本
                      </button>
                    </div>
                    {versions.map((version) => (
                      <button
                        key={version.id}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        <div>
                          <div className="font-medium">{version.version}</div>
                          <div className="text-xs text-gray-500">{version.label}</div>
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(version.createdAt).toLocaleDateString()}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => setCollaborators(user ? [user.username, 'collab1'] : ['collab1'])}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <Users className="h-4 w-4" />
                协作
                {collaborators.length > 0 && (
                  <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    {collaborators.length}
                  </span>
                )}
              </button>

              <button
                onClick={handleShare}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <Share2 className="h-4 w-4" />
                分享
              </button>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isSaving ? '保存中...' : '保存'}
              </button>

              <button
                onClick={() => handleRun('')}
                disabled={isRunning}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 dark:bg-green-500 dark:hover:bg-green-600"
              >
                {isRunning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {isRunning ? '运行中...' : '运行'}
              </button>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-gray-400" />
              <div className="flex flex-wrap items-center gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  >
                    #{tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="添加标签..."
                  className="w-24 rounded-md bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none dark:text-gray-300"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-hidden p-4">
            <CodeEditor
              value={code}
              language={language}
              onChange={setCode}
              settings={settings}
            />
          </div>

          <div className="flex w-96 flex-col border-l border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="flex border-b border-gray-200 dark:border-gray-800">
              {rightPanelTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setRightPanelTab(tab.key)}
                    className={cn(
                      'relative flex-1 inline-flex items-center justify-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                      rightPanelTab === tab.key
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800">
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex-1 overflow-hidden">
              {rightPanelTab === 'run' && (
                <div className="h-full p-4">
                  <RunPanel
                    onRun={handleRun}
                    isRunning={isRunning}
                    result={runResult}
                  />
                </div>
              )}

              {rightPanelTab === 'versions' && (
                <div className="flex h-full flex-col">
                  {versions.length >= 2 && (
                    <div className="border-b border-gray-200 p-4 dark:border-gray-800">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          已选择 {selectedVersions.size}/2 个版本进行对比
                        </div>
                        <button
                          onClick={handleCompareVersions}
                          disabled={selectedVersions.size !== 2}
                          className={cn(
                            'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                            selectedVersions.size === 2
                              ? 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
                              : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
                          )}
                        >
                          <GitCompare className="h-4 w-4" />
                          对比
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="flex-1 overflow-auto p-4">
                    <div className="space-y-3">
                      {versions.map((version, index) => {
                        const isSelected = selectedVersions.has(version.id);
                        return (
                          <div
                            key={version.id}
                            onClick={() => handleVersionSelect(version.id)}
                            className={cn(
                              'cursor-pointer rounded-lg border p-4 transition-colors',
                              isSelected
                                ? 'border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/30'
                                : index === 0
                                  ? 'border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/10'
                                  : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50'
                            )}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <div className="mt-0.5">
                                  <div
                                    className={cn(
                                      'flex h-5 w-5 items-center justify-center rounded border-2',
                                      isSelected
                                        ? 'border-blue-500 bg-blue-500'
                                        : 'border-gray-300 dark:border-gray-600'
                                    )}
                                  >
                                    {isSelected && <Check className="h-3 w-3 text-white" />}
                                  </div>
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                      {version.version}
                                    </span>
                                    {index === 0 && (
                                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/50 dark:text-blue-400">
                                        当前
                                      </span>
                                    )}
                                  </div>
                                  {version.label && (
                                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                      {version.label}
                                    </p>
                                  )}
                                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                                    <Clock className="h-3.5 w-3.5" />
                                    {new Date(version.createdAt).toLocaleString()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {rightPanelTab === 'comments' && (
                <div className="flex h-full flex-col">
                  <div className="border-b border-gray-200 p-4 dark:border-gray-800">
                    <form onSubmit={handleAddComment} className="space-y-2">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder={user ? '添加评论...' : '登录后可以评论'}
                        className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                        rows={3}
                        disabled={!user}
                      />
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={!newComment.trim() || !user}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          发表评论
                        </button>
                      </div>
                    </form>
                  </div>
                  
                  <div className="flex-1 overflow-auto p-4">
                    <div className="space-y-4">
                      {comments.map((comment) => (
                        <div
                          key={comment.id}
                          className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/50"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                              <Code2 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {comment.author.username}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-500">
                                  {new Date(comment.createdAt).toLocaleString()}
                                </span>
                              </div>
                              {comment.lineNumber && (
                                <div className="mt-1 rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                                  第 {comment.lineNumber} 行
                                </div>
                              )}
                              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                                {comment.content}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              分享代码片段
            </h3>
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                分享链接
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={window.location.href}
                  readOnly
                  className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
                <button
                  onClick={handleCopyLink}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowShareModal(false)}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={showDiffModal}
        onClose={() => {
          setShowDiffModal(false);
          setDiffVersions(null);
        }}
        title="版本对比"
        maxWidth="max-w-5xl"
      >
        {diffVersions && (
          <DiffViewer
            oldCode={diffVersions.old.code}
            newCode={diffVersions.new.code}
            oldLabel={`版本 ${diffVersions.old.version}${diffVersions.old.label ? ` - ${diffVersions.old.label}` : ''}`}
            newLabel={`版本 ${diffVersions.new.version}${diffVersions.new.label ? ` - ${diffVersions.new.label}` : ''}`}
          />
        )}
      </Modal>

      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-xl bg-white p-8 shadow-xl dark:bg-gray-900">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-gray-600 dark:text-gray-400">加载中...</p>
          </div>
        </div>
      )}
    </div>
  );
}

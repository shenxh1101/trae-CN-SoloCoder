import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CodeEditor from '../components/CodeEditor.jsx';
import ChatPanel from '../components/ChatPanel.jsx';
import Sidebar from '../components/Sidebar.jsx';
import Header from '../components/Header.jsx';
import OutputPanel from '../components/OutputPanel.jsx';
import Modal from '../components/Modal.jsx';
import VersionHistory from '../components/VersionHistory.jsx';
import DiffViewer from '../components/DiffViewer.jsx';
import { connectSocket, getSocket, disconnectSocket } from '../utils/socket.js';
import { setupAutoSave, loadFromLocalStorage, removeFromLocalStorage } from '../utils/autosave.js';
import { executeCode, getLanguages, downloadFile, exportGist } from '../utils/api.js';

const EditorPage = ({ showToast }) => {
  const { snippetId } = useParams();
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const editorRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [languages, setLanguages] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [snippet, setSnippet] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [userStats, setUserStats] = useState({});
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [output, setOutput] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [diffVersions, setDiffVersions] = useState({ version1: null, version2: null });
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const loadLanguages = async () => {
      try {
        const data = await getLanguages();
        setLanguages(data.languages);
      } catch (err) {
        console.error('Failed to load languages:', err);
      }
    };
    loadLanguages();
  }, []);

  useEffect(() => {
    const savedName = localStorage.getItem('codesandbox:userName') || '';
    setUserName(savedName);

    const localSave = loadFromLocalStorage(snippetId);
    if (localSave) {
      setCode(localSave.code);
      setLanguage(localSave.language);
    }

    return () => {
      disconnectSocket();
    };
  }, [snippetId]);

  const joinSnippet = useCallback((pwd = '') => {
    const socket = connectSocket();
    socketRef.current = socket;

    const savedOwnerId = localStorage.getItem('codesandbox:ownerId');
    socket.emit('join-snippet', {
      snippetId,
      password: pwd,
      userName: userName || 'Anonymous',
      ownerId: savedOwnerId
    });

    socket.on('joined', (data) => {
      setLoading(false);
      setCurrentUser({ id: data.userId, color: data.userColor });
      setSnippet(data.snippet);
      setCode(data.snippet.code);
      setLanguage(data.snippet.language);
      setUsers(data.users);
      setChatMessages(data.chatMessages);
      setUserStats(data.userStats);
      setIsReadOnly(data.snippet.isReadOnly);
      setIsOwner(data.snippet.isOwner);
      setShowPasswordModal(false);

      localStorage.setItem('codesandbox:userName', userName || 'Anonymous');

      if (loadFromLocalStorage(snippetId)) {
        removeFromLocalStorage(snippetId);
      }

      showToast('已成功加入！', 'success');
    });

    socket.on('password-required', () => {
      setShowPasswordModal(true);
      setLoading(false);
    });

    socket.on('error', (data) => {
      showToast(data.message || '发生错误', 'error');
    });

    socket.on('code-change', (data) => {
      if (data.origin !== data.userId && data.origin !== currentUser?.id) {
        setCode(data.code);
      }
    });

    socket.on('code-reverted', (data) => {
      setCode(data.code);
      setLanguage(data.language);
      showToast('已回退到历史版本', 'info');
    });

    socket.on('language-changed', (data) => {
      setLanguage(data.language);
      const user = users.find(u => u.id === data.userId);
      showToast(`${user?.name || 'Someone'} 切换了编程语言`, 'info');
    });

    socket.on('cursor-move', (data) => {
      setUsers(prev => prev.map(u =>
        u.id === data.userId ? { ...u, cursor: data.cursor, selection: null } : u
      ));
    });

    socket.on('selection-change', (data) => {
      setUsers(prev => prev.map(u =>
        u.id === data.userId ? { ...u, cursor: data.cursor, selection: data.selection } : u
      ));
    });

    socket.on('user-joined', (user) => {
      setUsers(prev => [...prev, user]);
      showToast(`${user.name} 加入了协作`, 'info');
    });

    socket.on('user-left', (data) => {
      setUsers(prev => prev.filter(u => u.id !== data.userId));
      setTypingUsers(prev => {
        const next = new Set(prev);
        next.delete(data.userId);
        return next;
      });
    });

    socket.on('chat-message', (msg) => {
      setChatMessages(prev => [...prev, msg]);
    });

    socket.on('version-saved', (version) => {
      setHistory(prev => [version, ...prev]);
      showToast('版本已保存', 'success');
    });

    socket.on('read-only-changed', (data) => {
      setIsReadOnly(data.isReadOnly);
      const user = users.find(u => u.id === data.userId);
      showToast(`${user?.name || '房主'} 设置为 ${data.isReadOnly ? '只读' : '可编辑'} 模式`, 'info');
    });

    socket.on('user-stats-updated', (stats) => {
      setUserStats(stats);
    });

    socket.on('user-typing', (data) => {
      setTypingUsers(prev => {
        const next = new Set(prev);
        if (data.isTyping) {
          next.add(data.userId);
        } else {
          next.delete(data.userId);
        }
        return next;
      });
    });

    socket.on('snippet-deleted', () => {
      showToast('该代码片段已被删除', 'error');
      navigate('/');
    });

    socket.on('disconnect', () => {
      showToast('连接已断开，正在重连...', 'error');
    });

    socket.on('reconnect', () => {
      showToast('已重新连接', 'success');
      socket.emit('join-snippet', {
        snippetId,
        password: password,
        userName: userName || 'Anonymous'
      });
    });
  }, [snippetId, userName, currentUser, users, password, navigate, showToast]);

  useEffect(() => {
    joinSnippet(password);

    return () => {
      if (socketRef.current) {
        socketRef.current.off();
      }
    };
  }, [snippetId]);

  useEffect(() => {
    if (!snippet) return;

    const cleanup = setupAutoSave(
      snippetId,
      () => ({ code, language }),
      5000
    );

    return cleanup;
  }, [snippetId, code, language, snippet]);

  const handleCodeChange = useCallback((newCode, changes) => {
    setCode(newCode);
    
    if (socketRef.current && currentUser) {
      const changeData = changes?.changes?.[0];
      socketRef.current.emit('code-change', {
        code: newCode,
        from: changeData?.from,
        to: changeData?.to,
        text: changeData?.insert,
        origin: currentUser.id
      });

      socketRef.current.emit('user-typing', { isTyping: true });
      setTimeout(() => {
        if (socketRef.current) {
          socketRef.current.emit('user-typing', { isTyping: false });
        }
      }, 2000);
    }
  }, [currentUser]);

  const handleCursorChange = useCallback((cursor) => {
    if (socketRef.current && currentUser) {
      socketRef.current.emit('cursor-move', { cursor });
    }
  }, [currentUser]);

  const handleSelectionChange = useCallback((selection, cursor) => {
    if (socketRef.current && currentUser) {
      socketRef.current.emit('selection-change', { selection, cursor });
    }
  }, [currentUser]);

  const handleLanguageChange = (newLanguage) => {
    if (isReadOnly && !isOwner) {
      showToast('只有房主可以修改语言', 'error');
      return;
    }
    setLanguage(newLanguage);
    if (socketRef.current) {
      socketRef.current.emit('language-change', { language: newLanguage });
    }
  };

  const handleRunCode = async () => {
    if (language === 'html') {
      showToast('HTML 代码请在浏览器中运行', 'info');
      return;
    }

    setIsExecuting(true);
    setOutput(null);

    try {
      const result = await executeCode(code, language);
      setOutput(result);
      
      if (result.success) {
        showToast('代码执行成功', 'success');
      } else {
        showToast('代码执行失败', 'error');
      }
    } catch (err) {
      setOutput({
        success: false,
        error: err.message || '执行失败'
      });
      showToast('执行失败: ' + err.message, 'error');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSaveVersion = (message) => {
    if (socketRef.current) {
      socketRef.current.emit('save-version', { message });
    }
  };

  const handleRevertVersion = (versionId) => {
    if (isReadOnly && !isOwner) {
      showToast('只有房主可以回退版本', 'error');
      return;
    }
    if (socketRef.current) {
      socketRef.current.emit('revert-version', { versionId });
    }
    setShowHistoryModal(false);
  };

  const handleCompareVersions = (v1, v2) => {
    setDiffVersions({ version1: v1, version2: v2 });
    setShowDiffModal(true);
  };

  const handleSendMessage = (text) => {
    if (socketRef.current) {
      socketRef.current.emit('chat-message', { text });
    }
  };

  const handleToggleReadOnly = () => {
    if (!isOwner) {
      showToast('只有房主可以修改权限', 'error');
      return;
    }
    if (socketRef.current) {
      socketRef.current.emit('set-read-only', { isReadOnly: !isReadOnly });
    }
  };

  const handleDeleteSnippet = () => {
    if (!isOwner) {
      showToast('只有房主可以删除', 'error');
      return;
    }
    if (confirm('确定要删除这个代码片段吗？此操作不可撤销。')) {
      if (socketRef.current) {
        socketRef.current.emit('delete-snippet');
      }
      removeFromLocalStorage(snippetId);
      navigate('/');
    }
  };

  const handleDownload = () => {
    downloadFile(code, language, snippetId);
    showToast('文件已下载', 'success');
  };

  const handleExportGist = async () => {
    try {
      const result = await exportGist(code, language, 'Created with Code Sandbox');
      showToast('Gist 导出成功', 'success');
      console.log('Gist URL:', result.gistUrl);
    } catch (err) {
      showToast('导出失败: ' + err.message, 'error');
    }
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    showToast('链接已复制到剪贴板', 'success');
  };

  const handlePasswordSubmit = (pwd) => {
    setPassword(pwd);
    joinSnippet(pwd);
  };

  const handleNameChange = (name) => {
    setUserName(name);
    localStorage.setItem('codesandbox:userName', name);
  };

  if (loading && !showPasswordModal) {
    return (
      <div className="loading" style={{ height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', margin: '0 auto 16px' }}></div>
          <p>正在连接...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {showPasswordModal && (
        <Modal title="需要密码" onClose={() => navigate('/')}>
          <form onSubmit={(e) => {
            e.preventDefault();
            handlePasswordSubmit(password);
          }}>
            <div className="form-group">
              <label>请输入访问密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="输入密码"
                autoFocus
              />
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate('/')}
              >
                返回
              </button>
              <button type="submit" className="btn btn-primary">
                进入
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showHistoryModal && (
        <Modal title="版本历史" onClose={() => setShowHistoryModal(false)} size="large">
          <VersionHistory
            snippetId={snippetId}
            onRevert={handleRevertVersion}
            onCompare={handleCompareVersions}
            history={history}
            setHistory={setHistory}
          />
        </Modal>
      )}

      {showDiffModal && diffVersions.version1 && diffVersions.version2 && (
        <Modal title="代码差异对比" onClose={() => setShowDiffModal(false)} size="large">
          <DiffViewer
            snippetId={snippetId}
            version1={diffVersions.version1}
            version2={diffVersions.version2}
          />
        </Modal>
      )}

      {showShareModal && (
        <Modal title="分享代码片段" onClose={() => setShowShareModal(false)}>
          <div className="form-group">
            <label>分享链接</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={window.location.href}
                readOnly
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCopyLink}
              >
                复制
              </button>
            </div>
          </div>
          <div className="form-group">
            <label>导出</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleDownload}
                style={{ flex: 1 }}
              >
                📥 下载文件
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleExportGist}
                style={{ flex: 1 }}
              >
                📤 导出 Gist
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showSettingsModal && (
        <Modal title="设置" onClose={() => setShowSettingsModal(false)}>
          <div className="form-group">
            <label>您的昵称</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => handleNameChange(e.target.value)}
              maxLength={20}
            />
          </div>
          {isOwner && (
            <>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={isReadOnly}
                    onChange={handleToggleReadOnly}
                    style={{ width: 'auto' }}
                  />
                  只读模式
                </label>
                <p style={{ fontSize: '12px', color: '#7f849c', marginTop: '4px' }}>
                  开启后只有房主可以编辑代码
                </p>
              </div>
              <div className="form-group">
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDeleteSnippet}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  🗑️ 删除代码片段
                </button>
              </div>
            </>
          )}
        </Modal>
      )}

      <div className="app">
        <Header
          snippet={snippet}
          language={language}
          languages={languages}
          onLanguageChange={handleLanguageChange}
          onRun={handleRunCode}
          onSaveVersion={handleSaveVersion}
          onShowHistory={() => setShowHistoryModal(true)}
          onShare={() => setShowShareModal(true)}
          onSettings={() => setShowSettingsModal(true)}
          isReadOnly={isReadOnly}
          isOwner={isOwner}
          isExecuting={isExecuting}
          userName={userName}
          onNameChange={handleNameChange}
        />

        <div className="main-content">
          <div
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ display: window.innerWidth <= 1024 ? 'block' : 'none' }}
          >
            {sidebarOpen ? '◀' : '▶'}
          </div>

          <Sidebar
            className={sidebarOpen ? 'open' : ''}
            users={users}
            currentUserId={currentUser?.id}
            userStats={userStats}
            typingUsers={typingUsers}
            isOwner={isOwner}
            onToggleReadOnly={handleToggleReadOnly}
            isReadOnly={isReadOnly}
          />

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <CodeEditor
              ref={editorRef}
              initialCode={code}
              language={language}
              onCodeChange={handleCodeChange}
              onCursorChange={handleCursorChange}
              onSelectionChange={handleSelectionChange}
              remoteUsers={users}
              readOnly={isReadOnly && !isOwner}
              userId={currentUser?.id}
            />
            <OutputPanel
              output={output}
              isExecuting={isExecuting}
              onRun={handleRunCode}
              onClear={() => setOutput(null)}
            />
          </div>

          <ChatPanel
            className={chatOpen ? 'open' : ''}
            messages={chatMessages}
            currentUserId={currentUser?.id}
            onSendMessage={handleSendMessage}
            onToggle={() => setChatOpen(!chatOpen)}
            isOpen={chatOpen}
          />
        </div>
      </div>
    </>
  );
};

export default EditorPage;

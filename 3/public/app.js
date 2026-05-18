const { useState, useEffect, useRef, createContext, useContext } = React;

const API_BASE = '/api';

const RouterContext = createContext(null);

function useNavigate() {
  const ctx = useContext(RouterContext);
  return ctx?.navigate || (() => {});
}

function useParams() {
  const ctx = useContext(RouterContext);
  return ctx?.params || {};
}

function useLocation() {
  const ctx = useContext(RouterContext);
  return { pathname: ctx?.pathname || '/', search: ctx?.search || '' };
}

function Link({ to, children, className, onClick }) {
  const navigate = useNavigate();
  return (
    <a
      href={to}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        if (onClick) onClick(e);
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}

function Route({ path, element }) {
  const { pathname, params } = useContext(RouterContext) || {};
  
  if (path === '/') {
    return pathname === '/' ? element : null;
  }
  
  const pathParts = path.split('/').filter(Boolean);
  const urlParts = (pathname || '').split('/').filter(Boolean);
  
  if (pathParts.length !== urlParts.length) return null;
  
  const matchParams = {};
  for (let i = 0; i < pathParts.length; i++) {
    if (pathParts[i].startsWith(':')) {
      matchParams[pathParts[i].slice(1)] = urlParts[i];
    } else if (pathParts[i] !== urlParts[i]) {
      return null;
    }
  }
  
  return element;
}

function Routes({ children }) {
  return <>{children}</>;
}

function BrowserRouter({ children }) {
  const [pathname, setPathname] = useState(window.location.pathname);
  const [search, setSearch] = useState(window.location.search);
  
  const navigate = (to) => {
    if (to.startsWith('http')) {
      window.location.href = to;
      return;
    }
    const [path, query] = to.split('?');
    window.history.pushState({}, '', to);
    setPathname(path);
    setSearch(query ? `?${query}` : '');
  };
  
  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname);
      setSearch(window.location.search);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  
  const params = {};
  const pathParts = pathname.split('/').filter(Boolean);
  if (pathParts.length >= 2 && pathParts[0] === 'documents') {
    params.id = pathParts[1];
  }
  
  return (
    <RouterContext.Provider value={{ pathname, search, params, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

function getCurrentUser() {
  return localStorage.getItem('currentUser') || '未设置用户';
}

function setCurrentUser(name) {
  localStorage.setItem('currentUser', name);
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function formatDateOnly(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toISOString().split('T')[0];
}

function isOverdue(dueDate, status) {
  if (!dueDate || status === 'done') return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

function Modal({ title, onClose, children, width }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: width || '500px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function App() {
  const [currentUser, setUser] = useState(getCurrentUser());
  const [showUserModal, setShowUserModal] = useState(false);
  const [tempUser, setTempUser] = useState(currentUser);

  const handleUserSave = () => {
    if (tempUser.trim()) {
      setCurrentUser(tempUser.trim());
      setUser(tempUser.trim());
      setShowUserModal(false);
    }
  };

  return (
    <BrowserRouter>
      <div className="app">
        <Sidebar currentUser={currentUser} onUserClick={() => setShowUserModal(true)} />
        <div className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/documents/:id" element={<DocumentDetail />} />
            <Route path="/board" element={<TaskBoard />} />
          </Routes>
        </div>

        {showUserModal && (
          <Modal onClose={() => setShowUserModal(false)} title="设置用户名">
            <input
              type="text"
              className="form-input"
              value={tempUser}
              onChange={(e) => setTempUser(e.target.value)}
              placeholder="请输入您的名字"
            />
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowUserModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleUserSave}>保存</button>
            </div>
          </Modal>
        )}
      </div>
    </BrowserRouter>
  );
}

function Sidebar({ currentUser, onUserClick }) {
  const location = useLocation();
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE}/activity-logs?limit=20`)
      .then(res => res.json())
      .then(setLogs);
  }, []);

  const refreshLogs = () => {
    fetch(`${API_BASE}/activity-logs?limit=20`)
      .then(res => res.json())
      .then(setLogs);
  };

  useEffect(() => {
    const interval = setInterval(refreshLogs, 10000);
    return () => clearInterval(interval);
  }, []);

  const getActionText = (log) => {
    const actions = {
      create: '创建了',
      edit: '编辑了',
      delete: '删除了',
      move: '移动了',
      link: '关联了',
      unlink: '取消关联了'
    };
    const types = {
      category: '分类',
      document: '文档',
      task: '任务',
      document_task: '关联'
    };
    return `${actions[log.action_type] || log.action_type} ${types[log.target_type] || log.target_type}`;
  };

  const getLogLink = (log) => {
    if (log.target_type === 'document' && log.action_type !== 'delete') {
      return `/documents/${log.target_id}`;
    }
    if (log.target_type === 'task' && log.action_type !== 'delete') {
      return `/board?highlight=${log.target_id}`;
    }
    return null;
  };

  return (
    <div className="sidebar">
      <div className="logo">📋 团队协作</div>
      
      <nav className="nav">
        <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
          📊 仪表盘
        </Link>
        <Link to="/documents" className={`nav-item ${location.pathname.startsWith('/documents') ? 'active' : ''}`}>
          📄 文档库
        </Link>
        <Link to="/board" className={`nav-item ${location.pathname === '/board' ? 'active' : ''}`}>
          🎯 任务看板
        </Link>
      </nav>

      <div className="user-section" onClick={onUserClick}>
        <div className="user-avatar">{currentUser.charAt(0).toUpperCase()}</div>
        <div className="user-info">
          <div className="user-name">{currentUser}</div>
          <div className="user-sub">点击切换用户</div>
        </div>
      </div>

      <div className="activity-section">
        <div className="section-title">近期动态</div>
        <div className="activity-list">
          {logs.map(log => {
            const link = getLogLink(log);
            const content = (
              <div className="activity-item" key={log.id}>
                <div className="activity-text">
                  <strong>{log.operator}</strong> {getActionText(log)}
                  {log.target_name && <span className="activity-target">「{log.target_name}」</span>}
                </div>
                <div className="activity-time">{formatDate(log.created_at)}</div>
              </div>
            );
            return link ? (
              <Link key={log.id} to={link} className="activity-link">{content}</Link>
            ) : (
              <div key={log.id}>{content}</div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const [stats, setStats] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_BASE}/dashboard/stats`)
      .then(res => res.json())
      .then(setStats);
  }, []);

  if (!stats) return <div className="loading">加载中...</div>;

  const maxCount = Math.max(...stats.last7Days.map(d => d.count), 1);

  return (
    <div className="dashboard">
      <h1 className="page-title">仪表盘</h1>
      
      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon">📄</div>
          <div className="stat-info">
            <div className="stat-value">{stats.documentCount}</div>
            <div className="stat-label">文档总数</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-info">
            <div className="stat-value">{stats.taskCount}</div>
            <div className="stat-label">任务总数</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <div className="stat-value">{stats.doneCount}</div>
            <div className="stat-label">已完成任务</div>
          </div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon">⏰</div>
          <div className="stat-info">
            <div className="stat-value">{stats.overdueCount}</div>
            <div className="stat-label">逾期任务</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3 className="card-title">任务完成率</h3>
          <div className="progress-ring-container">
            <svg className="progress-ring" width="150" height="150">
              <circle cx="75" cy="75" r="60" fill="none" stroke="#e0e0e0" strokeWidth="10" />
              <circle
                cx="75" cy="75" r="60" fill="none" stroke="#4CAF50" strokeWidth="10"
                strokeDasharray={`${stats.completionRate * 3.77} 377`}
                strokeLinecap="round"
                transform="rotate(-90 75 75)"
              />
            </svg>
            <div className="progress-text">{stats.completionRate}%</div>
          </div>
        </div>

        <div className="dashboard-card">
          <h3 className="card-title">近7天新增任务</h3>
          <div className="bar-chart">
            {stats.last7Days.map((day, idx) => (
              <div key={idx} className="bar-item">
                <div className="bar-label">{day.date.slice(5)}</div>
                <div className="bar-wrapper">
                  <div 
                    className="bar-fill" 
                    style={{ height: `${(day.count / maxCount) * 100}%` }}
                    title={`${day.count} 个任务`}
                  ></div>
                </div>
                <div className="bar-value">{day.count}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-card">
          <h3 className="card-title">逾期未完成任务</h3>
          {stats.overdueTasks.length === 0 ? (
            <div className="empty-state">暂无逾期任务 🎉</div>
          ) : (
            <div className="task-list">
              {stats.overdueTasks.map(task => (
                <div key={task.id} className="task-item overdue" onClick={() => navigate(`/board?highlight=${task.id}`)}>
                  <div className="task-item-title">{task.title}</div>
                  <div className="task-item-meta">
                    <span className={`priority priority-${task.priority}`}>{task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}</span>
                    <span>截止: {formatDateOnly(task.due_date)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dashboard-card">
          <h3 className="card-title">最近更新文档</h3>
          <div className="doc-list">
            {stats.recentDocs.map(doc => (
              <div key={doc.id} className="doc-item" onClick={() => navigate(`/documents/${doc.id}`)}>
                <div className="doc-item-title">{doc.title}</div>
                <div className="doc-item-meta">
                  更新于 {formatDate(doc.last_modified_at)} · {doc.last_modified_by}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Documents() {
  const [categories, setCategories] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [search, setSearch] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [formData, setFormData] = useState({ title: '', content: '', category_id: null });
  const navigate = useNavigate();

  const loadCategories = () => {
    fetch(`${API_BASE}/categories`)
      .then(res => res.json())
      .then(cats => {
        setCategories(cats);
        if (!selectedCategory && cats.length > 0) {
          setSelectedCategory(cats[0].id);
        }
      });
  };

  const loadDocuments = () => {
    let url = `${API_BASE}/documents`;
    const params = [];
    if (selectedCategory) params.push(`category_id=${selectedCategory}`);
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    if (params.length > 0) url += '?' + params.join('&');
    
    fetch(url)
      .then(res => res.json())
      .then(setDocuments);
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) loadDocuments();
  }, [selectedCategory, search]);

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    fetch(`${API_BASE}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCategoryName.trim(), operator: getCurrentUser() })
    }).then(() => {
      loadCategories();
      setNewCategoryName('');
      setShowCategoryModal(false);
    });
  };

  const handleDeleteCategory = (id, e) => {
    e.stopPropagation();
    if (!confirm('确定要删除此分类吗？')) return;
    fetch(`${API_BASE}/categories/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operator: getCurrentUser() })
    }).then(res => {
      if (!res.ok) {
        res.json().then(data => alert(data.error));
        return;
      }
      loadCategories();
      if (selectedCategory === id) {
        setSelectedCategory(null);
      }
    });
  };

  const handleSaveDoc = () => {
    if (!formData.title.trim()) {
      alert('请输入文档标题');
      return;
    }
    const categoryId = formData.category_id || selectedCategory;
    if (!categoryId) {
      alert('请先选择分类');
      return;
    }

    const url = editingDoc ? `${API_BASE}/documents/${editingDoc.id}` : `${API_BASE}/documents`;
    const method = editingDoc ? 'PUT' : 'POST';

    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, category_id: categoryId, operator: getCurrentUser() })
    }).then(() => {
      loadDocuments();
      setShowDocModal(false);
      setEditingDoc(null);
      setFormData({ title: '', content: '', category_id: null });
    });
  };

  const handleDeleteDoc = (id) => {
    if (!confirm('确定要删除此文档吗？')) return;
    fetch(`${API_BASE}/documents/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operator: getCurrentUser() })
    }).then(() => loadDocuments());
  };

  const handleEditDoc = (doc) => {
    setEditingDoc(doc);
    setFormData({ title: doc.title, content: doc.content || '', category_id: doc.category_id });
    setShowDocModal(true);
  };

  return (
    <div className="documents-page">
      <div className="page-header">
        <h1 className="page-title">文档库</h1>
        <button className="btn btn-primary" onClick={() => setShowDocModal(true)}>+ 新建文档</button>
      </div>

      <div className="documents-layout">
        <div className="category-sidebar">
          <div className="category-header">
            <span>分类</span>
            <button className="btn-icon" onClick={() => setShowCategoryModal(true)}>+</button>
          </div>
          <div className="category-list">
            {categories.map(cat => (
              <div 
                key={cat.id} 
                className={`category-item ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                <span>📁 {cat.name}</span>
                <button className="btn-icon btn-delete" onClick={(e) => handleDeleteCategory(cat.id, e)}>×</button>
              </div>
            ))}
          </div>
        </div>

        <div className="documents-main">
          <div className="search-bar">
            <input 
              type="text" 
              className="form-input" 
              placeholder="搜索文档标题..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="document-list">
            {documents.map(doc => (
              <div key={doc.id} className="document-card">
                <div className="doc-card-header" onClick={() => navigate(`/documents/${doc.id}`)}>
                  <div className="doc-title">{doc.title}</div>
                  <div className="doc-meta">
                    {doc.category_name} · 更新于 {formatDate(doc.last_modified_at)} · {doc.last_modified_by}
                  </div>
                </div>
                <div className="doc-card-actions">
                  <button className="btn btn-sm btn-secondary" onClick={() => handleEditDoc(doc)}>编辑</button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDeleteDoc(doc.id)}>删除</button>
                </div>
              </div>
            ))}
            {documents.length === 0 && (
              <div className="empty-state">暂无文档，点击右上角新建</div>
            )}
          </div>
        </div>
      </div>

      {showCategoryModal && (
        <Modal title="新建分类" onClose={() => setShowCategoryModal(false)}>
          <input
            type="text"
            className="form-input"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="分类名称"
          />
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => setShowCategoryModal(false)}>取消</button>
            <button className="btn btn-primary" onClick={handleAddCategory}>创建</button>
          </div>
        </Modal>
      )}

      {showDocModal && (
        <Modal title={editingDoc ? '编辑文档' : '新建文档'} onClose={() => { setShowDocModal(false); setEditingDoc(null); }} width="700px">
          <div className="form-group">
            <label>标题</label>
            <input
              type="text"
              className="form-input"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>分类</label>
            <select
              className="form-input"
              value={formData.category_id || selectedCategory || ''}
              onChange={(e) => setFormData({ ...formData, category_id: parseInt(e.target.value) })}
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>内容（支持 Markdown 格式）</label>
            <textarea
              className="form-input"
              rows="10"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            />
          </div>
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => { setShowDocModal(false); setEditingDoc(null); }}>取消</button>
            <button className="btn btn-primary" onClick={handleSaveDoc}>保存</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function DocumentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [searchTask, setSearchTask] = useState('');
  const [allTasks, setAllTasks] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', content: '' });

  const loadDoc = () => {
    fetch(`${API_BASE}/documents/${id}`)
      .then(res => res.json())
      .then(data => {
        setDoc(data);
        setTasks(data.tasks || []);
      });
  };

  useEffect(() => {
    loadDoc();
  }, [id]);

  const handleSaveEdit = () => {
    if (!editForm.title.trim()) return;
    fetch(`${API_BASE}/documents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editForm, operator: getCurrentUser() })
    }).then(() => {
      setIsEditing(false);
      loadDoc();
    });
  };

  const handleLinkTask = (taskId) => {
    fetch(`${API_BASE}/documents/${id}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: taskId, operator: getCurrentUser() })
    }).then(() => {
      loadDoc();
      setShowLinkModal(false);
    });
  };

  const handleUnlinkTask = (taskId) => {
    fetch(`${API_BASE}/documents/${id}/tasks/${taskId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operator: getCurrentUser() })
    }).then(() => loadDoc());
  };

  const searchTasks = () => {
    let url = `${API_BASE}/tasks`;
    if (searchTask) {
      url += `?search=${encodeURIComponent(searchTask)}`;
    }
    fetch(url)
      .then(res => res.json())
      .then(data => {
        const linkedIds = tasks.map(t => t.id);
        setAllTasks(data.filter(t => !linkedIds.includes(t.id)));
      });
  };

  useEffect(() => {
    if (showLinkModal) {
      searchTasks();
    }
  }, [showLinkModal, searchTask]);

  if (!doc) return <div className="loading">加载中...</div>;

  const renderContent = (content) => {
    if (!content) return null;
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('# ')) return <h3 key={idx}>{line.slice(2)}</h3>;
      if (line.startsWith('## ')) return <h4 key={idx}>{line.slice(3)}</h4>;
      if (line.startsWith('- ') || line.startsWith('* ')) return <li key={idx}>{line.slice(2)}</li>;
      if (/^\d+\.\s/.test(line)) return <li key={idx}>{line.replace(/^\d+\.\s/, '')}</li>;
      if (line.trim() === '') return <br key={idx} />;
      return <p key={idx}>{line}</p>;
    });
  };

  return (
    <div className="document-detail">
      <div className="page-header">
        <button className="btn btn-secondary" onClick={() => navigate('/documents')}>← 返回列表</button>
        {!isEditing && (
          <div>
            <button className="btn btn-secondary" onClick={() => {
              setEditForm({ title: doc.title, content: doc.content || '' });
              setIsEditing(true);
            }}>编辑</button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="doc-edit-form">
          <div className="form-group">
            <label>标题</label>
            <input
              type="text"
              className="form-input"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>内容</label>
            <textarea
              className="form-input"
              rows="15"
              value={editForm.content}
              onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
            />
          </div>
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => setIsEditing(false)}>取消</button>
            <button className="btn btn-primary" onClick={handleSaveEdit}>保存</button>
          </div>
        </div>
      ) : (
        <>
          <h1 className="doc-detail-title">{doc.title}</h1>
          <div className="doc-detail-meta">
            分类: {doc.category_name} · 最后修改: {formatDate(doc.last_modified_at)} · 修改人: {doc.last_modified_by}
          </div>
          <div className="doc-content">{renderContent(doc.content)}</div>

          <div className="linked-section">
            <div className="section-header">
              <h3>关联任务</h3>
              <button className="btn btn-sm btn-primary" onClick={() => setShowLinkModal(true)}>+ 关联任务</button>
            </div>
            <div className="linked-tasks">
              {tasks.length === 0 ? (
                <div className="empty-state">暂无关联任务</div>
              ) : (
                tasks.map(task => (
                  <div key={task.id} className={`linked-task priority-${task.priority}`}>
                    <div 
                      className="linked-task-info"
                      onClick={() => navigate(`/board?highlight=${task.id}`)}
                    >
                      <div className="linked-task-title">{task.title}</div>
                      <div className="linked-task-meta">
                        <span className={`priority priority-${task.priority}`}>
                          {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}优先级
                        </span>
                        <span>指派人: {task.assignee}</span>
                        <span>截止: {formatDateOnly(task.due_date)}</span>
                      </div>
                    </div>
                    <button className="btn-icon btn-delete" onClick={() => handleUnlinkTask(task.id)}>×</button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {showLinkModal && (
        <Modal title="关联任务" onClose={() => setShowLinkModal(false)}>
          <div className="form-group">
            <input
              type="text"
              className="form-input"
              placeholder="搜索任务..."
              value={searchTask}
              onChange={(e) => setSearchTask(e.target.value)}
            />
          </div>
          <div className="task-select-list">
            {allTasks.map(task => (
              <div key={task.id} className="task-select-item" onClick={() => handleLinkTask(task.id)}>
                <div className="task-select-title">{task.title}</div>
                <div className="task-select-meta">
                  <span className={`priority priority-${task.priority}`}>
                    {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                  </span>
                  <span>{task.assignee}</span>
                </div>
              </div>
            ))}
            {allTasks.length === 0 && <div className="empty-state">没有可关联的任务</div>}
          </div>
        </Modal>
      )}
    </div>
  );
}

function TaskBoard() {
  const location = useLocation();
  const [tasks, setTasks] = useState([]);
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [highlightTaskId, setHighlightTaskId] = useState(null);
  const [formData, setFormData] = useState({
    title: '', description: '', assignee: '', due_date: '', priority: 'medium', status: 'todo'
  });

  const columns = [
    { key: 'todo', title: '待处理' },
    { key: 'in_progress', title: '进行中' },
    { key: 'done', title: '已完成' }
  ];

  const loadTasks = () => {
    let url = `${API_BASE}/tasks`;
    if (assigneeFilter) {
      url += `?assignee=${encodeURIComponent(assigneeFilter)}`;
    }
    fetch(url).then(res => res.json()).then(setTasks);
  };

  useEffect(() => {
    loadTasks();
  }, [assigneeFilter]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const highlight = params.get('highlight');
    if (highlight) {
      setHighlightTaskId(parseInt(highlight));
      setTimeout(() => setHighlightTaskId(null), 3000);
    }
  }, [location.search]);

  const assignees = [...new Set(tasks.map(t => t.assignee).filter(Boolean))];

  const handleSaveTask = () => {
    if (!formData.title.trim()) {
      alert('请输入任务标题');
      return;
    }

    const url = editingTask ? `${API_BASE}/tasks/${editingTask.id}` : `${API_BASE}/tasks`;
    const method = editingTask ? 'PUT' : 'POST';

    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, operator: getCurrentUser() })
    }).then(res => {
      if (!res.ok) {
        res.json().then(data => alert(data.error));
        return;
      }
      loadTasks();
      setShowTaskModal(false);
      setEditingTask(null);
      setFormData({ title: '', description: '', assignee: '', due_date: '', priority: 'medium', status: 'todo' });
    });
  };

  const handleDeleteTask = (id) => {
    if (!confirm('确定要删除此任务吗？')) return;
    fetch(`${API_BASE}/tasks/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operator: getCurrentUser() })
    }).then(() => loadTasks());
  };

  const handleDragStart = (e, task) => {
    e.dataTransfer.setData('taskId', task.id.toString());
  };

  const handleDrop = (e, status) => {
    e.preventDefault();
    const taskId = parseInt(e.dataTransfer.getData('taskId'));
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    fetch(`${API_BASE}/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...task, status, operator: getCurrentUser() })
    }).then(res => {
      if (!res.ok) {
        res.json().then(data => alert(data.error));
        return;
      }
      loadTasks();
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const openEditModal = (task) => {
    if (task.status === 'done') {
      alert('已完成的任务不可修改');
      return;
    }
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      assignee: task.assignee || '',
      due_date: task.due_date || '',
      priority: task.priority,
      status: task.status
    });
    setShowTaskModal(true);
  };

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const overdueTasks = tasks.filter(t => isOverdue(t.due_date, t.status)).length;

  const getTasksByStatus = (status) => {
    return tasks.filter(t => t.status === status);
  };

  return (
    <div className="task-board">
      <div className="page-header">
        <h1 className="page-title">任务看板</h1>
        <div className="board-toolbar">
          <select
            className="form-input"
            style={{ width: '150px' }}
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
          >
            <option value="">全部指派人</option>
            {assignees.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => setShowTaskModal(true)}>+ 新建任务</button>
        </div>
      </div>

      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-label">总任务数</span>
          <span className="stat-value">{totalTasks}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">已完成</span>
          <span className="stat-value success">{doneTasks}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">逾期</span>
          <span className="stat-value warning">{overdueTasks}</span>
        </div>
      </div>

      <div className="board-columns">
        {columns.map(col => (
          <div 
            key={col.key} 
            className="board-column"
            onDrop={(e) => handleDrop(e, col.key)}
            onDragOver={handleDragOver}
          >
            <div className="column-header">
              <span>{col.title}</span>
              <span className="column-count">{getTasksByStatus(col.key).length}</span>
            </div>
            <div className="column-content">
              {getTasksByStatus(col.key).map(task => (
                <div
                  key={task.id}
                  className={`task-card priority-${task.priority} ${highlightTaskId === task.id ? 'highlight' : ''} ${isOverdue(task.due_date, task.status) ? 'overdue' : ''} ${task.status === 'done' ? 'completed' : ''}`}
                  draggable={task.status !== 'done'}
                  onDragStart={(e) => handleDragStart(e, task)}
                  onClick={() => openEditModal(task)}
                >
                  <div className="task-card-title">{task.title}</div>
                  <div className="task-card-meta">
                    <span className="task-assignee">👤 {task.assignee || '未指派'}</span>
                    <span className={`priority priority-${task.priority}`}>
                      {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                    </span>
                  </div>
                  <div className="task-card-footer">
                    <span className={`due-date ${isOverdue(task.due_date, task.status) ? 'overdue' : ''}`}>
                      📅 {formatDateOnly(task.due_date)}
                    </span>
                    {task.documents && task.documents.length > 0 && (
                      <span className="doc-badge">📄 {task.documents.length}</span>
                    )}
                    <button 
                      className="btn-icon btn-delete" 
                      onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                    >×</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showTaskModal && (
        <Modal title={editingTask ? '编辑任务' : '新建任务'} onClose={() => { setShowTaskModal(false); setEditingTask(null); }}>
          <div className="form-group">
            <label>标题 *</label>
            <input
              type="text"
              className="form-input"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>描述</label>
            <textarea
              className="form-input"
              rows="3"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>指派人</label>
              <input
                type="text"
                className="form-input"
                value={formData.assignee}
                onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>截止日期</label>
              <input
                type="date"
                className="form-input"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>优先级</label>
              <select
                className="form-input"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
            </div>
            {editingTask && (
              <div className="form-group">
                <label>状态</label>
                <select
                  className="form-input"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="todo">待处理</option>
                  <option value="in_progress">进行中</option>
                  <option value="done">已完成</option>
                </select>
              </div>
            )}
          </div>

          {editingTask && editingTask.documents && editingTask.documents.length > 0 && (
            <div className="linked-section">
              <h4>关联文档</h4>
              <div className="linked-docs">
                {editingTask.documents.map(doc => (
                  <div 
                    key={doc.id} 
                    className="linked-doc-item"
                    onClick={(e) => { e.stopPropagation(); setShowTaskModal(false); navigate(`/documents/${doc.id}`); }}
                    style={{ cursor: 'pointer' }}
                  >
                    📄 {doc.title}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => { setShowTaskModal(false); setEditingTask(null); }}>取消</button>
            <button className="btn btn-primary" onClick={handleSaveTask}>保存</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSnippet, getLanguages } from '../utils/api.js';

const HomePage = ({ showToast }) => {
  const navigate = useNavigate();
  const [languages, setLanguages] = useState([]);
  const [formData, setFormData] = useState({
    language: 'javascript',
    userName: '',
    password: '',
    expiresIn: '',
    isReadOnly: false
  });
  const [isCreating, setIsCreating] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const data = await createSnippet({
        ...formData,
        expiresIn: formData.expiresIn ? parseInt(formData.expiresIn) : null
      });
      
      if (data.ownerId) {
        localStorage.setItem('codesandbox:ownerId', data.ownerId);
      }
      
      showToast('代码片段创建成功！', 'success');
      navigate(`/${data.snippet.id}`);
    } catch (err) {
      console.error('Failed to create snippet:', err);
      showToast('创建失败: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="home-page">
      <div className="home-content">
        <h1 className="home-title">Code Sandbox</h1>
        <p className="home-subtitle">
          多人实时协作的在线代码编辑器，支持 JavaScript、Python、Java、Go、HTML/CSS
        </p>

        <div className="home-features">
          <div className="feature-item">
            <div className="feature-title">⚡ 实时协作</div>
            <div className="feature-desc">多人同时编辑，实时同步光标和选区</div>
          </div>
          <div className="feature-item">
            <div className="feature-title">🔒 安全执行</div>
            <div className="feature-desc">Docker 容器安全运行代码，隔离环境</div>
          </div>
          <div className="feature-item">
            <div className="feature-title">📜 版本历史</div>
            <div className="feature-desc">自动保存版本，支持时间旅行回退</div>
          </div>
          <div className="feature-item">
            <div className="feature-title">💬 内置聊天</div>
            <div className="feature-desc">边写代码边交流，提升协作效率</div>
          </div>
        </div>

        <div className="create-snippet-form">
          <h2>创建新的代码片段</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>您的昵称</label>
              <input
                type="text"
                name="userName"
                value={formData.userName}
                onChange={handleInputChange}
                placeholder="输入您的昵称"
                maxLength={20}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>编程语言</label>
                <select
                  name="language"
                  value={formData.language}
                  onChange={handleInputChange}
                >
                  {languages.map(lang => (
                    <option key={lang.id} value={lang.id}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>过期时间（秒）</label>
                <input
                  type="number"
                  name="expiresIn"
                  value={formData.expiresIn}
                  onChange={handleInputChange}
                  placeholder="留空永不过期"
                  min="60"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>访问密码（可选）</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="留空无需密码"
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    name="isReadOnly"
                    checked={formData.isReadOnly}
                    onChange={handleInputChange}
                    style={{ width: 'auto' }}
                  />
                  只读模式
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                  创建中...
                </>
              ) : (
                '🚀 创建代码片段'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default HomePage;

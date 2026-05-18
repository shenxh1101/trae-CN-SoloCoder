import { useState } from 'react';
import { useUser } from '../contexts/UserContext';

export default function UserSetup() {
  const { currentUser, users, loading, setUser, clearUser } = useUser();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!username.trim()) {
      setError('请输入用户名');
      return;
    }

    try {
      await setUser(username.trim());
      setUsername('');
      setSuccess('用户设置成功！');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.message || '设置失败');
    }
  }

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="user-setup">
      <h1>用户设置</h1>

      {currentUser && (
        <div className="current-user-card">
          <h3>当前用户</h3>
          <p className="username">{currentUser.username}</p>
          <button className="btn btn-secondary" onClick={clearUser}>切换用户</button>
        </div>
      )}

      <div className="user-form">
        <h3>{currentUser ? '切换用户' : '设置当前用户'}</h3>
        <p className="form-hint">输入您的用户名，系统会自动记录，用于创建任务和评论。</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="text"
              className="form-control"
              placeholder="请输入用户名"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
            />
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <button type="submit" className="btn btn-primary">保存</button>
        </form>
      </div>

      {users.length > 0 && (
        <div className="users-list">
          <h3>已有用户</h3>
          <div className="users-grid">
            {users.map(user => (
              <div key={user.id} className={`user-chip ${currentUser?.id === user.id ? 'active' : ''}`}>
                {user.username}
                {currentUser?.id === user.id && <span className="badge">当前</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';

const Sidebar = ({
  className,
  users,
  currentUserId,
  userStats,
  typingUsers,
  isOwner,
  onToggleReadOnly,
  isReadOnly
}) => {
  const [activeTab, setActiveTab] = useState('users');

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const diff = Date.now() - timestamp;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    return `${Math.floor(diff / 86400000)} 天前`;
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.substring(0, 2).toUpperCase();
  };

  const sortedUserStats = Object.entries(userStats || {})
    .sort((a, b) => b[1].linesEdited - a[1].linesEdited);

  const totalLines = sortedUserStats.reduce((sum, [, stat]) => sum + stat.linesEdited, 0);

  return (
    <aside className={`sidebar ${className}`}>
      <div className="sidebar-section">
        <div className="sidebar-header">
          <div className="tabs" style={{ flex: 1 }}>
            <div
              className={`tab ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              在线用户 ({users.length})
            </div>
            <div
              className={`tab ${activeTab === 'stats' ? 'active' : ''}`}
              onClick={() => setActiveTab('stats')}
            >
              统计
            </div>
          </div>
        </div>

        <div className="sidebar-content">
          {activeTab === 'users' ? (
            users.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">👥</div>
                <div className="empty-state-text">暂无在线用户</div>
              </div>
            ) : (
              users.map(user => (
                <div key={user.id} className="user-item">
                  <div
                    className="user-avatar"
                    style={{ backgroundColor: user.color }}
                  >
                    {getInitials(user.name)}
                  </div>
                  <div className="user-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="user-name">
                        {user.name}
                        {user.id === currentUserId && ' (你)'}
                      </span>
                      {user.isOwner && (
                        <span className="user-owner-badge">房主</span>
                      )}
                    </div>
                    {typingUsers.has(user.id) && user.id !== currentUserId && (
                      <div className="typing-indicator">
                        <div className="typing-dots">
                          <div className="typing-dot"></div>
                          <div className="typing-dot"></div>
                          <div className="typing-dot"></div>
                        </div>
                        <span style={{ marginLeft: '4px' }}>正在输入...</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )
          ) : (
            <div>
              <div style={{ padding: '8px 12px', marginBottom: '8px' }}>
                <div style={{ fontSize: '12px', color: '#7f849c', marginBottom: '4px' }}>
                  总计编辑行数
                </div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#89b4fa' }}>
                  {totalLines}
                </div>
              </div>

              {sortedUserStats.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📊</div>
                  <div className="empty-state-text">暂无统计数据</div>
                </div>
              ) : (
                sortedUserStats.map(([userId, stat]) => {
                  const percentage = totalLines > 0 ? (stat.linesEdited / totalLines * 100).toFixed(1) : 0;
                  const user = users.find(u => u.id === userId);
                  return (
                    <div key={userId} className="user-item">
                      <div
                        className="user-avatar"
                        style={{ backgroundColor: user?.color || '#89b4fa' }}
                      >
                        {getInitials(stat.name)}
                      </div>
                      <div className="user-info">
                        <div className="user-name">{stat.name}</div>
                        <div className="user-stats">
                          {stat.linesEdited} 行 · {percentage}% · {formatTime(stat.lastActive)}
                        </div>
                        <div style={{
                          height: '4px',
                          backgroundColor: '#313244',
                          borderRadius: '2px',
                          marginTop: '4px',
                          overflow: 'hidden'
                        }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${percentage}%`,
                              backgroundColor: user?.color || '#89b4fa',
                              transition: 'width 0.3s'
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {isOwner && (
        <div className="sidebar-section">
          <div className="sidebar-header">
            权限控制
          </div>
          <div className="sidebar-content">
            <div style={{ padding: '8px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '13px'
              }}>
                <input
                  type="checkbox"
                  checked={isReadOnly}
                  onChange={onToggleReadOnly}
                  style={{ width: 'auto' }}
                />
                只读模式
              </label>
              <p style={{
                fontSize: '11px',
                color: '#7f849c',
                marginTop: '6px',
                lineHeight: '1.4'
              }}>
                开启后，只有房主可以编辑代码，其他用户只能查看
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;

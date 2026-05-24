import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal.jsx';

const Header = ({
  snippet,
  language,
  languages,
  onLanguageChange,
  onRun,
  onSaveVersion,
  onShowHistory,
  onShare,
  onSettings,
  isReadOnly,
  isOwner,
  isExecuting,
  userName,
  onNameChange
}) => {
  const navigate = useNavigate();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const handleSave = () => {
    onSaveVersion(saveMessage || '保存');
    setSaveMessage('');
    setShowSaveModal(false);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  return (
    <>
      {showSaveModal && (
        <Modal title="保存版本" onClose={() => setShowSaveModal(false)}>
          <form onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}>
            <div className="form-group">
              <label>版本说明（可选）</label>
              <input
                type="text"
                value={saveMessage}
                onChange={(e) => setSaveMessage(e.target.value)}
                placeholder="描述此次修改..."
                maxLength={100}
                autoFocus
              />
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowSaveModal(false)}
              >
                取消
              </button>
              <button type="submit" className="btn btn-primary">
                保存
              </button>
            </div>
          </form>
        </Modal>
      )}

      <header className="header">
        <div className="header-left">
          <div className="logo" onClick={() => navigate('/')}>
            {'</>'} Code Sandbox
          </div>

          {snippet && (
            <>
              <div className="language-selector">
                <span style={{ fontSize: '12px', color: '#7f849c' }}>语言:</span>
                <select
                  value={language}
                  onChange={(e) => onLanguageChange(e.target.value)}
                  disabled={isReadOnly && !isOwner}
                >
                  {languages.map(lang => (
                    <option key={lang.id} value={lang.id}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ fontSize: '12px', color: '#7f849c' }}>
                ID: {snippet.id}
              </div>
            </>
          )}
        </div>

        <div className="header-right">
          {isReadOnly && (
            <div className="read-only-indicator">
              <span>🔒</span>
              <span>只读</span>
            </div>
          )}

          <button
            className="btn btn-secondary"
            onClick={() => setShowSaveModal(true)}
            disabled={isReadOnly && !isOwner}
          >
            💾 保存版本
          </button>

          <button
            className="btn btn-secondary"
            onClick={onShowHistory}
          >
            📜 历史
          </button>

          <button
            className="btn btn-success"
            onClick={onRun}
            disabled={isExecuting}
          >
            {isExecuting ? (
              <>
                <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }}></div>
                运行中...
              </>
            ) : (
              <>▶️ 运行</>
            )}
          </button>

          <button
            className="btn btn-secondary"
            onClick={onShare}
          >
            📤 分享
          </button>

          <button
            className="btn btn-secondary"
            onClick={onSettings}
          >
            ⚙️
          </button>
        </div>
      </header>
    </>
  );
};

export default Header;

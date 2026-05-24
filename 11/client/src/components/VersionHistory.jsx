import React, { useState, useEffect } from 'react';
import { getHistory } from '../utils/api.js';

const VersionHistory = ({ snippetId, onRevert, onCompare, history, setHistory }) => {
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [firstVersion, setFirstVersion] = useState(null);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoading(true);
        const data = await getHistory(snippetId);
        setHistory(data.history || []);
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setLoading(false);
      }
    };

    if (history.length === 0) {
      loadHistory();
    } else {
      setLoading(false);
    }
  }, [snippetId]);

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleVersionClick = (version) => {
    if (compareMode) {
      if (!firstVersion) {
        setFirstVersion(version);
      } else if (firstVersion.id === version.id) {
        setFirstVersion(null);
      } else {
        onCompare(firstVersion.id, version.id);
        setCompareMode(false);
        setFirstVersion(null);
      }
    } else {
      setSelectedVersion(version.id === selectedVersion ? null : version.id);
    }
  };

  const handleRevert = (versionId) => {
    if (confirm('确定要回退到此版本吗？当前代码将被覆盖。')) {
      onRevert(versionId);
    }
  };

  if (loading) {
    return (
      <div className="loading" style={{ height: '200px' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📜</div>
        <div className="empty-state-text">暂无版本历史<br />点击 "保存版本" 创建第一个版本</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', color: '#7f849c' }}>
          共 {history.length} 个版本
        </div>
        <button
          className={`btn ${compareMode ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '6px 12px', fontSize: '12px' }}
          onClick={() => {
            setCompareMode(!compareMode);
            setFirstVersion(null);
          }}
        >
          {compareMode ? '取消对比' : '🔍 对比版本'}
        </button>
      </div>

      {compareMode && firstVersion && (
        <div style={{
          padding: '10px',
          backgroundColor: '#313244',
          borderRadius: '6px',
          marginBottom: '12px',
          fontSize: '13px'
        }}>
          已选择版本 1，请点击另一个版本进行对比
          <button
            className="btn btn-secondary"
            style={{ padding: '2px 8px', fontSize: '11px', marginLeft: '8px' }}
            onClick={() => setFirstVersion(null)}
          >
            取消
          </button>
        </div>
      )}

      <div className="version-history">
        {history.map((version, index) => (
          <div
            key={version.id}
            className={`version-item ${selectedVersion === version.id ? 'selected' : ''} ${firstVersion?.id === version.id ? 'selected' : ''}`}
            onClick={() => handleVersionClick(version)}
          >
            <div className="version-info">
              <div className="version-message">
                {version.message || `版本 ${history.length - index}`}
              </div>
              <div className="version-meta">
                {formatDate(version.createdAt)} · {version.createdBy} · {version.language}
              </div>
            </div>
            {selectedVersion === version.id && !compareMode && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-primary"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRevert(version.id);
                  }}
                >
                  回退
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedVersion(null);
                  }}
                >
                  关闭
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default VersionHistory;

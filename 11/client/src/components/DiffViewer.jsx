import React, { useState, useEffect } from 'react';
import { getDiff } from '../utils/api.js';

const DiffViewer = ({ snippetId, version1, version2 }) => {
  const [loading, setLoading] = useState(true);
  const [diff, setDiff] = useState(null);
  const [viewMode, setViewMode] = useState('unified');

  useEffect(() => {
    const loadDiff = async () => {
      try {
        setLoading(true);
        const data = await getDiff(snippetId, version1, version2);
        setDiff(data);
      } catch (err) {
        console.error('Failed to load diff:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDiff();
  }, [snippetId, version1, version2]);

  if (loading) {
    return (
      <div className="loading" style={{ height: '300px' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!diff) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🔍</div>
        <div className="empty-state-text">无法加载差异对比</div>
      </div>
    );
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  return (
    <div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        marginBottom: '16px',
        fontSize: '12px'
      }}>
        <div style={{
          padding: '12px',
          backgroundColor: '#181825',
          borderRadius: '6px',
          border: '1px solid #f38ba8'
        }}>
          <div style={{ color: '#f38ba8', fontWeight: '600', marginBottom: '4px' }}>
            旧版本
          </div>
          <div style={{ color: '#7f849c' }}>
            {diff.version1.createdBy} · {formatDate(diff.version1.createdAt)}
          </div>
        </div>
        <div style={{
          padding: '12px',
          backgroundColor: '#181825',
          borderRadius: '6px',
          border: '1px solid #a6e3a1'
        }}>
          <div style={{ color: '#a6e3a1', fontWeight: '600', marginBottom: '4px' }}>
            新版本
          </div>
          <div style={{ color: '#7f849c' }}>
            {diff.version2.createdBy} · {formatDate(diff.version2.createdAt)}
          </div>
        </div>
      </div>

      <div className="diff-stats">
        <div className="diff-stat additions">
          <span>➕</span>
          <span>{diff.stats.additions} 行新增</span>
        </div>
        <div className="diff-stat deletions">
          <span>➖</span>
          <span>{diff.stats.deletions} 行删除</span>
        </div>
        <div className="diff-stat changes">
          <span>📝</span>
          <span>{diff.stats.changes} 处变更</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
          <button
            className={`btn ${viewMode === 'unified' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '4px 10px', fontSize: '12px' }}
            onClick={() => setViewMode('unified')}
          >
            合并视图
          </button>
          <button
            className={`btn ${viewMode === 'split' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '4px 10px', fontSize: '12px' }}
            onClick={() => setViewMode('split')}
          >
            分栏视图
          </button>
        </div>
      </div>

      {viewMode === 'unified' ? (
        <div className="diff-viewer">
          {diff.lineDiff.map((part, index) => (
            <div
              key={index}
              className={`diff-line ${part.added ? 'diff-added' : part.removed ? 'diff-removed' : ''}`}
            >
              <span style={{
                display: 'inline-block',
                width: '20px',
                color: '#7f849c',
                userSelect: 'none'
              }}>
                {part.added ? '+' : part.removed ? '-' : ' '}
              </span>
              {part.value}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', backgroundColor: '#313244', borderRadius: '8px', overflow: 'hidden' }}>
          <div className="diff-viewer" style={{ borderRadius: 0, borderRight: '1px solid #313244' }}>
            {diff.lineDiff.map((part, index) => (
              !part.added && (
                <div
                  key={index}
                  className={`diff-line ${part.removed ? 'diff-removed' : ''}`}
                >
                  {part.value}
                </div>
              )
            ))}
          </div>
          <div className="diff-viewer" style={{ borderRadius: 0 }}>
            {diff.lineDiff.map((part, index) => (
              !part.removed && (
                <div
                  key={index}
                  className={`diff-line ${part.added ? 'diff-added' : ''}`}
                >
                  {part.value}
                </div>
              )
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DiffViewer;

import React, { useState } from 'react';

const OutputPanel = ({ output, isExecuting, onRun, onClear }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="output-panel" style={{ height: isExpanded ? '200px' : '40px' }}>
      <div className="output-header">
        <h3>
          {isExecuting ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }}></div>
              执行中...
            </span>
          ) : (
            '📤 输出'
          )}
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 10px', fontSize: '12px' }}
            onClick={onRun}
            disabled={isExecuting}
          >
            重新运行
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 10px', fontSize: '12px' }}
            onClick={onClear}
          >
            清空
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 10px', fontSize: '12px' }}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? '收起' : '展开'}
          </button>
        </div>
      </div>
      
      {isExpanded && (
        <div className="output-content">
          {isExecuting ? (
            <div className="loading">
              <div className="spinner" style={{ width: '20px', height: '20px' }}></div>
            </div>
          ) : !output ? (
            <div style={{ color: '#7f849c', textAlign: 'center', padding: '20px' }}>
              点击 "运行" 按钮执行代码
            </div>
          ) : (
            <>
              {output.stdout && (
                <div className="output-success" style={{ marginBottom: '8px' }}>
                  {output.stdout}
                </div>
              )}
              {output.stderr && (
                <div className="output-error" style={{ marginBottom: '8px' }}>
                  {output.stderr}
                </div>
              )}
              {!output.success && output.error && (
                <div className="output-error">
                  ❌ {output.error}
                </div>
              )}
              {output.success && !output.stdout && !output.stderr && (
                <div className="output-success">
                  ✅ 执行成功（无输出）
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default OutputPanel;

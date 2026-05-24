import React, { useState } from 'react';
import { useGlacier } from '../context/GlacierContext';
import { useCesiumViewer } from './CesiumViewer';
import { flyToGreenland, flyToAntarctica, flyToGlobal } from '../utils/cesiumUtils';

const visualizationModes = [
  { id: 'mass_loss', name: '质量损失速率', description: '显示冰川质量变化速率，红色表示损失严重' },
  { id: 'thickness', name: '冰川厚度', description: '显示冰川绝对厚度分布' },
  { id: 'stability', name: '稳定性概率', description: '按海拔显示冰川稳定性，暖色表示不稳定区域' }
];

export default function ControlPanel() {
  const { state, toggleLayer, setVisualizationMode, toggleDebugPanel, toggleLegend, setSeaLevelScenario } = useGlacier();
  const { getViewer } = useCesiumViewer();
  const [activeTab, setActiveTab] = useState('layers');

  const tabs = [
    { id: 'layers', name: '图层' },
    { id: 'tools', name: '工具' },
    { id: 'settings', name: '设置' }
  ];

  return (
    <div className="panel" style={{
      position: 'absolute',
      top: '80px',
      left: '20px',
      width: '300px',
      maxHeight: 'calc(100vh - 200px)',
      overflowY: 'auto',
      zIndex: 100
    }}>
      <div className="panel-header">
        控制面板
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '11px' }}
            onClick={toggleLegend}
          >
            {state.showLegend ? '隐藏图例' : '显示图例'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '10px',
              background: activeTab === tab.id ? 'var(--bg-light)' : 'transparent',
              border: 'none',
              color: activeTab === tab.id ? 'var(--primary-color)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: activeTab === tab.id ? '600' : '400'
            }}
          >
            {tab.name}
          </button>
        ))}
      </div>

      <div className="panel-body">
        {activeTab === 'layers' && (
          <>
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '13px', marginBottom: '12px', color: 'var(--text-secondary)' }}>可视化模式</h4>
              {visualizationModes.map(mode => (
                <label key={mode.id} style={{
                  display: 'block',
                  padding: '10px',
                  marginBottom: '6px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  background: state.visualizationMode === mode.id ? 'var(--bg-light)' : 'transparent',
                  border: state.visualizationMode === mode.id ? '1px solid var(--primary-color)' : '1px solid transparent',
                  transition: 'all 0.2s'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="radio"
                      name="visualizationMode"
                      value={mode.id}
                      checked={state.visualizationMode === mode.id}
                      onChange={() => setVisualizationMode(mode.id)}
                      style={{ accentColor: 'var(--primary-color)' }}
                    />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '500' }}>{mode.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{mode.description}</div>
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '13px', marginBottom: '12px', color: 'var(--text-secondary)' }}>图层开关</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                  <span style={{ fontSize: '13px' }}>冰川质量变化</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={state.layers.massLoss}
                      onChange={() => toggleLayer('massLoss')}
                    />
                    <span className="slider-switch"></span>
                  </label>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                  <span style={{ fontSize: '13px' }}>冰川流速箭头</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={state.layers.flowArrows}
                      onChange={() => toggleLayer('flowArrows')}
                    />
                    <span className="slider-switch"></span>
                  </label>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                  <span style={{ fontSize: '13px' }}>冰川稳定性</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={state.layers.stability}
                      onChange={() => toggleLayer('stability')}
                    />
                    <span className="slider-switch"></span>
                  </label>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                  <span style={{ fontSize: '13px' }}>海平面上升</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={state.layers.seaLevel}
                      onChange={() => {
                        toggleLayer('seaLevel');
                        if (!state.layers.seaLevel && !state.seaLevelScenario) {
                          setSeaLevelScenario(2.0);
                        } else if (state.layers.seaLevel) {
                          setSeaLevelScenario(null);
                        }
                      }}
                    />
                    <span className="slider-switch"></span>
                  </label>
                </label>
              </div>
            </div>
          </>
        )}

        {activeTab === 'tools' && (
          <>
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '13px', marginBottom: '12px', color: 'var(--text-secondary)' }}>快速导航</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button className="btn btn-secondary" onClick={() => { const v = getViewer(); v && flyToGlobal(v); }}>
                  🌍 全球视角
                </button>
                <button className="btn btn-secondary" onClick={() => { const v = getViewer(); v && flyToGreenland(v); }}>
                  🧊 格陵兰岛
                </button>
                <button className="btn btn-secondary" onClick={() => { const v = getViewer(); v && flyToAntarctica(v); }}>
                  ❄️ 南极洲
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '13px', marginBottom: '12px', color: 'var(--text-secondary)' }}>海平面上升情景</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  className={`btn ${state.seaLevelScenario === 1.5 ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setSeaLevelScenario(1.5)}
                >
                  🌡️ 1.5°C 升温
                </button>
                <button
                  className={`btn ${state.seaLevelScenario === 2.0 ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setSeaLevelScenario(2.0)}
                >
                  🌡️ 2.0°C 升温
                </button>
                <button
                  className={`btn ${state.seaLevelScenario === 3.0 ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setSeaLevelScenario(3.0)}
                >
                  🌡️ 3.0°C 升温
                </button>
              </div>
            </div>
          </>
        )}

        {activeTab === 'settings' && (
          <>
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '13px', marginBottom: '12px', color: 'var(--text-secondary)' }}>显示设置</h4>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px' }}>显示图例</span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={state.showLegend}
                    onChange={toggleLegend}
                  />
                  <span className="slider-switch"></span>
                </label>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px' }}>WebGL调试面板</span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={state.showDebugPanel}
                    onChange={toggleDebugPanel}
                  />
                  <span className="slider-switch"></span>
                </label>
              </label>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '13px', marginBottom: '12px', color: 'var(--text-secondary)' }}>数据来源</h4>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                <p>本系统使用模拟气候模型数据进行演示。</p>
                <p style={{ marginTop: '8px' }}>实际应用中可接入：</p>
                <ul style={{ paddingLeft: '20px', marginTop: '4px' }}>
                  <li>IPCC AR6 气候模型输出</li>
                  <li>GRACE/Follow-On 卫星重力数据</li>
                  <li>ICESat-2 激光测高数据</li>
                  <li>Sentinel-1/2 雷达/光学影像</li>
                </ul>
              </div>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
              版本 1.0.0 | 基于 Cesium.js + WebGL
            </div>
          </>
        )}
      </div>
    </div>
  );
}

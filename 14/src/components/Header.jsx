import React, { useState } from 'react';
import { useGlacier } from '../context/GlacierContext';
import { useCesiumViewer } from './CesiumViewer';
import { flyToGreenland, flyToAntarctica, flyToGlobal } from '../utils/cesiumUtils';

export default function Header({ activeRegion, setActiveRegion }) {
  const { state, toggleDebugPanel, toggleLegend } = useGlacier();
  const { getViewer } = useCesiumViewer();
  const [showHelp, setShowHelp] = useState(false);

  return (
    <>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '60px',
        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(15, 23, 42, 0.9) 100%)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        zIndex: 200,
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px'
          }}>
            🌍
          </div>
          <div>
            <h1 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              margin: 0
            }}>
              全球冰川变化可视化系统
            </h1>
            <p style={{
              fontSize: '11px',
              color: 'var(--text-secondary)',
              margin: '2px 0 0 0'
            }}>
              基于 Cesium.js · WebGL · React
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            display: 'flex',
            background: 'var(--bg-medium)',
            borderRadius: '6px',
            padding: '2px',
            marginRight: '16px'
          }}>
            <button
              onClick={() => {
                setActiveRegion('global');
                const viewer = getViewer();
                viewer && flyToGlobal(viewer);
              }}
              style={{
                padding: '6px 12px',
                background: activeRegion === 'global' ? 'var(--primary-color)' : 'transparent',
                border: 'none',
                borderRadius: '4px',
                color: activeRegion === 'global' ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: activeRegion === 'global' ? '500' : '400',
                transition: 'all 0.2s'
              }}
            >
              全球
            </button>
            <button
              onClick={() => {
                setActiveRegion('greenland');
                const viewer = getViewer();
                viewer && flyToGreenland(viewer);
              }}
              style={{
                padding: '6px 12px',
                background: activeRegion === 'greenland' ? 'var(--primary-color)' : 'transparent',
                border: 'none',
                borderRadius: '4px',
                color: activeRegion === 'greenland' ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: activeRegion === 'greenland' ? '500' : '400',
                transition: 'all 0.2s'
              }}
            >
              格陵兰岛
            </button>
            <button
              onClick={() => {
                setActiveRegion('antarctica');
                const viewer = getViewer();
                viewer && flyToAntarctica(viewer);
              }}
              style={{
                padding: '6px 12px',
                background: activeRegion === 'antarctica' ? 'var(--primary-color)' : 'transparent',
                border: 'none',
                borderRadius: '4px',
                color: activeRegion === 'antarctica' ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: activeRegion === 'antarctica' ? '500' : '400',
                transition: 'all 0.2s'
              }}
            >
              南极洲
            </button>
          </div>

          <button
            onClick={toggleLegend}
            className="btn btn-secondary"
            style={{ padding: '6px 10px', fontSize: '12px' }}
            title={state.showLegend ? '隐藏图例' : '显示图例'}
          >
            📋 图例
          </button>
          <button
            onClick={toggleDebugPanel}
            className="btn btn-secondary"
            style={{ padding: '6px 10px', fontSize: '12px' }}
            title={state.showDebugPanel ? '关闭调试面板' : '打开调试面板'}
          >
            🔧 调试
          </button>
          <button
            onClick={() => setShowHelp(true)}
            className="btn btn-secondary"
            style={{ padding: '6px 10px', fontSize: '12px' }}
          >
            ❓ 帮助
          </button>
        </div>
      </div>

      {showHelp && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowHelp(false)}>
          <div className="panel" style={{
            width: '500px',
            maxHeight: '80vh',
            overflowY: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <div className="panel-header">
              📖 使用帮助
              <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => setShowHelp(false)}>✕</button>
            </div>
            <div className="panel-body" style={{ fontSize: '13px', lineHeight: '1.8' }}>
              <h4 style={{ marginBottom: '12px', color: 'var(--primary-color)' }}>系统功能</h4>

              <div style={{ marginBottom: '16px' }}>
                <strong>🌍 基本操作</strong>
                <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                  <li>鼠标左键拖动: 旋转地球</li>
                  <li>鼠标滚轮: 缩放视图</li>
                  <li>鼠标右键拖动: 平移视图</li>
                </ul>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <strong>⏱️ 时间轴控制</strong>
                <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                  <li>播放/暂停: 播放1980-2024年冰川变化动画</li>
                  <li>拖动滑块: 跳转到指定时间点</li>
                  <li>速度控制: 0.25x ~ 8x 播放速度</li>
                </ul>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <strong>📊 分析工具</strong>
                <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                  <li>剖面分析: 绘制剖面线查看厚度变化曲线</li>
                  <li>区域统计: 框选区域计算冰川变化统计</li>
                  <li>数据比较: 分屏或滑动条对比不同年份</li>
                </ul>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <strong>🌊 海平面上升模拟</strong>
                <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                  <li>1.5°C / 2.0°C / 3.0°C 升温情景</li>
                  <li>显示受影响的沿海城市</li>
                  <li>估算受影响人口</li>
                </ul>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <strong>✈️ 飞行漫游</strong>
                <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                  <li>自动飞行浏览格陵兰岛主要冰川</li>
                  <li>9个预设航点，含雅各布港、赫尔海姆冰川</li>
                  <li>支持循环播放和手动跳转</li>
                </ul>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <strong>📥 数据导出</strong>
                <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                  <li>CSV格式: 统计数据和剖面数据</li>
                  <li>GeoTIFF格式: 栅格数据导出</li>
                </ul>
              </div>

              <div style={{
                padding: '12px',
                background: 'rgba(59, 130, 246, 0.1)',
                borderRadius: '6px',
                fontSize: '12px'
              }}>
                <strong style={{ color: 'var(--primary-color)' }}>说明:</strong>
                本系统使用模拟数据进行演示。实际应用中可接入IPCC AR6气候模型输出、GRACE/Follow-On卫星重力数据、ICESat-2激光测高数据等真实数据源。
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

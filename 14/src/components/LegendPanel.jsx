import React from 'react';
import { useGlacier } from '../context/GlacierContext';
import { massLossColorMap, stabilityColorMap, velocityColorMap, elevationColorMap, seaLevelColorMap, rgbaToString, generateGradientCSS } from '../utils/colorMaps';
import { formatDateFull } from '../utils/dateUtils';

export default function LegendPanel({ data, activeRegion }) {
  const { state } = useGlacier();

  if (!state.showLegend) return null;

  const getCurrentColorMap = () => {
    if (state.visualizationMode === 'stability') return stabilityColorMap;
    if (state.visualizationMode === 'thickness') return massLossColorMap;
    return massLossColorMap;
  };

  const getTitle = () => {
    if (state.visualizationMode === 'stability') return '冰川稳定性概率';
    if (state.visualizationMode === 'thickness') return '冰川厚度 (m)';
    return '冰川质量损失速率 (m/年)';
  };

  const getLabels = () => {
    if (state.visualizationMode === 'stability') {
      return ['不稳定', '稳定'];
    }
    if (state.visualizationMode === 'thickness') {
      return ['薄', '厚'];
    }
    return ['积累', '严重损失'];
  };

  const colorMap = getCurrentColorMap();
  const [minLabel, maxLabel] = getLabels();

  return (
    <div className="panel" style={{
      position: 'absolute',
      bottom: '180px',
      right: '20px',
      width: '260px',
      zIndex: 100
    }}>
      <div className="panel-header">
        📋 图例与说明
      </div>
      <div className="panel-body">
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
            当前数据: {activeRegion === 'greenland' ? '格陵兰岛' : activeRegion === 'antarctica' ? '南极洲' : '全球'}
          </div>
          <div style={{ fontSize: '12px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
            时间范围: {formatDateFull(state.currentDate)}
          </div>
          {data && data.globalAttributes && (
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              <p>数据源: {data.globalAttributes.source}</p>
              <p>分辨率: {data.globalAttributes.resolution}</p>
            </div>
          )}
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: '500', marginBottom: '8px' }}>
            {getTitle()}
          </div>
          <div
            className="legend-gradient"
            style={{ background: generateGradientCSS(colorMap) }}
          />
          <div className="legend-labels">
            <span>{colorMap[0].value}</span>
            <span>{colorMap[Math.floor(colorMap.length / 2)].value}</span>
            <span>{colorMap[colorMap.length - 1].value}</span>
          </div>
          <div className="legend-labels" style={{ marginTop: '4px' }}>
            <span>{minLabel}</span>
            <span>{maxLabel}</span>
          </div>
        </div>

        {state.layers.flowArrows && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: '500', marginBottom: '8px' }}>
              冰川流速 (m/年)
            </div>
            <div
              className="legend-gradient"
              style={{ background: generateGradientCSS(velocityColorMap) }}
            />
            <div className="legend-labels">
              <span>0</span>
              <span>500</span>
              <span>1000+</span>
            </div>
          </div>
        )}

        {state.layers.stability && state.visualizationMode !== 'stability' && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: '500', marginBottom: '8px' }}>
              冰川稳定性
            </div>
            <div
              className="legend-gradient"
              style={{ background: generateGradientCSS(stabilityColorMap) }}
            />
            <div className="legend-labels">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>
        )}

        {state.seaLevelScenario && state.layers.seaLevel && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: '500', marginBottom: '8px' }}>
              海平面上升 (m)
            </div>
            <div
              className="legend-gradient"
              style={{ background: generateGradientCSS(seaLevelColorMap) }}
            />
            <div className="legend-labels">
              <span>0</span>
              <span>1.5</span>
              <span>3.0</span>
            </div>
          </div>
        )}

        <div style={{
          padding: '10px',
          background: 'var(--bg-light)',
          borderRadius: '6px',
          fontSize: '11px',
          color: 'var(--text-secondary)',
          lineHeight: '1.5'
        }}>
          <div style={{ fontWeight: '500', color: 'var(--text-primary)', marginBottom: '6px' }}>
            海拔分层说明:
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '2px',
              background: rgbaToString([220, 20, 60, 180])
            }} />
            <span>{'< 1500m - 高风险 (不稳定)'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '2px',
              background: rgbaToString([255, 215, 0, 180])
            }} />
            <span>1500-2500m - 中等风险</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '2px',
              background: rgbaToString([34, 139, 34, 180])
            }} />
            <span>{'> 2500m - 低风险 (稳定)'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

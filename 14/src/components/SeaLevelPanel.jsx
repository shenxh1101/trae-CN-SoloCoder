import React, { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import { useGlacier } from '../context/GlacierContext';
import { useCesiumViewer } from './CesiumViewer';
import { getFloodedCities, getSeaLevelRiseForScenario } from '../utils/mockData';
import { seaLevelColorMap, interpolateColor, rgbaToString } from '../utils/colorMaps';

export default function SeaLevelPanel() {
  const { state, setSeaLevelScenario } = useGlacier();
  const { getViewer } = useCesiumViewer();
  const dataSourceRef = useRef(null);
  const [floodedCities, setFloodedCities] = useState([]);

  useEffect(() => {
    const viewer = getViewer();
    if (!viewer) return;

    if (state.seaLevelScenario && state.layers.seaLevel) {
      const scenario = getSeaLevelRiseForScenario(state.seaLevelScenario);
      const cities = getFloodedCities(state.seaLevelScenario);
      setFloodedCities(cities);

      if (dataSourceRef.current) {
        viewer.dataSources.remove(dataSourceRef.current);
      }

      const dataSource = new Cesium.CustomDataSource('seaLevel');
      dataSourceRef.current = dataSource;

      const seaLevelRise = scenario.rise;

      cities.forEach(city => {
        const color = city.flooded
          ? Cesium.Color.RED.withAlpha(0.8)
          : Cesium.Color.YELLOW.withAlpha(0.6);

        const size = city.flooded ? 15 + Math.min(city.population / 5000000, 20) : 8;

        dataSource.entities.add({
          position: Cesium.Cartesian3.fromDegrees(city.lon, city.lat, 5000),
          name: city.name,
          description: `
            <div style="font-family: sans-serif; padding: 10px;">
              <h4 style="margin: 0 0 10px 0;">${city.name}</h4>
              <p style="margin: 5px 0;"><strong>人口:</strong> ${(city.population / 1000000).toFixed(1)} 百万</p>
              <p style="margin: 5px 0;"><strong>海拔:</strong> ${city.elevation} m</p>
              <p style="margin: 5px 0;"><strong>海平面上升:</strong> ${seaLevelRise} m</p>
              <p style="margin: 5px 0; color: ${city.flooded ? '#ef4444' : '#eab308'};">
                <strong>${city.flooded ? '⚠️ 将被淹没' : '⚠️ 存在风险'}</strong>
              </p>
              ${city.flooded ? `<p style="margin: 5px 0;"><strong>淹没深度:</strong> ${city.floodDepth.toFixed(1)} m</p>` : ''}
              <p style="margin: 5px 0;"><strong>受影响人口:</strong> ${(city.affectedPopulation / 1000000).toFixed(1)} 百万</p>
            </div>
          `,
          ellipsoid: {
            radii: new Cesium.Cartesian3(size * 1000, size * 1000, size * 1000),
            material: color,
            outline: true,
            outlineColor: Cesium.Color.WHITE.withAlpha(0.8),
            outlineWidth: 2
          }
        });
      });

      viewer.dataSources.add(dataSource);
    } else {
      setFloodedCities([]);
      if (dataSourceRef.current) {
        viewer.dataSources.remove(dataSourceRef.current);
        dataSourceRef.current = null;
      }
    }

    return () => {
      const v = getViewer();
      if (dataSourceRef.current && v && !v.isDestroyed()) {
        v.dataSources.remove(dataSourceRef.current);
        dataSourceRef.current = null;
      }
    };
  }, [state.seaLevelScenario, state.layers.seaLevel]);

  if (!state.seaLevelScenario || !state.layers.seaLevel) {
    return null;
  }

  const scenario = getSeaLevelRiseForScenario(state.seaLevelScenario);
  const totalAffected = floodedCities.reduce((sum, city) => sum + city.affectedPopulation, 0);
  const floodedCount = floodedCities.filter(c => c.flooded).length;

  return (
    <div className="panel" style={{
      position: 'absolute',
      bottom: '180px',
      right: '20px',
      width: '320px',
      maxHeight: '400px',
      overflowY: 'auto',
      zIndex: 100
    }}>
      <div className="panel-header">
        🌊 海平面上升影响模拟
        <button
          className="btn btn-danger"
          style={{ padding: '4px 8px', fontSize: '11px' }}
          onClick={() => {
            setSeaLevelScenario(null);
          }}
        >
          关闭
        </button>
      </div>
      <div className="panel-body">
        <div style={{
          padding: '12px',
          background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
          borderRadius: '8px',
          marginBottom: '16px',
          color: 'white'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>
            +{state.seaLevelScenario}°C
          </div>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>
            预计海平面上升: <strong>{scenario.rise} m</strong> (±{scenario.uncertainty}m)
          </div>
          <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '4px' }}>
            预测年份: {scenario.year}年
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            className={`btn ${state.seaLevelScenario === 1.5 ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '8px 4px', fontSize: '12px' }}
            onClick={() => setSeaLevelScenario(1.5)}
          >
            +1.5°C
          </button>
          <button
            className={`btn ${state.seaLevelScenario === 2.0 ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '8px 4px', fontSize: '12px' }}
            onClick={() => setSeaLevelScenario(2.0)}
          >
            +2.0°C
          </button>
          <button
            className={`btn ${state.seaLevelScenario === 3.0 ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '8px 4px', fontSize: '12px' }}
            onClick={() => setSeaLevelScenario(3.0)}
          >
            +3.0°C
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          marginBottom: '16px'
        }}>
          <div style={{
            padding: '10px',
            background: 'var(--bg-light)',
            borderRadius: '6px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--danger-color)' }}>
              {floodedCount}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
              受淹城市
            </div>
          </div>
          <div style={{
            padding: '10px',
            background: 'var(--bg-light)',
            borderRadius: '6px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--warning-color)' }}>
              {(totalAffected / 1e9).toFixed(2)}B
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
              受影响人口
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
            受影响城市列表
          </div>
          <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
            {floodedCities.slice(0, 10).map((city, index) => (
              <div key={city.name} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px',
                marginBottom: '4px',
                background: city.flooded ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-light)',
                borderRadius: '4px',
                fontSize: '11px',
                borderLeft: `3px solid ${city.flooded ? 'var(--danger-color)' : 'var(--warning-color)'}`
              }}>
                <span>{index + 1}. {city.name}</span>
                <span style={{ color: city.flooded ? 'var(--danger-color)' : 'var(--warning-color)' }}>
                  {city.flooded ? '淹没' : '风险'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="legend-gradient" style={{
          background: `linear-gradient(to right, ${seaLevelColorMap.map(c => `${rgbaToString(c.color)} ${c.value * 33.33}%`).join(', ')})`
        }} />
        <div className="legend-labels">
          <span>0m</span>
          <span>1m</span>
          <span>2m</span>
          <span>3m</span>
        </div>

        <p style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '12px', textAlign: 'center' }}>
          💡 点击地图上的城市标记查看详细信息
        </p>
      </div>
    </div>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import { useGlacier } from '../context/GlacierContext';
import { useCesiumViewer } from './CesiumViewer';

export default function DebugPanel() {
  const { state } = useGlacier();
  const { getViewer } = useCesiumViewer();
  const [stats, setStats] = useState({
    fps: 0,
    frameTime: 0,
    tilesLoaded: 0,
    tilesVisible: 0,
    memoryUsed: 0,
    drawCalls: 0,
    cameraPosition: { lat: 0, lon: 0, height: 0 }
  });
  const animationRef = useRef(null);
  const lastUpdateRef = useRef(0);
  const frameCountRef = useRef(0);
  const frameTimeRef = useRef(0);

  useEffect(() => {
    let mounted = true;
    
    const init = () => {
      const viewer = getViewer();
      if (!viewer || !state.showDebugPanel || !mounted) return;

      const updateStats = (timestamp) => {
        if (!mounted) return;
        
        const v = getViewer();
        if (!v || v.isDestroyed()) return;

        try {
          frameCountRef.current++;
          const now = performance.now();
          const delta = now - lastUpdateRef.current;

          if (delta >= 1000) {
            const fps = Math.round((frameCountRef.current * 1000) / delta);
            const avgFrameTime = delta / frameCountRef.current;

            const camera = v.camera;
            const cartographic = Cesium.Cartographic.fromCartesian(camera.position);

            let memoryUsed = 0;
            if (performance.memory) {
              memoryUsed = performance.memory.usedJSHeapSize / (1024 * 1024);
            }

            let tilesLoaded = 0;
            let tilesVisible = 0;
            try {
              const tiles = v.scene.globe?._surface?._tileProvider?._tiles;
              if (tiles && typeof tiles.forEach === 'function') {
                tiles.forEach(tile => {
                  if (tile?._ready) tilesLoaded++;
                  if (tile?._visible) tilesVisible++;
                });
              }
            } catch (e) {
              // ignore
            }

            let drawCalls = 0;
            try {
              const context = v.scene.context;
              if (context && context._performanceDisplay) {
                drawCalls = context._performanceDisplay._frameStats?.numberOfDrawCalls || 0;
              }
            } catch (e) {
              // ignore
            }

            if (mounted) {
              setStats({
                fps,
                frameTime: avgFrameTime,
                tilesLoaded,
                tilesVisible,
                memoryUsed,
                drawCalls,
                cameraPosition: {
                  lat: Cesium.Math.toDegrees(cartographic.latitude).toFixed(4),
                  lon: Cesium.Math.toDegrees(cartographic.longitude).toFixed(4),
                  height: (cartographic.height / 1000).toFixed(2)
                }
              });
            }

            frameCountRef.current = 0;
            lastUpdateRef.current = now;
          }
        } catch (e) {
          console.warn('DebugPanel stats update error:', e);
        }

        if (mounted) {
          animationRef.current = requestAnimationFrame(updateStats);
        }
      };

      lastUpdateRef.current = performance.now();
      animationRef.current = requestAnimationFrame(updateStats);
    };

    init();

    return () => {
      mounted = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [state.showDebugPanel]);

  if (!state.showDebugPanel) return null;

  const getFpsColor = (fps) => {
    if (fps >= 50) return 'var(--success-color)';
    if (fps >= 30) return 'var(--warning-color)';
    return 'var(--danger-color)';
  };

  return (
    <div className="panel" style={{
      position: 'absolute',
      top: '80px',
      right: '20px',
      width: '280px',
      zIndex: 1000,
      fontFamily: 'monospace'
    }}>
      <div className="panel-header">
        🔧 WebGL 调试面板
        <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
          Cesium.js + WebGL
        </div>
      </div>
      <div className="panel-body" style={{ padding: '12px', fontSize: '11px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
          marginBottom: '12px'
        }}>
          <div style={{
            padding: '10px',
            background: 'var(--bg-light)',
            borderRadius: '6px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: getFpsColor(stats.fps) }}>
              {stats.fps}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
              FPS
            </div>
          </div>
          <div style={{
            padding: '10px',
            background: 'var(--bg-light)',
            borderRadius: '6px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--primary-color)' }}>
              {stats.frameTime.toFixed(1)}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
              ms/帧
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            瓦片渲染
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
            <span style={{ color: 'var(--text-secondary)' }}>已加载瓦片:</span>
            <span>{stats.tilesLoaded}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
            <span style={{ color: 'var(--text-secondary)' }}>可见瓦片:</span>
            <span>{stats.tilesVisible}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
            <span style={{ color: 'var(--text-secondary)' }}>绘制调用:</span>
            <span>{stats.drawCalls}</span>
          </div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            内存使用
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
            <span style={{ color: 'var(--text-secondary)' }}>JS Heap:</span>
            <span>{stats.memoryUsed.toFixed(1)} MB</span>
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            相机位置
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
            <span style={{ color: 'var(--text-secondary)' }}>纬度:</span>
            <span>{stats.cameraPosition.lat}°</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
            <span style={{ color: 'var(--text-secondary)' }}>经度:</span>
            <span>{stats.cameraPosition.lon}°</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
            <span style={{ color: 'var(--text-secondary)' }}>高度:</span>
            <span>{stats.cameraPosition.height} km</span>
          </div>
        </div>

        <div style={{
          marginTop: '12px',
          padding: '8px',
          background: 'rgba(59, 130, 246, 0.1)',
          borderRadius: '4px',
          fontSize: '10px',
          color: 'var(--text-secondary)',
          lineHeight: '1.4'
        }}>
          <strong style={{ color: 'var(--primary-color)' }}>WebGL信息:</strong>
          <div>渲染器: Cesium Scene</div>
          <div>LOD: 动态瓦片加载</div>
          <div>缓存: 100 tiles</div>
        </div>
      </div>
    </div>
  );
}

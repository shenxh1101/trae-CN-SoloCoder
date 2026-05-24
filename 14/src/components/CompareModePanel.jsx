import React, { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { useGlacier } from '../context/GlacierContext';
import { useCesiumViewer } from './CesiumViewer';
import { interpolateColor, massLossColorMap } from '../utils/colorMaps';

export default function CompareModePanel({ data }) {
  const { state, setCompareMode, setCompareYears, setCompareSplitMode } = useGlacier();
  const { getViewer } = useCesiumViewer();
  const leftLayerRef = useRef(null);
  const rightLayerRef = useRef(null);
  const sliderRef = useRef(null);
  const containerRef = useRef(null);

  const renderYearLayer = (year, splitDirection) => {
    const viewer = getViewer();
    if (!viewer || !data || !data.bounds) return null;

    const { west, east, south, north } = data.bounds;
    const latVar = data.variables['lat'];
    const lonVar = data.variables['lon'];
    const thicknessVar = data.variables['thickness'];

    if (!latVar || !lonVar || !thicknessVar) return null;

    const lats = latVar.data;
    const lons = lonVar.data;
    const latSize = lats.length;
    const lonSize = lons.length;

    const timeIndex = (year - 1980) * 12;
    const clampedIndex = Math.max(0, Math.min(timeIndex, data.dimensions.time - 1));

    const canvas = document.createElement('canvas');
    canvas.width = lonSize;
    canvas.height = latSize;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(lonSize, latSize);

    for (let i = 0; i < latSize; i++) {
      for (let j = 0; j < lonSize; j++) {
        const idx = clampedIndex * latSize * lonSize + i * lonSize + j;
        const value = thicknessVar.data[idx];
        const pixelIdx = (i * lonSize + j) * 4;

        if (value !== null && value !== undefined && !isNaN(value) && value > 10) {
          const color = interpolateColor(massLossColorMap, value);
          imageData.data[pixelIdx] = color[0];
          imageData.data[pixelIdx + 1] = color[1];
          imageData.data[pixelIdx + 2] = color[2];
          imageData.data[pixelIdx + 3] = color[3];
        } else {
          imageData.data[pixelIdx + 3] = 0;
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);

    const imageryProvider = new Cesium.SingleTileImageryProvider({
      url: canvas.toDataURL(),
      rectangle: Cesium.Rectangle.fromDegrees(west, south, east, north),
      tileWidth: canvas.width,
      tileHeight: canvas.height,
      tilingScheme: new Cesium.GeographicTilingScheme()
    });

    const layer = viewer.imageryLayers.addImageryProvider(imageryProvider);
    layer.splitDirection = splitDirection;
    layer.alpha = 0.8;

    return layer;
  };

  useEffect(() => {
    const viewer = getViewer();
    if (!viewer || !state.compareMode || !data) return;

    const safeTimeIndex = (data.dimensions.time || 1) - 1;

    if (state.compareSplitMode === 'split') {
      viewer.scene.splitPosition = 0.5;

      if (leftLayerRef.current) viewer.imageryLayers.remove(leftLayerRef.current);
      if (rightLayerRef.current) viewer.imageryLayers.remove(rightLayerRef.current);

      leftLayerRef.current = renderYearLayer(state.compareYear1, Cesium.SplitDirection.LEFT);
      rightLayerRef.current = renderYearLayer(state.compareYear2, Cesium.SplitDirection.RIGHT);
    } else {
      viewer.scene.splitPosition = undefined;

      if (leftLayerRef.current) {
        viewer.imageryLayers.remove(leftLayerRef.current);
        leftLayerRef.current = null;
      }
      if (rightLayerRef.current) {
        viewer.imageryLayers.remove(rightLayerRef.current);
        rightLayerRef.current = null;
      }

      if (state.layers.massLoss) {
        rightLayerRef.current = renderYearLayer(state.compareYear2, Cesium.SplitDirection.NONE);
      }
    }

    return () => {
      const v = getViewer();
      if (v && !v.isDestroyed()) {
        v.scene.splitPosition = undefined;
        if (leftLayerRef.current) {
          v.imageryLayers.remove(leftLayerRef.current);
        }
        if (rightLayerRef.current) {
          v.imageryLayers.remove(rightLayerRef.current);
        }
      }
      leftLayerRef.current = null;
      rightLayerRef.current = null;
    };
  }, [state.compareMode, state.compareYear1, state.compareYear2, state.compareSplitMode, data, state.layers.massLoss]);

  useEffect(() => {
    const viewer = getViewer();
    if (!viewer || !state.compareMode || state.compareSplitMode !== 'slider') return;

    const updateSliderPosition = (position) => {
      if (rightLayerRef.current) {
        rightLayerRef.current.splitDirection = Cesium.SplitDirection.LEFT;
      }
      viewer.scene.splitPosition = position;
    };

    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      updateSliderPosition(x);
    };

    const handleTouchMove = (e) => {
      if (!containerRef.current || e.touches.length === 0) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.touches[0].clientX - rect.left) / rect.width;
      updateSliderPosition(x);
    };

    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      cursor: ew-resize;
      z-index: 999;
      pointer-events: none;
    `;

    const slider = document.createElement('div');
    slider.style.cssText = `
      position: absolute;
      top: 0;
      left: 50%;
      width: 4px;
      height: 100%;
      background: rgba(255, 255, 255, 0.9);
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
      pointer-events: auto;
      cursor: ew-resize;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    const handle = document.createElement('div');
    handle.style.cssText = `
      width: 40px;
      height: 40px;
      background: var(--primary-color);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 18px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    `;
    handle.innerHTML = '⇔';

    slider.appendChild(handle);
    overlay.appendChild(slider);
    containerRef.current = overlay;
    sliderRef.current = slider;

    let isDragging = false;

    const startDrag = (e) => {
      isDragging = true;
      document.body.style.cursor = 'ew-resize';
      e.preventDefault();
    };

    const endDrag = () => {
      isDragging = false;
      document.body.style.cursor = '';
    };

    const drag = (e) => {
      if (!isDragging) return;
      const x = (e.clientX || e.touches?.[0]?.clientX) / window.innerWidth;
      const clampedX = Math.max(0.1, Math.min(0.9, x));
      viewer.scene.splitPosition = clampedX;
      if (sliderRef.current) {
        sliderRef.current.style.left = `${clampedX * 100}%`;
      }
    };

    slider.addEventListener('mousedown', startDrag);
    slider.addEventListener('touchstart', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);

    viewer.container.appendChild(overlay);
    updateSliderPosition(0.5);

    return () => {
      slider.removeEventListener('mousedown', startDrag);
      slider.removeEventListener('touchstart', startDrag);
      document.removeEventListener('mousemove', drag);
      document.removeEventListener('touchmove', drag);
      document.removeEventListener('mouseup', endDrag);
      document.removeEventListener('touchend', endDrag);
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
      const v = getViewer();
      if (v && !v.isDestroyed()) {
        v.scene.splitPosition = undefined;
      }
    };
  }, [state.compareMode, state.compareSplitMode]);

  if (!state.compareMode) {
    return (
      <div className="panel" style={{
        position: 'absolute',
        top: '80px',
        right: '20px',
        width: '280px',
        zIndex: 100
      }}>
        <div className="panel-body">
          <h4 style={{ fontSize: '14px', marginBottom: '12px' }}>数据比较模式</h4>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            选择两个年份对比冰川覆盖范围变化
          </p>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setCompareMode(true)}>
            开启比较模式
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="panel" style={{
      position: 'absolute',
      top: '80px',
      right: '20px',
      width: '300px',
      zIndex: 100
    }}>
      <div className="panel-header">
        数据比较模式
        <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => setCompareMode(false)}>
          关闭
        </button>
      </div>
      <div className="panel-body">
        <div style={{ marginBottom: '16px' }}>
          <div className="slider-container">
            <div className="slider-label">
              <span>年份 A: {state.compareYear1}</span>
            </div>
            <input
              type="range"
              min={1980}
              max={2024}
              value={state.compareYear1}
              onChange={(e) => setCompareYears(parseInt(e.target.value), state.compareYear2)}
              className="slider"
            />
          </div>

          <div className="slider-container">
            <div className="slider-label">
              <span>年份 B: {state.compareYear2}</span>
            </div>
            <input
              type="range"
              min={1980}
              max={2024}
              value={state.compareYear2}
              onChange={(e) => setCompareYears(state.compareYear1, parseInt(e.target.value))}
              className="slider"
            />
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>显示模式</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className={`btn ${state.compareSplitMode === 'split' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1 }}
              onClick={() => setCompareSplitMode('split')}
            >
              左右分屏
            </button>
            <button
              className={`btn ${state.compareSplitMode === 'slider' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1 }}
              onClick={() => setCompareSplitMode('slider')}
            >
              滑动对比
            </button>
          </div>
        </div>

        <div style={{
          padding: '12px',
          background: 'var(--bg-light)',
          borderRadius: '6px',
          fontSize: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>变化时间跨度:</span>
            <span>{state.compareYear2 - state.compareYear1} 年</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>左侧/滑动上方:</span>
            <span>{state.compareYear1}年</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>右侧/滑动下方:</span>
            <span>{state.compareYear2}年</span>
          </div>
        </div>

        {state.compareSplitMode === 'slider' && (
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '12px', textAlign: 'center' }}>
            💡 拖动中央滑块对比两个年份数据
          </p>
        )}
      </div>
    </div>
  );
}

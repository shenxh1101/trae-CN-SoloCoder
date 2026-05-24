import React, { useState, useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { useGlacier } from '../context/GlacierContext';
import { useCesiumViewer } from './CesiumViewer';
import { dataLoader } from '../utils/dataLoader';
import { dateToMonthIndex } from '../utils/dateUtils';
import { exportRegionStats, exportToGeoTIFF, formatNumber } from '../utils/exportUtils';

export default function RegionStatsPanel({ data }) {
  const { state, setSelectedRegion } = useGlacier();
  const { getViewer } = useCesiumViewer();
  const [isDrawing, setIsDrawing] = useState(false);
  const [regionStats, setRegionStats] = useState(null);
  const [bounds, setBounds] = useState(null);
  const handlerRef = useRef(null);
  const rectangleEntityRef = useRef(null);

  const startDrawing = () => {
    setIsDrawing(true);
    setRegionStats(null);
    setBounds(null);
    setSelectedRegion(null);
  };

  const cancelDrawing = () => {
    setIsDrawing(false);
    const viewer = getViewer();
    if (rectangleEntityRef.current && viewer && !viewer.isDestroyed()) {
      viewer.entities.remove(rectangleEntityRef.current);
      rectangleEntityRef.current = null;
    }
  };

  useEffect(() => {
    const viewer = getViewer();
    if (!viewer || !isDrawing) return;

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handlerRef.current = handler;

    let firstPoint = null;
    let tempRectangle = null;

    handler.setInputAction((movement) => {
      const ray = viewer.camera.getPickRay(movement.position);
      if (!ray) return;

      const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
      if (!cartesian) return;

      const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
      const lon = Cesium.Math.toDegrees(cartographic.longitude);
      const lat = Cesium.Math.toDegrees(cartographic.latitude);

      if (!firstPoint) {
        firstPoint = { lon, lat };
      } else {
        const west = Math.min(firstPoint.lon, lon);
        const east = Math.max(firstPoint.lon, lon);
        const south = Math.min(firstPoint.lat, lat);
        const north = Math.max(firstPoint.lat, lat);

        const rectangle = Cesium.Rectangle.fromDegrees(west, south, east, north);

        if (tempRectangle) {
          const v = getViewer();
          if (v && !v.isDestroyed()) {
            v.entities.remove(tempRectangle);
          }
        }

        tempRectangle = viewer.entities.add({
          rectangle: {
            coordinates: rectangle,
            material: Cesium.Color.BLUE.withAlpha(0.2),
            outline: true,
            outlineColor: Cesium.Color.BLUE,
            outlineWidth: 2
          }
        });
        rectangleEntityRef.current = tempRectangle;

        const regionBounds = { west, east, south, north };
        setBounds(regionBounds);
        setSelectedRegion(regionBounds);

        calculateStats(regionBounds);

        handler.destroy();
        setIsDrawing(false);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    handler.setInputAction((movement) => {
      if (!firstPoint) return;

      const ray = viewer.camera.getPickRay(movement.endPosition);
      if (!ray) return;

      const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
      if (!cartesian) return;

      const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
      const lon = Cesium.Math.toDegrees(cartographic.longitude);
      const lat = Cesium.Math.toDegrees(cartographic.latitude);

      const west = Math.min(firstPoint.lon, lon);
      const east = Math.max(firstPoint.lon, lon);
      const south = Math.min(firstPoint.lat, lat);
      const north = Math.max(firstPoint.lat, lat);

      const rectangle = Cesium.Rectangle.fromDegrees(west, south, east, north);

      if (tempRectangle) {
        const v = getViewer();
        if (v && !v.isDestroyed()) {
          v.entities.remove(tempRectangle);
        }
      }

      tempRectangle = viewer.entities.add({
        rectangle: {
          coordinates: rectangle,
          material: Cesium.Color.YELLOW.withAlpha(0.15),
          outline: true,
          outlineColor: Cesium.Color.YELLOW,
          outlineWidth: 2
        }
      });
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    return () => {
      handler.destroy();
      const v = getViewer();
      if (tempRectangle && v && !v.isDestroyed()) {
        v.entities.remove(tempRectangle);
      }
    };
  }, [isDrawing, data]);

  const calculateStats = (regionBounds) => {
    if (!data) return;

    const timeIndex1 = Math.max(0, Math.min(0, data.dimensions.time - 1));
    const timeIndex2 = Math.max(0, Math.min(dateToMonthIndex(state.currentDate, state.startDate), data.dimensions.time - 1));

    const stats = dataLoader.getRegionStats(data, regionBounds, timeIndex1, timeIndex2);
    setRegionStats(stats);
  };

  const handleExportCSV = () => {
    if (regionStats && bounds) {
      exportRegionStats(
        regionStats,
        bounds,
        { start: '1980-01', end: state.currentDate.toISOString().slice(0, 7) }
      );
    }
  };

  const handleExportGeoTIFF = () => {
    if (!data || !bounds) return;

    const timeIndex = dateToMonthIndex(state.currentDate, state.startDate);
    const gridData = dataLoader.generateGridForRegion(bounds, 50, data, timeIndex);
    gridData.width = 51;
    gridData.height = 51;

    exportToGeoTIFF(gridData, bounds, 'glacier_mass_loss.tif');
  };

  const clearRegion = () => {
    setRegionStats(null);
    setBounds(null);
    setSelectedRegion(null);
    const viewer = getViewer();
    if (rectangleEntityRef.current && viewer && !viewer.isDestroyed()) {
      viewer.entities.remove(rectangleEntityRef.current);
      rectangleEntityRef.current = null;
    }
  };

  return (
    <div className="panel" style={{
      position: 'absolute',
      top: '80px',
      left: '340px',
      width: '300px',
      zIndex: 100
    }}>
      <div className="panel-header">
        📊 区域统计
        {bounds && (
          <button
            className="btn btn-danger"
            style={{ padding: '4px 8px', fontSize: '11px' }}
            onClick={clearRegion}
          >
            清除
          </button>
        )}
      </div>
      <div className="panel-body">
        {!isDrawing && !regionStats && (
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={startDrawing}>
            🖱️ 框选统计区域
          </button>
        )}

        {isDrawing && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--warning-color)', marginBottom: '8px' }}>
              点击并拖动绘制统计区域...
            </p>
            <button className="btn btn-danger" onClick={cancelDrawing}>
              取消
            </button>
          </div>
        )}

        {regionStats && (
          <>
            <div style={{
              padding: '12px',
              background: 'var(--bg-light)',
              borderRadius: '6px',
              marginBottom: '12px'
            }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                区域边界
              </div>
              <div style={{ fontSize: '10px', fontFamily: 'monospace', lineHeight: '1.5' }}>
                <div>西: {bounds.west.toFixed(4)}°</div>
                <div>东: {bounds.east.toFixed(4)}°</div>
                <div>南: {bounds.south.toFixed(4)}°</div>
                <div>北: {bounds.north.toFixed(4)}°</div>
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 0',
                borderBottom: '1px solid var(--border-color)'
              }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  冰川质量总变化
                </span>
                <span style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: regionStats.totalMassChange >= 0 ? 'var(--danger-color)' : 'var(--success-color)'
                }}>
                  {regionStats.totalMassChange >= 0 ? '+' : ''}{formatNumber(regionStats.totalMassChange)}
                </span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 0',
                borderBottom: '1px solid var(--border-color)'
              }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  平均厚度变化
                </span>
                <span style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: regionStats.avgThicknessChange >= 0 ? 'var(--danger-color)' : 'var(--success-color)'
                }}>
                  {regionStats.avgThicknessChange >= 0 ? '+' : ''}{regionStats.avgThicknessChange.toFixed(2)} m
                </span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 0',
                borderBottom: '1px solid var(--border-color)'
              }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  面积缩减
                </span>
                <span style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--danger-color)'
                }}>
                  {regionStats.areaReductionPercent.toFixed(2)}%
                </span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 0'
              }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  数据采样点
                </span>
                <span style={{ fontSize: '14px', fontWeight: '600' }}>
                  {regionStats.pixelCount}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1, padding: '8px 4px', fontSize: '11px' }}
                onClick={handleExportCSV}
              >
                📥 导出CSV
              </button>
              <button
                className="btn btn-secondary"
                style={{ flex: 1, padding: '8px 4px', fontSize: '11px' }}
                onClick={handleExportGeoTIFF}
              >
                🗺️ 导出GeoTIFF
              </button>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '8px' }}
              onClick={startDrawing}
            >
              🔄 重新选择区域
            </button>
          </>
        )}

        {!isDrawing && !regionStats && (
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '12px', textAlign: 'center' }}>
            点击按钮框选区域，系统将计算该区域的冰川变化统计数据
          </p>
        )}
      </div>
    </div>
  );
}

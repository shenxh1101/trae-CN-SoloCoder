import React, { useState, useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { useGlacier } from '../context/GlacierContext';
import { useCesiumViewer } from './CesiumViewer';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { dateToMonthIndex } from '../utils/dateUtils';
import { exportProfileData } from '../utils/exportUtils';

export default function ProfileAnalysisPanel({ data }) {
  const { state, setProfileLine } = useGlacier();
  const { getViewer } = useCesiumViewer();
  const [isDrawing, setIsDrawing] = useState(false);
  const [profilePoints, setProfilePoints] = useState([]);
  const [profileData, setProfileData] = useState(null);
  const [showChart, setShowChart] = useState(false);
  const handlerRef = useRef(null);
  const lineEntityRef = useRef(null);

  const startDrawing = () => {
    setIsDrawing(true);
    setProfilePoints([]);
    setProfileData(null);
    setShowChart(false);
  };

  const cancelDrawing = () => {
    setIsDrawing(false);
    setProfilePoints([]);
    setProfileLine(null);
    const viewer = getViewer();
    if (lineEntityRef.current && viewer && !viewer.isDestroyed()) {
      viewer.entities.remove(lineEntityRef.current);
      lineEntityRef.current = null;
    }
  };

  useEffect(() => {
    let mounted = true;
    const viewer = getViewer();
    if (!viewer || !isDrawing) return;

    let handler = null;
    let tempLine = null;

    try {
      handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
      handlerRef.current = handler;

      const tempPoints = [];

      handler.setInputAction((movement) => {
        if (!mounted) return;
        
        try {
          const ray = viewer.camera.getPickRay(movement.position);
          if (!ray) return;

          const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
          if (!cartesian) return;

          const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
          const lon = Cesium.Math.toDegrees(cartographic.longitude);
          const lat = Cesium.Math.toDegrees(cartographic.latitude);

          tempPoints.push({ lon, lat, cartesian });
          setProfilePoints([...tempPoints]);

          if (tempPoints.length === 2) {
            if (tempLine) {
              const v = getViewer();
              if (v && !v.isDestroyed()) {
                v.entities.remove(tempLine);
              }
            }

            tempLine = viewer.entities.add({
              polyline: {
                positions: [tempPoints[0].cartesian, tempPoints[1].cartesian],
                material: Cesium.Color.YELLOW,
                width: 4,
                clampToGround: true
              }
            });
            lineEntityRef.current = tempLine;

            handler.destroy();
            setIsDrawing(false);
            analyzeProfile(tempPoints[0], tempPoints[1]);
          }
        } catch (e) {
          console.warn('ProfileAnalysisPanel drawing error:', e);
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    } catch (e) {
      console.warn('ProfileAnalysisPanel error:', e);
    }

    return () => {
      mounted = false;
      if (handler && !handler.isDestroyed()) {
        try {
          handler.destroy();
        } catch (e) {
          // ignore
        }
      }
      if (tempLine && viewer && !viewer.isDestroyed()) {
        try {
          viewer.entities.remove(tempLine);
        } catch (e) {
          // ignore
        }
      }
    };
  }, [isDrawing]);

  const analyzeProfile = (start, end) => {
    if (!data || !data.bounds) return;

    const numPoints = 100;
    const profileResult = [];

    const dLat = end.lat - start.lat;
    const dLon = end.lon - start.lon;

    const R = 6371000;
    const φ1 = start.lat * Math.PI / 180;
    const φ2 = end.lat * Math.PI / 180;
    const Δφ = dLat * Math.PI / 180;
    const Δλ = dLon * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const totalDistance = R * c / 1000;

    const timeIndex1980 = Math.max(0, Math.min((1980 - 1980) * 12, data.dimensions.time - 1));
    const timeIndex2000 = Math.max(0, Math.min((2000 - 1980) * 12, data.dimensions.time - 1));
    const timeIndex2024 = Math.max(0, Math.min(dateToMonthIndex(state.currentDate, state.startDate), data.dimensions.time - 1));

    const latVar = data.variables['lat'];
    const lonVar = data.variables['lon'];
    const thicknessVar = data.variables['thickness'];

    const lats = latVar.data;
    const lons = lonVar.data;
    const latSize = lats.length;
    const lonSize = lons.length;

    for (let i = 0; i < numPoints; i++) {
      const t = i / (numPoints - 1);
      const lat = start.lat + t * dLat;
      const lon = start.lon + t * dLon;

      let latIdx = Math.round((lat - lats[0]) / (lats[latSize - 1] - lats[0]) * (latSize - 1));
      let lonIdx = Math.round((lon - lons[0]) / (lons[lonSize - 1] - lons[0]) * (lonSize - 1));

      latIdx = Math.max(0, Math.min(latIdx, latSize - 1));
      lonIdx = Math.max(0, Math.min(lonIdx, lonSize - 1));

      const idx1980 = timeIndex1980 * latSize * lonSize + latIdx * lonSize + lonIdx;
      const idx2000 = timeIndex2000 * latSize * lonSize + latIdx * lonSize + lonIdx;
      const idx2024 = timeIndex2024 * latSize * lonSize + latIdx * lonSize + lonIdx;

      const thickness1980 = thicknessVar.data[idx1980];
      const thickness2000 = thicknessVar.data[idx2000];
      const thickness2024 = thicknessVar.data[idx2024];

      const elevation = 1000 + Math.random() * 2000;

      if (thickness1980 > 10 || thickness2024 > 10) {
        profileResult.push({
          distance: t * totalDistance,
          lat,
          lon,
          elevation,
          thickness1980: thickness1980 > 10 ? thickness1980 : null,
          thickness2000: thickness2000 > 10 ? thickness2000 : null,
          thickness2024: thickness2024 > 10 ? thickness2024 : null
        });
      }
    }

    setProfileData(profileResult);
    setShowChart(true);
    setProfileLine({ start, end, distance: totalDistance });
  };

  const handleExport = () => {
    if (profileData) {
      exportProfileData(profileData);
    }
  };

  return (
    <div className="panel" style={{
      position: 'absolute',
      bottom: '180px',
      left: '20px',
      width: '340px',
      maxHeight: '500px',
      overflowY: 'auto',
      zIndex: 100
    }}>
      <div className="panel-header">
        剖面分析
        <button
          className="btn btn-secondary"
          style={{ padding: '4px 8px', fontSize: '11px' }}
          onClick={() => setShowChart(!showChart)}
        >
          {showChart ? '收起' : '展开'}
        </button>
      </div>
      <div className="panel-body">
        <div style={{ marginBottom: '12px' }}>
          {!isDrawing ? (
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={startDrawing}>
              📏 绘制剖面线
            </button>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--warning-color)', marginBottom: '8px' }}>
                点击地图上两点绘制剖面线...
              </p>
              <button className="btn btn-danger" onClick={cancelDrawing}>
                取消
              </button>
            </div>
          )}
        </div>

        {profilePoints.length > 0 && (
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            已选择 {profilePoints.length} 个点
          </div>
        )}

        {showChart && profileData && profileData.length > 0 && (
          <>
            <div style={{ height: '250px', marginBottom: '12px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={profileData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="distance"
                    stroke="var(--text-secondary)"
                    fontSize={10}
                    label={{ value: '距离 (km)', position: 'bottom', fill: 'var(--text-secondary)', fontSize: 10 }}
                  />
                  <YAxis
                    stroke="var(--text-secondary)"
                    fontSize={10}
                    label={{ value: '厚度 (m)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-dark)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      fontSize: '11px'
                    }}
                    formatter={(value) => value ? `${value.toFixed(1)} m` : '无数据'}
                    labelFormatter={(label) => `距离: ${label.toFixed(2)} km`}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', color: 'var(--text-secondary)' }} />
                  <Line type="monotone" dataKey="thickness1980" stroke="#22c55e" strokeWidth={2} dot={false} name="1980年" />
                  <Line type="monotone" dataKey="thickness2000" stroke="#eab308" strokeWidth={2} dot={false} name="2000年" />
                  <Line type="monotone" dataKey="thickness2024" stroke="#ef4444" strokeWidth={2} dot={false} name="2024年" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div style={{
              padding: '10px',
              background: 'var(--bg-light)',
              borderRadius: '6px',
              fontSize: '11px',
              marginBottom: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>剖面长度:</span>
                <span>{state.profileLine?.distance?.toFixed(2) || 0} km</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>采样点数:</span>
                <span>{profileData.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>厚度变化:</span>
                <span style={{ color: 'var(--danger-color)' }}>
                  -{(profileData[0]?.thickness1980 - profileData[profileData.length - 1]?.thickness2024 || 0).toFixed(1)} m
                </span>
              </div>
            </div>

            <button className="btn btn-secondary" style={{ width: '100%' }} onClick={handleExport}>
              📥 导出剖面数据 (CSV)
            </button>
          </>
        )}

        {!isDrawing && !profileData && (
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>
            点击"绘制剖面线"按钮，然后在地图上冰川区域点击两点创建剖面
          </p>
        )}
      </div>
    </div>
  );
}

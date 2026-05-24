import React, { useState, useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { useCesiumViewer } from './CesiumViewer';
import { useGlacier } from '../context/GlacierContext';

const WAYPOINTS = [
  {
    name: '全球视角',
    position: Cesium.Cartesian3.fromDegrees(0, 20, 20000000),
    orientation: { heading: 0, pitch: -60 },
    duration: 3
  },
  {
    name: '北大西洋',
    position: Cesium.Cartesian3.fromDegrees(-40, 45, 5000000),
    orientation: { heading: 0, pitch: -45 },
    duration: 4
  },
  {
    name: '格陵兰岛全景',
    position: Cesium.Cartesian3.fromDegrees(-42.5, 72, 1500000),
    orientation: { heading: 0, pitch: -35 },
    duration: 5
  },
  {
    name: '格陵兰岛西海岸',
    position: Cesium.Cartesian3.fromDegrees(-52, 69, 500000),
    orientation: { heading: Cesium.Math.toRadians(90), pitch: -25 },
    duration: 4
  },
  {
    name: '雅各布港冰川',
    position: Cesium.Cartesian3.fromDegrees(-49.5, 69.2, 200000),
    orientation: { heading: Cesium.Math.toRadians(45), pitch: -15 },
    duration: 5
  },
  {
    name: '格陵兰岛冰盖中心',
    position: Cesium.Cartesian3.fromDegrees(-40, 73, 800000),
    orientation: { heading: 0, pitch: -30 },
    duration: 4
  },
  {
    name: '格陵兰岛东海岸',
    position: Cesium.Cartesian3.fromDegrees(-25, 70, 500000),
    orientation: { heading: Cesium.Math.toRadians(-90), pitch: -25 },
    duration: 4
  },
  {
    name: '赫尔海姆冰川',
    position: Cesium.Cartesian3.fromDegrees(-38.2, 66.4, 150000),
    orientation: { heading: Cesium.Math.toRadians(-45), pitch: -15 },
    duration: 5
  },
  {
    name: '格陵兰岛全景 (旋转)',
    position: Cesium.Cartesian3.fromDegrees(-42.5, 72, 1500000),
    orientation: { heading: Cesium.Math.toRadians(180), pitch: -35 },
    duration: 6,
    rotate: true
  }
];

export default function FlightTour() {
  const { getViewer } = useCesiumViewer();
  const { setPlaying } = useGlacier();
  const [isFlying, setIsFlying] = useState(false);
  const [currentWaypoint, setCurrentWaypoint] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const rotationRef = useRef(null);
  const rotationStartTimeRef = useRef(null);

  const startTour = () => {
    const viewer = getViewer();
    if (!viewer) return;
    setIsFlying(true);
    setCurrentWaypoint(0);
    setPlaying(false);
    flyToWaypoint(0);
  };

  const stopTour = () => {
    setIsFlying(false);
    if (rotationRef.current) {
      cancelAnimationFrame(rotationRef.current);
      rotationRef.current = null;
    }
    const viewer = getViewer();
    if (viewer && !viewer.isDestroyed()) {
      viewer.camera.cancelFlight();
    }
  };

  const flyToWaypoint = (index) => {
    const viewer = getViewer();
    if (!viewer || index >= WAYPOINTS.length) {
      if (autoPlay) {
        startTour();
      } else {
        setIsFlying(false);
      }
      return;
    }

    setCurrentWaypoint(index);
    const waypoint = WAYPOINTS[index];

    const flightComplete = () => {
      if (waypoint.rotate) {
        startRotation(waypoint);
      } else {
        const delay = waypoint.duration * 1000;
        setTimeout(() => {
          if (isFlying || autoPlay) {
            flyToWaypoint(index + 1);
          }
        }, delay);
      }
    };

    if (index === 0) {
      viewer.camera.flyTo({
        destination: waypoint.position,
        orientation: {
          heading: waypoint.orientation.heading,
          pitch: Cesium.Math.toRadians(waypoint.orientation.pitch),
          roll: 0
        },
        duration: waypoint.duration,
        complete: flightComplete
      });
    } else {
      viewer.camera.flyTo({
        destination: waypoint.position,
        orientation: {
          heading: waypoint.orientation.heading,
          pitch: Cesium.Math.toRadians(waypoint.orientation.pitch),
          roll: 0
        },
        duration: waypoint.duration,
        complete: flightComplete,
        easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT
      });
    }
  };

  const startRotation = (waypoint) => {
    rotationStartTimeRef.current = Date.now();
    const rotationDuration = waypoint.duration * 1000;
    const center = waypoint.position;

    const rotate = () => {
      if (!isFlying) return;

      const elapsed = Date.now() - rotationStartTimeRef.current;
      const progress = Math.min(elapsed / rotationDuration, 1);
      const angle = progress * Math.PI * 2;

      const radius = 1500000;
      const height = 1500000;

      const offset = new Cesium.Cartesian3(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        height
      );

      const position = Cesium.Cartesian3.add(
        new Cesium.Cartesian3(
          Cesium.Cartesian3.fromDegrees(-42.5, 72, 0).x,
          Cesium.Cartesian3.fromDegrees(-42.5, 72, 0).y,
          0
        ),
        offset,
        new Cesium.Cartesian3()
      );

      const centerPosition = Cesium.Cartesian3.fromDegrees(-42.5, 72, 1000);
      const direction = Cesium.Cartesian3.subtract(centerPosition, position, new Cesium.Cartesian3());
      Cesium.Cartesian3.normalize(direction, direction);

      const right = Cesium.Cartesian3.cross(direction, Cesium.Cartesian3.UNIT_Z, new Cesium.Cartesian3());
      Cesium.Cartesian3.normalize(right, right);

      const up = Cesium.Cartesian3.cross(right, direction, new Cesium.Cartesian3());
      Cesium.Cartesian3.normalize(up, up);

      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(-42.5 + Math.cos(angle) * 8, 72, 1500000),
        orientation: {
          heading: angle,
          pitch: Cesium.Math.toRadians(-35),
          roll: 0
        }
      });

      if (progress < 1) {
        rotationRef.current = requestAnimationFrame(rotate);
      } else {
        setTimeout(() => {
          if (isFlying && autoPlay) {
            flyToWaypoint(currentWaypoint + 1);
          }
        }, 1000);
      }
    };

    rotationRef.current = requestAnimationFrame(rotate);
  };

  const skipToWaypoint = (index) => {
    const viewer = getViewer();
    if (!viewer) return;
    viewer.camera.cancelFlight();
    if (rotationRef.current) {
      cancelAnimationFrame(rotationRef.current);
      rotationRef.current = null;
    }
    flyToWaypoint(index);
  };

  useEffect(() => {
    return () => {
      if (rotationRef.current) {
        cancelAnimationFrame(rotationRef.current);
      }
    };
  }, []);

  return (
    <div className="panel" style={{
      position: 'absolute',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '400px',
      zIndex: 100
    }}>
      <div className="panel-header">
        ✈️ 3D 飞行漫游
        {isFlying && (
          <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={stopTour}>
            停止
          </button>
        )}
      </div>
      <div className="panel-body">
        {!isFlying ? (
          <>
            <div style={{ marginBottom: '12px' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                自动飞行展示格陵兰岛主要冰川区域
              </p>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={autoPlay}
                  onChange={(e) => setAutoPlay(e.target.checked)}
                  style={{ accentColor: 'var(--primary-color)' }}
                />
                循环播放
              </label>
            </div>

            <button className="btn btn-primary" style={{ width: '100%' }} onClick={startTour}>
              ▶ 开始飞行漫游
            </button>

            <div style={{ marginTop: '12px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                航点列表 (点击跳转):
              </div>
              <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                {WAYPOINTS.map((wp, index) => (
                  <button
                    key={index}
                    onClick={() => skipToWaypoint(index)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 10px',
                      marginBottom: '4px',
                      background: currentWaypoint === index && isFlying ? 'var(--primary-color)' : 'var(--bg-light)',
                      border: 'none',
                      borderRadius: '4px',
                      color: currentWaypoint === index && isFlying ? 'white' : 'var(--text-primary)',
                      cursor: 'pointer',
                      fontSize: '11px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span>{index + 1}. {wp.name}</span>
                    <span style={{ fontSize: '10px', opacity: 0.7 }}>{wp.duration}s</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={{
              padding: '12px',
              background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
              borderRadius: '8px',
              marginBottom: '12px',
              color: 'white',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                当前航点: {currentWaypoint + 1}/{WAYPOINTS.length}
              </div>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                {WAYPOINTS[currentWaypoint]?.name}
              </div>
            </div>

            <div style={{
              width: '100%',
              height: '6px',
              background: 'var(--bg-light)',
              borderRadius: '3px',
              marginBottom: '12px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${((currentWaypoint + 1) / WAYPOINTS.length) * 100}%`,
                height: '100%',
                background: 'var(--primary-color)',
                transition: 'width 0.3s ease'
              }} />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => skipToWaypoint(Math.max(0, currentWaypoint - 1))}
              >
                ◀ 上一个
              </button>
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => skipToWaypoint(Math.min(WAYPOINTS.length - 1, currentWaypoint + 1))}
              >
                下一个 ▶
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

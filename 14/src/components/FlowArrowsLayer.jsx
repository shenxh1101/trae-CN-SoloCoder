import { useEffect, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';
import { useCesiumViewer } from './CesiumViewer';
import { useGlacier } from '../context/GlacierContext';
import { interpolateColor, velocityColorMap } from '../utils/colorMaps';
import { dateToMonthIndex } from '../utils/dateUtils';

export default function FlowArrowsLayer({ data }) {
  const { getViewer, viewerReady } = useCesiumViewer();
  const { state } = useGlacier();
  const dataSourceRef = useRef(null);
  const animationFrameRef = useRef(null);
  const particlesRef = useRef([]);

  const updateFlowArrows = useCallback((timeIndex) => {
    const viewer = getViewer();
    if (!viewer || !data || !data.bounds) return;

    if (dataSourceRef.current) {
      viewer.dataSources.remove(dataSourceRef.current);
    }

    const dataSource = new Cesium.CustomDataSource('flowArrows');
    dataSourceRef.current = dataSource;

    const { west, east, south, north } = data.bounds;
    const latVar = data.variables['lat'];
    const lonVar = data.variables['lon'];
    const uVar = data.variables['velocity_u'];
    const vVar = data.variables['velocity_v'];
    const speedVar = data.variables['velocity'];

    if (!latVar || !lonVar || !uVar || !vVar || !speedVar) return;

    const lats = latVar.data;
    const lons = lonVar.data;
    const latSize = lats.length;
    const lonSize = lons.length;

    const step = 5;
    const particles = [];

    for (let i = step; i < latSize - step; i += step) {
      for (let j = step; j < lonSize - step; j += step) {
        const idx = timeIndex * latSize * lonSize + i * lonSize + j;
        const speed = speedVar.data[idx];
        const u = uVar.data[idx];
        const v = vVar.data[idx];

        if (speed > 10 && u !== null && v !== null) {
          const lat = lats[i];
          const lon = lons[j];

          const position = Cesium.Cartesian3.fromDegrees(lon, lat, 100);

          const angle = Math.atan2(v, u);
          const magnitude = Math.min(speed * 100, 50000);

          const endLon = lon + (magnitude * Math.cos(angle)) / 111000 / Math.cos(lat * Math.PI / 180);
          const endLat = lat + (magnitude * Math.sin(angle)) / 111000;

          const endPosition = Cesium.Cartesian3.fromDegrees(endLon, endLat, 100);

          const color = interpolateColor(velocityColorMap, speed);

          dataSource.entities.add({
            polyline: {
              positions: [position, endPosition],
              material: Cesium.Color.fromBytes(color[0], color[1], color[2], 180),
              width: 2,
              clampToGround: false
            },
            position: endPosition,
            ellipsoid: {
              radii: new Cesium.Cartesian3(3000, 3000, 3000),
              material: Cesium.Color.fromBytes(color[0], color[1], color[2], 200)
            }
          });

          particles.push({
            position: Cesium.Cartographic.fromDegrees(lon, lat, 50),
            u,
            v,
            speed,
            color
          });
        }
      }
    }

    particlesRef.current = particles;
    viewer.dataSources.add(dataSource);
  }, [data]);

  const animateParticles = useCallback(() => {
    const viewer = getViewer();
    if (!viewer || !dataSourceRef.current || !particlesRef.current || particlesRef.current.length === 0) {
      return;
    }

    const dataSource = dataSourceRef.current;
    const time = Date.now() * 0.0001;

    try {
      particlesRef.current.forEach((particle, index) => {
        const progress = (time * particle.speed * 0.01 + index * 0.1) % 1;
        const lon = Cesium.Math.toDegrees(particle.position.longitude) +
          (particle.u * progress * 0.0001);
        const lat = Cesium.Math.toDegrees(particle.position.latitude) +
          (particle.v * progress * 0.0001);

        const entityIndex = index * 2 + 1;
        if (dataSource.entities && dataSource.entities.values && entityIndex < dataSource.entities.values.length) {
          const entity = dataSource.entities.values[entityIndex];
          if (entity) {
            entity.position = Cesium.Cartesian3.fromDegrees(lon, lat, 100);
          }
        }
      });

      animationFrameRef.current = requestAnimationFrame(animateParticles);
    } catch (e) {
      console.warn('Animation error:', e);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    
    const init = async () => {
      const viewer = getViewer();
      if (!viewerReady || !viewer || !mounted) return;

      try {
        if (state.layers.flowArrows && data) {
          const timeIndex = dateToMonthIndex(state.currentDate, state.startDate);
          const clampedIndex = Math.max(0, Math.min(timeIndex, (data.dimensions.time || 1) - 1));
          updateFlowArrows(clampedIndex);
          if (mounted) {
            animateParticles();
          }
        } else if (dataSourceRef.current) {
          viewer.dataSources.remove(dataSourceRef.current);
          dataSourceRef.current = null;
        }
      } catch (e) {
        console.warn('FlowArrowsLayer error:', e);
      }
    };

    init();

    return () => {
      mounted = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      const v = getViewer();
      if (dataSourceRef.current && v && !v.isDestroyed()) {
        try {
          v.dataSources.remove(dataSourceRef.current);
        } catch (e) {
          // ignore
        }
        dataSourceRef.current = null;
      }
    };
  }, [viewerReady, data, state.currentDate, state.layers.flowArrows, updateFlowArrows, animateParticles]);

  return null;
}

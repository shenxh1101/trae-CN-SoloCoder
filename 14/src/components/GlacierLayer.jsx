import { useEffect, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';
import { useCesiumViewer } from './CesiumViewer';
import { useGlacier } from '../context/GlacierContext';
import { interpolateColor, massLossColorMap, stabilityColorMap } from '../utils/colorMaps';
import { dateToMonthIndex } from '../utils/dateUtils';

export default function GlacierLayer({ data, region }) {
  const { getViewer, viewerReady } = useCesiumViewer();
  const { state } = useGlacier();
  const imageryLayerRef = useRef(null);
  const canvasRef = useRef(null);

  const renderGlacierData = useCallback((timeIndex, variableName, colorMap) => {
    const viewer = getViewer();
    if (!viewer || !data || !data.bounds || viewer.isDestroyed()) return;

    try {
      const { west, east, south, north } = data.bounds;
      const latVar = data.variables['lat'];
      const lonVar = data.variables['lon'];
      const variable = data.variables[variableName];

      if (!latVar || !lonVar || !variable) return;

      const lats = latVar.data;
      const lons = lonVar.data;
      const latSize = lats.length;
      const lonSize = lons.length;

      if (latSize === 0 || lonSize === 0) return;

      const canvas = canvasRef.current || document.createElement('canvas');
      canvasRef.current = canvas;
      canvas.width = Math.max(1, lonSize);
      canvas.height = Math.max(1, latSize);

      const ctx = canvas.getContext('2d');
      const imageData = ctx.createImageData(lonSize, latSize);

      const maxTimeIndex = data.dimensions.time || 1;
      const safeTimeIndex = Math.max(0, Math.min(timeIndex, maxTimeIndex - 1));

      for (let i = 0; i < latSize; i++) {
        for (let j = 0; j < lonSize; j++) {
          const idx = safeTimeIndex * latSize * lonSize + i * lonSize + j;
          const value = variable.data[idx];
          const pixelIdx = (i * lonSize + j) * 4;

          const threshold = variableName === 'stability' ? 0 : 10;
          if (value !== null && value !== undefined && !isNaN(value) && value > threshold) {
            const color = interpolateColor(colorMap, value);
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

      if (imageryLayerRef.current) {
        try {
          viewer.imageryLayers.remove(imageryLayerRef.current);
        } catch (e) {
          console.warn('Error removing imagery layer:', e);
        }
        imageryLayerRef.current = null;
      }

      const rectangle = Cesium.Rectangle.fromDegrees(west, south, east, north);
      const imageryProvider = new Cesium.SingleTileImageryProvider({
        url: canvas.toDataURL(),
        rectangle: rectangle,
        tileWidth: canvas.width,
        tileHeight: canvas.height,
        tilingScheme: new Cesium.GeographicTilingScheme()
      });

      imageryLayerRef.current = viewer.imageryLayers.addImageryProvider(
        imageryProvider,
        viewer.imageryLayers.length
      );
      imageryLayerRef.current.alpha = 0.75;
    } catch (error) {
      console.error('Error rendering glacier data:', error);
      console.error('Error details:', error.message, error.stack);
    }
  }, [data]);

  useEffect(() => {
    const viewer = getViewer();
    if (!viewerReady || !viewer || !data || viewer.isDestroyed()) return;

    const timeIndex = dateToMonthIndex(state.currentDate, state.startDate);
    const clampedIndex = Math.max(0, Math.min(timeIndex, (data.dimensions.time || 1) - 1));

    let variableName = 'mass_loss';
    let colorMap = massLossColorMap;

    if (state.visualizationMode === 'stability') {
      variableName = 'stability';
      colorMap = stabilityColorMap;
    } else if (state.visualizationMode === 'thickness') {
      variableName = 'thickness';
      colorMap = massLossColorMap;
    }

    if (state.layers.massLoss || state.layers.stability) {
      renderGlacierData(clampedIndex, variableName, colorMap);
    } else if (imageryLayerRef.current) {
      try {
        viewer.imageryLayers.remove(imageryLayerRef.current);
      } catch (e) {
        console.warn('Error removing imagery layer:', e);
      }
      imageryLayerRef.current = null;
    }

    return () => {
      const v = getViewer();
      if (imageryLayerRef.current && v && !v.isDestroyed()) {
        try {
          v.imageryLayers.remove(imageryLayerRef.current);
        } catch (e) {
          console.warn('Error cleaning up imagery layer:', e);
        }
        imageryLayerRef.current = null;
      }
    };
  }, [viewerReady, data, state.currentDate, state.visualizationMode, state.layers, renderGlacierData]);

  return null;
}

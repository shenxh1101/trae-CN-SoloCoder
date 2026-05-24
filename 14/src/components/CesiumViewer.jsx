import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as Cesium from 'cesium';
import { useGlacier } from '../context/GlacierContext';
import { createTerrainProvider, createImageryProvider } from '../utils/cesiumUtils';

const CesiumViewerContext = React.createContext(null);

export function useCesiumViewer() {
  const context = React.useContext(CesiumViewerContext);
  if (!context) {
    throw new Error('useCesiumViewer must be used within CesiumViewer');
  }
  return context;
}

export default function CesiumViewer({ children }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const [viewerReady, setViewerReady] = useState(false);
  const { state } = useGlacier();

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    const viewer = new Cesium.Viewer(containerRef.current, {
      animation: false,
      timeline: false,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      fullscreenButton: false,
      infoBox: false,
      selectionIndicator: false,
      shouldAnimate: true,
      terrainShadows: Cesium.ShadowMode.ENABLED,
      maximumScreenSpaceError: 2,
      maximumNumberOfLoadedTiles: 100
    });

    viewer.scene.globe.enableLighting = true;
    viewer.scene.globe.showGroundAtmosphere = true;
    viewer.scene.skyAtmosphere.show = true;
    viewer.scene.fog.enabled = true;
    viewer.scene.fog.density = 0.0002;

    viewer.scene.globe.tileCacheSize = 100;
    viewer.scene.globe.preloadSiblings = true;
    viewer.resolutionScale = window.devicePixelRatio > 1 ? 1.0 : 1.2;

    viewerRef.current = viewer;

    const initTerrainAndImagery = async () => {
      try {
        const terrainProvider = await createTerrainProvider();
        if (viewerRef.current === viewer && !viewer.isDestroyed()) {
          viewer.terrainProvider = terrainProvider;
        }

        const imageryProvider = createImageryProvider();
        if (viewerRef.current === viewer && !viewer.isDestroyed()) {
          viewer.imageryLayers.removeAll();
          viewer.imageryLayers.addImageryProvider(imageryProvider);
          setViewerReady(true);
        }
      } catch (error) {
        console.error('Failed to initialize terrain or imagery:', error);
        if (viewerRef.current === viewer && !viewer.isDestroyed()) {
          viewer.imageryLayers.addImageryProvider(
            new Cesium.OpenStreetMapImageryProvider()
          );
          setViewerReady(true);
        }
      }
    };

    initTerrainAndImagery();

    return () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        try {
          viewerRef.current.destroy();
        } catch (e) {
          console.warn('Error destroying viewer:', e);
        }
        viewerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!viewerRef.current) return;

    const viewer = viewerRef.current;
    const originalRender = viewer.scene.render;

    let frameCount = 0;
    let lastFpsUpdate = performance.now();
    let fps = 0;

    viewer.scene.render = function (time, useDefaultRenderTargets) {
      const result = originalRender.call(this, time, useDefaultRenderTargets);

      frameCount++;
      const now = performance.now();
      if (now - lastFpsUpdate >= 1000) {
        fps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
        frameCount = 0;
        lastFpsUpdate = now;

        if (state.showDebugPanel) {
          console.log(`FPS: ${fps}, Tiles: ${viewer.scene.globe._surface._tileProvider._tiles.size}`);
        }
      }

      return result;
    };

    return () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed() && viewerRef.current.scene) {
        try {
          viewerRef.current.scene.render = originalRender;
        } catch (e) {
          console.warn('Error restoring render function:', e);
        }
      }
    };
  }, [state.showDebugPanel]);

  const getViewer = useCallback(() => viewerRef.current, []);
  const getContainer = useCallback(() => containerRef.current, []);

  const value = {
    getViewer,
    viewerReady,
    getContainer
  };

  return (
    <CesiumViewerContext.Provider value={value}>
      <div ref={containerRef} className="cesium-container" />
      {viewerReady && children}
    </CesiumViewerContext.Provider>
  );
}

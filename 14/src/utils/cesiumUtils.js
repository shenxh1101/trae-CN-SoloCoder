import * as Cesium from 'cesium';

export async function createTerrainProvider() {
  try {
    if (typeof Cesium.createWorldTerrainAsync === 'function') {
      return await Cesium.createWorldTerrainAsync({
        requestWaterMask: true,
        requestVertexNormals: true
      });
    }
    if (typeof Cesium.Terrain === 'object' && typeof Cesium.Terrain.fromWorldTerrain === 'function') {
      return await Cesium.Terrain.fromWorldTerrain({
        requestWaterMask: true,
        requestVertexNormals: true
      });
    }
  } catch (e) {
    console.warn('Failed to create world terrain, using ellipsoid terrain:', e);
  }
  return new Cesium.EllipsoidTerrainProvider();
}

export function createImageryProvider() {
  return new Cesium.UrlTemplateImageryProvider({
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    credit: new Cesium.Credit('Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'),
    maximumLevel: 19
  });
}

export function createStreetMapImageryProvider() {
  return new Cesium.UrlTemplateImageryProvider({
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    credit: '© OpenStreetMap contributors',
    subdomains: ['a', 'b', 'c'],
    maximumLevel: 19
  });
}

export function flyToLocation(viewer, destination, orientation = {}, duration = 3) {
  return viewer.camera.flyTo({
    destination,
    orientation: {
      heading: orientation.heading || Cesium.Math.toRadians(0),
      pitch: orientation.pitch || Cesium.Math.toRadians(-45),
      roll: orientation.roll || 0
    },
    duration,
    maximumHeight: 5000000
  });
}

export function flyToGreenland(viewer, duration = 5) {
  return flyToLocation(
    viewer,
    Cesium.Cartesian3.fromDegrees(-42.5, 72, 1500000),
    {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-35)
    },
    duration
  );
}

export function flyToAntarctica(viewer, duration = 5) {
  return flyToLocation(
    viewer,
    Cesium.Cartesian3.fromDegrees(0, -75, 3000000),
    {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-45)
    },
    duration
  );
}

export function flyToGlobal(viewer, duration = 3) {
  return flyToLocation(
    viewer,
    Cesium.Cartesian3.fromDegrees(0, 20, 20000000),
    {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-60)
    },
    duration
  );
}

export function createGlacierPolygon(positions, color) {
  return {
    polygon: {
      hierarchy: new Cesium.PolygonHierarchy(positions),
      material: Cesium.Color.fromBytes(color[0], color[1], color[2], color[3]),
      outline: true,
      outlineColor: Cesium.Color.WHITE.withAlpha(0.5),
      outlineWidth: 1.0
    }
  };
}

export function createArrowEntity(position, direction, speed, color) {
  const velocityVector = new Cesium.Cartesian3(
    direction.x * speed * 100,
    direction.y * speed * 100,
    direction.z * speed * 100
  );

  const endPosition = Cesium.Cartesian3.add(position, velocityVector, new Cesium.Cartesian3());

  return {
    polyline: {
      positions: [position, endPosition],
      material: Cesium.Color.fromBytes(color[0], color[1], color[2], color[3]),
      width: 2,
      clampToGround: false
    },
    position: endPosition,
    ellipsoid: {
      radii: new Cesium.Cartesian3(1000, 1000, 1000),
      material: Cesium.Color.fromBytes(color[0], color[1], color[2], color[3])
    }
  };
}

export function getScreenSpaceCoordinates(scene, cartesian) {
  return Cesium.SceneTransforms.wgs84ToWindowCoordinates(scene, cartesian);
}

export function sampleTerrainHeight(terrainProvider, level, positions) {
  return Cesium.sampleTerrainMostDetailed(terrainProvider, positions);
}

export function createSplitScreenImageryLayer(viewer, imageryProvider, splitDirection) {
  const layer = viewer.imageryLayers.addImageryProvider(imageryProvider);
  layer.splitDirection = splitDirection;
  return layer;
}

export function enableSplitScreen(viewer, enabled) {
  viewer.scene.splitPosition = enabled ? 0.5 : undefined;
}

export function createHeatmapImageryProvider(gridData, bounds) {
  const { positions, colors, width, height } = gridData;
  const { west, east, south, north } = bounds;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const imageData = ctx.createImageData(width, height);

  for (let i = 0; i < colors.length / 4; i++) {
    const pixelIndex = i * 4;
    imageData.data[pixelIndex] = colors[pixelIndex];
    imageData.data[pixelIndex + 1] = colors[pixelIndex + 1];
    imageData.data[pixelIndex + 2] = colors[pixelIndex + 2];
    imageData.data[pixelIndex + 3] = colors[pixelIndex + 3];
  }

  ctx.putImageData(imageData, 0, 0);

  return new Cesium.SingleTileImageryProvider({
    url: canvas.toDataURL(),
    rectangle: Cesium.Rectangle.fromDegrees(west, south, east, north),
    tileWidth: canvas.width,
    tileHeight: canvas.height,
    tilingScheme: new Cesium.GeographicTilingScheme()
  });
}

export function formatCartographic(cartographic) {
  return {
    longitude: Cesium.Math.toDegrees(cartographic.longitude),
    latitude: Cesium.Math.toDegrees(cartographic.latitude),
    height: cartographic.height
  };
}

export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const φ1 = Cesium.Math.toRadians(lat1);
  const φ2 = Cesium.Math.toRadians(lat2);
  const Δφ = Cesium.Math.toRadians(lat2 - lat1);
  const Δλ = Cesium.Math.toRadians(lon2 - lon1);

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function interpolateAlongLine(start, end, numPoints) {
  const points = [];
  for (let i = 0; i < numPoints; i++) {
    const t = i / (numPoints - 1);
    points.push(new Cesium.Cartographic(
      start.longitude + (end.longitude - start.longitude) * t,
      start.latitude + (end.latitude - start.latitude) * t,
      start.height + (end.height - start.height) * t
    ));
  }
  return points;
}

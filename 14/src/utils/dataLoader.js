import { NetCDFReader } from 'netcdfjs';
import { interpolateColor, massLossColorMap } from './colorMaps';

export class GlacierDataLoader {
  constructor() {
    this.cache = new Map();
    this.loadingPromises = new Map();
  }

  async loadNetCDF(url) {
    if (this.cache.has(url)) {
      return this.cache.get(url);
    }

    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url);
    }

    const promise = this._loadNetCDFInternal(url);
    this.loadingPromises.set(url, promise);

    try {
      const data = await promise;
      this.cache.set(url, data);
      return data;
    } finally {
      this.loadingPromises.delete(url);
    }
  }

  async _loadNetCDFInternal(url) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const reader = new NetCDFReader(arrayBuffer);

    const variables = {};
    reader.variables.forEach(variable => {
      variables[variable.name] = {
        name: variable.name,
        dimensions: variable.dimensions,
        attributes: variable.attributes,
        data: reader.getDataVariable(variable.name)
      };
    });

    const dimensions = {};
    reader.dimensions.forEach(dim => {
      dimensions[dim.name] = dim.size;
    });

    return {
      variables,
      dimensions,
      globalAttributes: reader.globalAttributes
    };
  }

  getValueAtPoint(data, lat, lon, timeIndex = 0) {
    const latVar = data.variables['lat'] || data.variables['latitude'];
    const lonVar = data.variables['lon'] || data.variables['longitude'];
    const massVar = data.variables['mass_loss'] || data.variables['thickness'] || data.variables['glacier_mass'];

    if (!latVar || !lonVar || !massVar) {
      return null;
    }

    const lats = latVar.data;
    const lons = lonVar.data;

    let latIndex = this._findNearestIndex(lats, lat);
    let lonIndex = this._findNearestIndex(lons, lon);

    if (latIndex < 0 || latIndex >= lats.length || lonIndex < 0 || lonIndex >= lons.length) {
      return null;
    }

    const latSize = lats.length;
    const lonSize = lons.length;
    const timeSize = data.dimensions['time'] || 1;

    let flatIndex;
    if (timeSize > 1) {
      flatIndex = timeIndex * latSize * lonSize + latIndex * lonSize + lonIndex;
    } else {
      flatIndex = latIndex * lonSize + lonIndex;
    }

    return massVar.data[flatIndex];
  }

  getTimeSeriesAtPoint(data, lat, lon) {
    const latVar = data.variables['lat'] || data.variables['latitude'];
    const lonVar = data.variables['lon'] || data.variables['longitude'];
    const massVar = data.variables['mass_loss'] || data.variables['thickness'];
    const timeVar = data.variables['time'];

    if (!latVar || !lonVar || !massVar || !timeVar) {
      return null;
    }

    const lats = latVar.data;
    const lons = lonVar.data;

    let latIndex = this._findNearestIndex(lats, lat);
    let lonIndex = this._findNearestIndex(lons, lon);

    if (latIndex < 0 || latIndex >= lats.length || lonIndex < 0 || lonIndex >= lons.length) {
      return null;
    }

    const latSize = lats.length;
    const lonSize = lons.length;
    const timeSize = timeVar.data.length;

    const series = [];
    for (let t = 0; t < timeSize; t++) {
      const flatIndex = t * latSize * lonSize + latIndex * lonSize + lonIndex;
      series.push({
        time: timeVar.data[t],
        value: massVar.data[flatIndex]
      });
    }

    return series;
  }

  generateGridForRegion(bounds, resolution, data, timeIndex = 0) {
    const { west, east, south, north } = bounds;
    const latStep = (north - south) / resolution;
    const lonStep = (east - west) / resolution;

    const positions = [];
    const colors = [];
    const values = [];

    for (let i = 0; i <= resolution; i++) {
      for (let j = 0; j <= resolution; j++) {
        const lat = south + i * latStep;
        const lon = west + j * lonStep;
        const value = this.getValueAtPoint(data, lat, lon, timeIndex);

        if (value !== null && value !== undefined) {
          positions.push(lon, lat);
          values.push(value);

          const color = interpolateColor(massLossColorMap, value);
          colors.push(...color);
        }
      }
    }

    return { positions, colors, values };
  }

  getRegionStats(data, bounds, timeIndex1, timeIndex2) {
    const { west, east, south, north } = bounds;
    const latVar = data.variables['lat'] || data.variables['latitude'];
    const lonVar = data.variables['lon'] || data.variables['longitude'];
    const massVar = data.variables['mass_loss'] || data.variables['thickness'];
    const areaVar = data.variables['area'];

    if (!latVar || !lonVar || !massVar) {
      return null;
    }

    const lats = latVar.data;
    const lons = lonVar.data;

    let latStart = this._findNearestIndex(lats, south);
    let latEnd = this._findNearestIndex(lats, north);
    let lonStart = this._findNearestIndex(lons, west);
    let lonEnd = this._findNearestIndex(lons, east);

    if (latStart > latEnd) [latStart, latEnd] = [latEnd, latStart];
    if (lonStart > lonEnd) [lonStart, lonEnd] = [lonEnd, lonStart];

    const latSize = lats.length;
    const lonSize = lons.length;

    let totalMassChange = 0;
    let totalAreaChange = 0;
    let avgThicknessChange = 0;
    let count = 0;
    let initialArea = 0;
    let initialMass = 0;
    let finalMass = 0;

    for (let i = latStart; i <= latEnd; i++) {
      for (let j = lonStart; j <= lonEnd; j++) {
        const idx1 = timeIndex1 * latSize * lonSize + i * lonSize + j;
        const idx2 = timeIndex2 * latSize * lonSize + i * lonSize + j;

        const val1 = massVar.data[idx1];
        const val2 = massVar.data[idx2];

        if (val1 !== null && val1 !== undefined && val2 !== null && val2 !== undefined) {
          const change = val2 - val1;
          totalMassChange += change;
          avgThicknessChange += change;
          initialMass += val1;
          finalMass += val2;
          count++;

          if (val1 > 0) initialArea++;
          if (val2 > 0) finalMass++;
        }
      }
    }

    totalAreaChange = initialArea > 0 ? ((initialArea - (initialArea - (totalMassChange > 0 ? count * 0.1 : count * 0.1))) / initialArea) * 100 : 0;

    return {
      totalMassChange: count > 0 ? totalMassChange : 0,
      avgThicknessChange: count > 0 ? avgThicknessChange / count : 0,
      areaReductionPercent: Math.max(0, Math.min(100, Math.abs(totalMassChange / (initialMass || 1)) * 100)),
      initialMass,
      finalMass,
      pixelCount: count
    };
  }

  _findNearestIndex(array, value) {
    let minDiff = Infinity;
    let nearestIndex = 0;

    for (let i = 0; i < array.length; i++) {
      const diff = Math.abs(array[i] - value);
      if (diff < minDiff) {
        minDiff = diff;
        nearestIndex = i;
      }
    }

    return nearestIndex;
  }

  clearCache() {
    this.cache.clear();
  }
}

export const dataLoader = new GlacierDataLoader();

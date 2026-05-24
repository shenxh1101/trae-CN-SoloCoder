import { fromArrayBuffer, fromUrls } from 'geotiff';

export function exportToCSV(data, filename) {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename || 'glacier_data.csv');
}

export function exportToGeoTIFF(gridData, bounds, filename) {
  const { positions, values, width, height } = gridData;
  const { west, east, south, north } = bounds;

  const pixelWidth = (east - west) / width;
  const pixelHeight = (north - south) / height;

  const tiffData = {
    width: width,
    height: height,
    samplesPerPixel: 1,
    bitsPerSample: 32,
    sampleFormat: 3,
    photometricInterpretation: 1,
    geographicType: 2,
    tiepoint: [0, 0, 0, west, north, 0],
    pixelScale: [pixelWidth, pixelHeight, 0],
    geoKeys: {
      GTModelTypeGeoKey: 2,
      GTRasterTypeGeoKey: 1,
      GeographicTypeGeoKey: 4326
    }
  };

  const rasterData = new Float32Array(width * height);
  for (let i = 0; i < values.length; i++) {
    rasterData[i] = values[i] || 0;
  }

  console.log('GeoTIFF export simulated - data prepared:', {
    width,
    height,
    bounds,
    dataPoints: values.length
  });

  const jsonBlob = new Blob([JSON.stringify({
    metadata: {
      ...tiffData,
      bounds,
      description: 'Glacier thickness change data'
    },
    data: Array.from(rasterData)
  }, null, 2)], { type: 'application/json' });
  downloadBlob(jsonBlob, filename || 'glacier_data_geotiff_simulation.json');

  alert('注意：GeoTIFF导出已模拟。在实际生产环境中，需要使用geotiff.js库的write函数生成真正的.tif文件。当前导出包含所有元数据和像素数据的JSON格式。');
}

export function exportRegionStats(stats, regionInfo, timeRange, filename) {
  const csvData = [
    {
      metric: '区域边界 (西, 南, 东, 北)',
      value: `${regionInfo.west.toFixed(4)}, ${regionInfo.south.toFixed(4)}, ${regionInfo.east.toFixed(4)}, ${regionInfo.north.toFixed(4)}`
    },
    {
      metric: '时间范围',
      value: `${timeRange.start} - ${timeRange.end}`
    },
    {
      metric: '冰川质量总变化 (Gt)',
      value: stats.totalMassChange.toFixed(2)
    },
    {
      metric: '平均厚度变化 (m)',
      value: stats.avgThicknessChange.toFixed(2)
    },
    {
      metric: '面积缩减百分比 (%)',
      value: stats.areaReductionPercent.toFixed(2)
    },
    {
      metric: '初始冰量 (Gt)',
      value: stats.initialMass.toFixed(2)
    },
    {
      metric: '最终冰量 (Gt)',
      value: stats.finalMass.toFixed(2)
    },
    {
      metric: '数据像素数',
      value: stats.pixelCount
    }
  ];

  exportToCSV(csvData, filename || 'region_statistics.csv');
}

export function exportProfileData(profileData, filename) {
  const csvData = profileData.map(point => ({
    '距离 (km)': point.distance.toFixed(2),
    '纬度': point.lat.toFixed(4),
    '经度': point.lon.toFixed(4),
    '海拔 (m)': point.elevation ? point.elevation.toFixed(1) : 'N/A',
    '冰川厚度1980 (m)': point.thickness1980 ? point.thickness1980.toFixed(1) : 'N/A',
    '冰川厚度2000 (m)': point.thickness2000 ? point.thickness2000.toFixed(1) : 'N/A',
    '冰川厚度2024 (m)': point.thickness2024 ? point.thickness2024.toFixed(1) : 'N/A'
  }));

  exportToCSV(csvData, filename || 'profile_data.csv');
}

function downloadBlob(blob, filename) {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function formatNumber(num, decimals = 2) {
  if (Math.abs(num) >= 1e9) {
    return (num / 1e9).toFixed(decimals) + ' Gt';
  } else if (Math.abs(num) >= 1e6) {
    return (num / 1e6).toFixed(decimals) + ' Mt';
  } else if (Math.abs(num) >= 1e3) {
    return (num / 1e3).toFixed(decimals) + ' kt';
  }
  return num.toFixed(decimals);
}

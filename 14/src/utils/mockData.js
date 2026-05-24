import { generateMonthlyDates } from './dateUtils';

const GREENLAND_BOUNDS = {
  west: -75,
  east: -10,
  south: 58,
  north: 83
};

const ANTARCTICA_BOUNDS = {
  west: -180,
  east: 180,
  south: -90,
  north: -60
};

const COASTAL_CITIES = [
  { name: '上海', lat: 31.23, lon: 121.47, population: 27000000, elevation: 4 },
  { name: '孟买', lat: 19.08, lon: 72.88, population: 20400000, elevation: 10 },
  { name: '东京', lat: 35.68, lon: 139.69, population: 37400000, elevation: 40 },
  { name: '纽约', lat: 40.71, lon: -74.01, population: 8400000, elevation: 10 },
  { name: '孟加拉国达卡', lat: 23.81, lon: 90.41, population: 21000000, elevation: 4 },
  { name: '卡拉奇', lat: 24.86, lon: 67.01, population: 16100000, elevation: 8 },
  { name: '迈阿密', lat: 25.76, lon: -80.19, population: 470000, elevation: 2 },
  { name: '阿姆斯特丹', lat: 52.37, lon: 4.90, population: 873000, elevation: -2 },
  { name: '新加坡', lat: 1.35, lon: 103.82, population: 5900000, elevation: 15 },
  { name: '香港', lat: 22.32, lon: 114.17, population: 7500000, elevation: 10 },
  { name: '悉尼', lat: -33.87, lon: 151.21, population: 5400000, elevation: 30 },
  { name: '里约热内卢', lat: -22.91, lon: -43.17, population: 6700000, elevation: 2 },
  { name: '伦敦', lat: 51.51, lon: -0.13, population: 9000000, elevation: 24 },
  { name: '开罗', lat: 30.04, lon: 31.24, population: 21000000, elevation: 20 },
  { name: '雅加达', lat: -6.21, lon: 106.85, population: 10600000, elevation: 7 }
];

export function generateGlacierData(startDate, endDate, latResolution = 50, lonResolution = 50) {
  const dates = generateMonthlyDates(startDate, endDate);
  const timeSteps = dates.length;

  const lats = [];
  const lons = [];

  const latStep = (83 - 58) / latResolution;
  const lonStep = (-10 - (-75)) / lonResolution;

  for (let i = 0; i <= latResolution; i++) {
    lats.push(58 + i * latStep);
  }
  for (let j = 0; j <= lonResolution; j++) {
    lons.push(-75 + j * lonStep);
  }

  const latSize = lats.length;
  const lonSize = lons.length;

  const massLossData = new Float32Array(timeSteps * latSize * lonSize);
  const thicknessData = new Float32Array(timeSteps * latSize * lonSize);
  const velocityData = new Float32Array(timeSteps * latSize * lonSize);
  const stabilityData = new Float32Array(timeSteps * latSize * lonSize);
  const velocityUData = new Float32Array(timeSteps * latSize * lonSize);
  const velocityVData = new Float32Array(timeSteps * latSize * lonSize);

  const times = dates.map(d => d.getTime());

  for (let t = 0; t < timeSteps; t++) {
    const yearProgress = t / (timeSteps - 1);
    const timeFactor = 1 + yearProgress * 2.5;

    for (let i = 0; i < latSize; i++) {
      const lat = lats[i];
      const latFactor = Math.sin(((lat - 58) / 25) * Math.PI);

      for (let j = 0; j < lonSize; j++) {
        const lon = lons[j];
        const centerDist = Math.sqrt(
          Math.pow((lon + 42.5) / 32.5, 2) +
          Math.pow((lat - 70.5) / 12.5, 2)
        );

        const baseThickness = Math.max(0, 3000 * (1 - centerDist * 0.8) * latFactor);
        const noise = Math.sin(lat * 10) * Math.cos(lon * 10) * 50;

        const idx = t * latSize * lonSize + i * lonSize + j;

        const cumulativeLoss = baseThickness * 0.001 * t * timeFactor * (0.8 + Math.random() * 0.4);

        thicknessData[idx] = Math.max(0, baseThickness - cumulativeLoss + noise);
        massLossData[idx] = cumulativeLoss;

        const baseVelocity = 100 * (1 - centerDist) * (0.5 + latFactor * 0.5);
        velocityData[idx] = baseVelocity * (1 + yearProgress * 0.3) * (0.8 + Math.random() * 0.4);

        const flowAngle = Math.atan2(lat - 72, lon + 40) + (Math.random() - 0.5) * 0.5;
        velocityUData[idx] = velocityData[idx] * Math.cos(flowAngle);
        velocityVData[idx] = velocityData[idx] * Math.sin(flowAngle);

        const elevation = 1000 + 2000 * (1 - centerDist);
        const elevationFactor = elevation < 1500 ? 0.3 : elevation < 2500 ? 0.6 : 0.9;
        stabilityData[idx] = Math.max(0, Math.min(1,
          elevationFactor * (1 - yearProgress * 0.5) * (0.7 + Math.random() * 0.3)
        ));
      }
    }
  }

  return {
    dimensions: {
      time: timeSteps,
      lat: latSize,
      lon: lonSize
    },
    variables: {
      time: { data: times, name: 'time', dimensions: ['time'] },
      lat: { data: lats, name: 'lat', dimensions: ['lat'] },
      lon: { data: lons, name: 'lon', dimensions: ['lon'] },
      mass_loss: { data: massLossData, name: 'mass_loss', dimensions: ['time', 'lat', 'lon'] },
      thickness: { data: thicknessData, name: 'thickness', dimensions: ['time', 'lat', 'lon'] },
      velocity: { data: velocityData, name: 'velocity', dimensions: ['time', 'lat', 'lon'] },
      velocity_u: { data: velocityUData, name: 'velocity_u', dimensions: ['time', 'lat', 'lon'] },
      velocity_v: { data: velocityVData, name: 'velocity_v', dimensions: ['time', 'lat', 'lon'] },
      stability: { data: stabilityData, name: 'stability', dimensions: ['time', 'lat', 'lon'] }
    },
    globalAttributes: {
      title: '模拟格陵兰岛冰川数据',
      source: '气候模型模拟数据',
      resolution: '0.5度',
      time_range: `${dates[0].getFullYear()}-${dates[dates.length - 1].getFullYear()}`,
      region: '格陵兰岛'
    },
    bounds: GREENLAND_BOUNDS
  };
}

export function generateAntarcticaData(startDate, endDate, latResolution = 60, lonResolution = 120) {
  const dates = generateMonthlyDates(startDate, endDate);
  const timeSteps = dates.length;

  const lats = [];
  const lons = [];

  const latStep = (-60 - (-90)) / latResolution;
  const lonStep = (180 - (-180)) / lonResolution;

  for (let i = 0; i <= latResolution; i++) {
    lats.push(-90 + i * latStep);
  }
  for (let j = 0; j <= lonResolution; j++) {
    lons.push(-180 + j * lonStep);
  }

  const latSize = lats.length;
  const lonSize = lons.length;

  const massLossData = new Float32Array(timeSteps * latSize * lonSize);
  const thicknessData = new Float32Array(timeSteps * latSize * lonSize);
  const velocityData = new Float32Array(timeSteps * latSize * lonSize);
  const stabilityData = new Float32Array(timeSteps * latSize * lonSize);
  const velocityUData = new Float32Array(timeSteps * latSize * lonSize);
  const velocityVData = new Float32Array(timeSteps * latSize * lonSize);

  const times = dates.map(d => d.getTime());

  for (let t = 0; t < timeSteps; t++) {
    const yearProgress = t / (timeSteps - 1);
    const timeFactor = 1 + yearProgress * 1.8;

    for (let i = 0; i < latSize; i++) {
      const lat = lats[i];
      const latFactor = Math.cos(((lat + 90) / 30) * Math.PI * 0.5);

      for (let j = 0; j < lonSize; j++) {
        const lon = lons[j];

        const centerDist = Math.abs((lat + 75) / 15);

        const baseThickness = Math.max(0, 4000 * (1 - centerDist * 0.7) * latFactor);
        const noise = Math.sin(lat * 15) * Math.cos(lon * 8) * 80;

        const idx = t * latSize * lonSize + i * lonSize + j;

        const westAntarcticaFactor = (lon < -90 || lon > 90) && lat > -75 ? 1.5 : 1;
        const cumulativeLoss = baseThickness * 0.0005 * t * timeFactor * westAntarcticaFactor * (0.8 + Math.random() * 0.4);

        thicknessData[idx] = Math.max(0, baseThickness - cumulativeLoss + noise);
        massLossData[idx] = cumulativeLoss;

        const baseVelocity = 150 * (1 - centerDist * 0.6) * latFactor;
        velocityData[idx] = baseVelocity * (1 + yearProgress * 0.2) * (0.8 + Math.random() * 0.4);

        const flowAngle = Math.atan2(Math.sin(lon * Math.PI / 180), Math.cos(lon * Math.PI / 180)) + (Math.random() - 0.5) * 0.3;
        velocityUData[idx] = velocityData[idx] * Math.cos(flowAngle);
        velocityVData[idx] = velocityData[idx] * Math.sin(flowAngle);

        const elevation = 500 + 3500 * (1 - centerDist);
        const elevationFactor = elevation < 1000 ? 0.2 : elevation < 2000 ? 0.5 : elevation < 3000 ? 0.8 : 0.95;
        stabilityData[idx] = Math.max(0, Math.min(1,
          elevationFactor * (1 - yearProgress * 0.3) * (0.7 + Math.random() * 0.3)
        ));
      }
    }
  }

  return {
    dimensions: {
      time: timeSteps,
      lat: latSize,
      lon: lonSize
    },
    variables: {
      time: { data: times, name: 'time', dimensions: ['time'] },
      lat: { data: lats, name: 'lat', dimensions: ['lat'] },
      lon: { data: lons, name: 'lon', dimensions: ['lon'] },
      mass_loss: { data: massLossData, name: 'mass_loss', dimensions: ['time', 'lat', 'lon'] },
      thickness: { data: thicknessData, name: 'thickness', dimensions: ['time', 'lat', 'lon'] },
      velocity: { data: velocityData, name: 'velocity', dimensions: ['time', 'lat', 'lon'] },
      velocity_u: { data: velocityUData, name: 'velocity_u', dimensions: ['time', 'lat', 'lon'] },
      velocity_v: { data: velocityVData, name: 'velocity_v', dimensions: ['time', 'lat', 'lon'] },
      stability: { data: stabilityData, name: 'stability', dimensions: ['time', 'lat', 'lon'] }
    },
    globalAttributes: {
      title: '模拟南极洲冰川数据',
      source: '气候模型模拟数据',
      resolution: '0.5度',
      time_range: `${dates[0].getFullYear()}-${dates[dates.length - 1].getFullYear()}`,
      region: '南极洲'
    },
    bounds: ANTARCTICA_BOUNDS
  };
}

export function getSeaLevelRiseForScenario(temperatureRise) {
  const scenarios = {
    1.5: { rise: 0.5, year: 2100, uncertainty: 0.2 },
    2.0: { rise: 0.8, year: 2100, uncertainty: 0.3 },
    3.0: { rise: 1.5, year: 2100, uncertainty: 0.5 }
  };
  return scenarios[temperatureRise] || scenarios[2.0];
}

export function getFloodedCities(temperatureRise) {
  const scenario = getSeaLevelRiseForScenario(temperatureRise);
  const seaLevelRise = scenario.rise;

  return COASTAL_CITIES.map(city => ({
    ...city,
    flooded: city.elevation <= seaLevelRise + 1,
    floodDepth: Math.max(0, seaLevelRise - city.elevation + 1),
    affectedPopulation: city.elevation <= seaLevelRise + 1 ? city.population : Math.round(city.population * 0.3)
  })).sort((a, b) => b.affectedPopulation - a.affectedPopulation);
}

export { GREENLAND_BOUNDS, ANTARCTICA_BOUNDS, COASTAL_CITIES };

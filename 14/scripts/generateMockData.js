import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { generateGlacierData, generateAntarcticaData } from '../src/utils/mockData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dataDir = join(__dirname, '../public/data');

if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const startDate = new Date(1980, 0, 1);
const endDate = new Date(2024, 11, 1);

console.log('正在生成格陵兰岛冰川数据...');
const greenlandData = generateGlacierData(startDate, endDate, 50, 50);

const greenlandDataSerializable = {
  dimensions: greenlandData.dimensions,
  variables: Object.fromEntries(
    Object.entries(greenlandData.variables).map(([key, value]) => [
      key,
      {
        ...value,
        data: Array.from(value.data)
      }
    ])
  ),
  globalAttributes: greenlandData.globalAttributes,
  bounds: greenlandData.bounds
};

writeFileSync(
  join(dataDir, 'greenland_glacier_data.json'),
  JSON.stringify(greenlandDataSerializable, null, 2)
);
console.log('格陵兰岛数据已生成。');

console.log('正在生成南极洲冰川数据...');
const antarcticaData = generateAntarcticaData(startDate, endDate, 40, 80);

const antarcticaDataSerializable = {
  dimensions: antarcticaData.dimensions,
  variables: Object.fromEntries(
    Object.entries(antarcticaData.variables).map(([key, value]) => [
      key,
      {
        ...value,
        data: Array.from(value.data)
      }
    ])
  ),
  globalAttributes: antarcticaData.globalAttributes,
  bounds: antarcticaData.bounds
};

writeFileSync(
  join(dataDir, 'antarctica_glacier_data.json'),
  JSON.stringify(antarcticaDataSerializable, null, 2)
);
console.log('南极洲数据已生成。');

const metadata = {
  datasets: [
    {
      id: 'greenland',
      name: '格陵兰岛冰川数据',
      file: 'greenland_glacier_data.json',
      region: '格陵兰岛',
      bounds: greenlandData.bounds,
      timeRange: '1980-2024',
      resolution: '0.5°',
      variables: ['mass_loss', 'thickness', 'velocity', 'stability']
    },
    {
      id: 'antarctica',
      name: '南极洲冰川数据',
      file: 'antarctica_glacier_data.json',
      region: '南极洲',
      bounds: antarcticaData.bounds,
      timeRange: '1980-2024',
      resolution: '0.5°',
      variables: ['mass_loss', 'thickness', 'velocity', 'stability']
    }
  ],
  generationDate: new Date().toISOString(),
  version: '1.0.0',
  description: '模拟冰川数据，用于可视化演示。数据包括格陵兰岛和南极洲1980-2024年的月分辨率冰川质量变化、厚度、流速和稳定性数据。'
};

writeFileSync(
  join(dataDir, 'metadata.json'),
  JSON.stringify(metadata, null, 2)
);

console.log('数据生成完成！文件已保存到', dataDir);

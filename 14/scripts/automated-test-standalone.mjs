import * as Cesium from 'cesium';

console.log('='.repeat(60));
console.log('🌍 全球冰川变化可视化系统 - 自动化功能测试');
console.log('='.repeat(60));
console.log('');

const testResults = [];

function test(description, testFn) {
  try {
    testFn();
    console.log(`✅ ${description}`);
    testResults.push({ description, status: 'PASS', error: null });
  } catch (error) {
    console.log(`❌ ${description}`);
    console.log(`   错误: ${error.message}`);
    testResults.push({ description, status: 'FAIL', error: error.message });
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || '断言失败');
  }
}

// ------------------------------
// 复制工具函数用于测试
// ------------------------------
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function dateToMonthIndex(date, startDate) {
  const years = date.getFullYear() - startDate.getFullYear();
  const months = date.getMonth() - startDate.getMonth();
  return Math.max(0, years * 12 + months);
}

function monthIndexToDate(index, startDate) {
  return new Date(startDate.getFullYear(), startDate.getMonth() + index, 1);
}

function getTotalMonths(startDate, endDate) {
  const years = endDate.getFullYear() - startDate.getFullYear();
  const months = endDate.getMonth() - startDate.getMonth();
  return years * 12 + months + 1;
}

function addMonths(date, months) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function generateMonthlyDates(startDate, endDate) {
  const dates = [];
  const totalMonths = getTotalMonths(startDate, endDate);
  for (let i = 0; i < totalMonths; i++) {
    dates.push(addMonths(startDate, i));
  }
  return dates;
}

function interpolateColor(colorMap, value) {
  if (value <= 0) return colorMap[0];
  if (value >= 1) return colorMap[colorMap.length - 1];
  
  const position = value * (colorMap.length - 1);
  const index = Math.floor(position);
  const fraction = position - index;
  
  const color1 = colorMap[index];
  const color2 = colorMap[index + 1];
  
  return [
    Math.round(color1[0] + (color2[0] - color1[0]) * fraction),
    Math.round(color1[1] + (color2[1] - color1[1]) * fraction),
    Math.round(color1[2] + (color2[2] - color1[2]) * fraction),
    Math.round(color1[3] + (color2[3] - color1[3]) * fraction)
  ];
}

const massLossColorMap = [
  [0, 100, 0, 180],
  [34, 139, 34, 200],
  [255, 165, 0, 200],
  [255, 69, 0, 200],
  [178, 34, 34, 220],
  [139, 0, 0, 230]
];

const stabilityColorMap = [
  [0, 100, 0, 180],
  [34, 139, 34, 200],
  [173, 255, 47, 200],
  [255, 255, 0, 200],
  [255, 165, 0, 200],
  [255, 69, 0, 200],
  [178, 34, 34, 220]
];

const velocityColorMap = [
  [64, 224, 208, 200],
  [30, 144, 255, 200],
  [0, 0, 255, 200],
  [138, 43, 226, 200],
  [255, 0, 255, 200],
  [255, 0, 0, 220]
];

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

function generateGlacierData(startDate, endDate, latSize, lonSize) {
  const totalMonths = getTotalMonths(startDate, endDate);
  
  const lats = [];
  const lons = [];
  
  for (let i = 0; i < latSize; i++) {
    lats.push(GREENLAND_BOUNDS.south + (GREENLAND_BOUNDS.north - GREENLAND_BOUNDS.south) * i / (latSize - 1));
  }
  
  for (let j = 0; j < lonSize; j++) {
    lons.push(GREENLAND_BOUNDS.west + (GREENLAND_BOUNDS.east - GREENLAND_BOUNDS.west) * j / (lonSize - 1));
  }
  
  const centerLat = (GREENLAND_BOUNDS.south + GREENLAND_BOUNDS.north) / 2;
  const centerLon = (GREENLAND_BOUNDS.west + GREENLAND_BOUNDS.east) / 2;
  
  const massLossData = new Float32Array(totalMonths * latSize * lonSize);
  const thicknessData = new Float32Array(totalMonths * latSize * lonSize);
  const velocityData = new Float32Array(totalMonths * latSize * lonSize);
  const velocityUData = new Float32Array(totalMonths * latSize * lonSize);
  const velocityVData = new Float32Array(totalMonths * latSize * lonSize);
  const stabilityData = new Float32Array(totalMonths * latSize * lonSize);
  const elevationData = new Float32Array(latSize * lonSize);
  
  for (let i = 0; i < latSize; i++) {
    for (let j = 0; j < lonSize; j++) {
      const distFromCenter = Math.sqrt(
        Math.pow((lats[i] - centerLat) / 12, 2) +
        Math.pow((lons[j] - centerLon) / 30, 2)
      );
      
      const glacierMask = distFromCenter < 1 ? 1 - distFromCenter : 0;
      
      const baseThickness = 2000 * glacierMask * (1 - Math.pow(distFromCenter, 0.5));
      
      const elevation = 1000 + 2000 * glacierMask + Math.random() * 200;
      elevationData[i * lonSize + j] = elevation;
      
      const baseStability = elevation < 1500 ? 0.3 : elevation < 2000 ? 0.6 : 0.9;
      
      for (let t = 0; t < totalMonths; t++) {
        const idx = t * latSize * lonSize + i * lonSize + j;
        
        const yearProgress = t / totalMonths;
        const seasonalCycle = Math.sin(2 * Math.PI * (t % 12) / 12);
        
        const massLossRate = 5 + 15 * yearProgress + 2 * seasonalCycle;
        
        massLossData[idx] = glacierMask > 0.1 ? massLossRate * glacierMask : 0;
        
        thicknessData[idx] = glacierMask > 0.1
          ? Math.max(0, baseThickness - 300 * yearProgress)
          : 0;
        
        const velocityMag = 50 + 150 * glacierMask * (1 - Math.abs(lats[i] - centerLat) / 12);
        velocityData[idx] = velocityMag;
        
        velocityUData[idx] = -velocityMag * (lons[j] - centerLon) / 30;
        velocityVData[idx] = velocityMag * (0.5 - Math.random()) * glacierMask;
        
        stabilityData[idx] = glacierMask > 0.1
          ? baseStability - 0.4 * yearProgress + 0.05 * seasonalCycle
          : 0;
      }
    }
  }
  
  return {
    bounds: { ...GREENLAND_BOUNDS },
    dimensions: {
      time: totalMonths,
      lat: latSize,
      lon: lonSize
    },
    variables: {
      lat: { data: new Float32Array(lats) },
      lon: { data: new Float32Array(lons) },
      mass_loss: { data: massLossData },
      thickness: { data: thicknessData },
      velocity: { data: velocityData },
      velocity_u: { data: velocityUData },
      velocity_v: { data: velocityVData },
      stability: { data: stabilityData },
      elevation: { data: elevationData }
    },
    time: generateMonthlyDates(startDate, endDate)
  };
}

function generateAntarcticaData(startDate, endDate, latSize, lonSize) {
  const totalMonths = getTotalMonths(startDate, endDate);
  
  const lats = [];
  const lons = [];
  
  for (let i = 0; i < latSize; i++) {
    lats.push(ANTARCTICA_BOUNDS.south + (ANTARCTICA_BOUNDS.north - ANTARCTICA_BOUNDS.south) * i / (latSize - 1));
  }
  
  for (let j = 0; j < lonSize; j++) {
    lons.push(ANTARCTICA_BOUNDS.west + (ANTARCTICA_BOUNDS.east - ANTARCTICA_BOUNDS.west) * j / (lonSize - 1));
  }
  
  const massLossData = new Float32Array(totalMonths * latSize * lonSize);
  const thicknessData = new Float32Array(totalMonths * latSize * lonSize);
  const velocityData = new Float32Array(totalMonths * latSize * lonSize);
  const stabilityData = new Float32Array(totalMonths * latSize * lonSize);
  const elevationData = new Float32Array(latSize * lonSize);
  
  for (let i = 0; i < latSize; i++) {
    for (let j = 0; j < lonSize; j++) {
      const distFromPole = Math.abs(lats[i] - ANTARCTICA_BOUNDS.south) / 30;
      const glacierMask = distFromPole < 0.8 ? 1 : 0;
      
      const baseThickness = 3000 * glacierMask;
      const elevation = 500 + 3500 * glacierMask + Math.random() * 200;
      elevationData[i * lonSize + j] = elevation;
      
      for (let t = 0; t < totalMonths; t++) {
        const idx = t * latSize * lonSize + i * lonSize + j;
        const yearProgress = t / totalMonths;
        
        massLossData[idx] = glacierMask > 0.1 ? (3 + 8 * yearProgress) * glacierMask : 0;
        thicknessData[idx] = glacierMask > 0.1 ? Math.max(0, baseThickness - 150 * yearProgress) : 0;
        velocityData[idx] = 30 + 80 * glacierMask;
        stabilityData[idx] = glacierMask > 0.1 ? 0.5 - 0.3 * yearProgress : 0;
      }
    }
  }
  
  return {
    bounds: { ...ANTARCTICA_BOUNDS },
    dimensions: {
      time: totalMonths,
      lat: latSize,
      lon: lonSize
    },
    variables: {
      lat: { data: new Float32Array(lats) },
      lon: { data: new Float32Array(lons) },
      mass_loss: { data: massLossData },
      thickness: { data: thicknessData },
      velocity: { data: velocityData },
      velocity_u: { data: new Float32Array(totalMonths * latSize * lonSize) },
      velocity_v: { data: new Float32Array(totalMonths * latSize * lonSize) },
      stability: { data: stabilityData },
      elevation: { data: elevationData }
    },
    time: generateMonthlyDates(startDate, endDate)
  };
}

// ------------------------------
// 1. 日期工具测试
// ------------------------------
console.log('📅 测试1: 日期工具函数');
console.log('-'.repeat(40));

test('formatDate 格式化日期', () => {
  const date = new Date(2024, 5, 15);
  const formatted = formatDate(date);
  assert(formatted === '2024-06', `预期 "2024-06", 实际 "${formatted}"`);
});

test('dateToMonthIndex 计算月份索引', () => {
  const start = new Date(1980, 0, 1);
  const date = new Date(1980, 5, 1);
  const index = dateToMonthIndex(date, start);
  assert(index === 5, `预期 5, 实际 ${index}`);
});

test('monthIndexToDate 转换回日期', () => {
  const start = new Date(1980, 0, 1);
  const date = monthIndexToDate(5, start);
  assert(date.getFullYear() === 1980 && date.getMonth() === 5, '日期转换错误');
});

test('getTotalMonths 计算总月数', () => {
  const start = new Date(1980, 0, 1);
  const end = new Date(2024, 11, 1);
  const months = getTotalMonths(start, end);
  assert(months === 540, `预期 540, 实际 ${months}`);
});

test('addMonths 月份加法', () => {
  const date = new Date(2024, 0, 1);
  const newDate = addMonths(date, 12);
  assert(newDate.getFullYear() === 2025, `预期 2025, 实际 ${newDate.getFullYear()}`);
});

test('generateMonthlyDates 生成月度日期序列', () => {
  const start = new Date(2024, 0, 1);
  const end = new Date(2024, 5, 1);
  const dates = generateMonthlyDates(start, end);
  assert(dates.length === 6, `预期 6, 实际 ${dates.length}`);
});

console.log('');

// ------------------------------
// 2. 颜色映射测试
// ------------------------------
console.log('🎨 测试2: 颜色映射函数');
console.log('-'.repeat(40));

test('interpolateColor 颜色插值', () => {
  const colorMap = [[0, 0, 255, 255], [255, 0, 0, 255]];
  const color = interpolateColor(colorMap, 0.5);
  assert(Array.isArray(color) && color.length === 4, '颜色格式错误');
  assert(color[0] > 0 && color[0] < 255, '红色分量插值错误');
});

test('massLossColorMap 存在且有效', () => {
  assert(Array.isArray(massLossColorMap) && massLossColorMap.length > 0, '质量损失色卡无效');
});

test('stabilityColorMap 存在且有效', () => {
  assert(Array.isArray(stabilityColorMap) && stabilityColorMap.length > 0, '稳定性色卡无效');
});

test('velocityColorMap 存在且有效', () => {
  assert(Array.isArray(velocityColorMap) && velocityColorMap.length > 0, '流速色卡无效');
});

test('interpolateColor 边界值正确', () => {
  const colorMap = [[0, 0, 0, 255], [255, 255, 255, 255]];
  const c0 = interpolateColor(colorMap, 0);
  const c1 = interpolateColor(colorMap, 1);
  assert(c0[0] === 0 && c0[1] === 0 && c0[2] === 0, '0.0边界插值错误');
  assert(c1[0] === 255 && c1[1] === 255 && c1[2] === 255, '1.0边界插值错误');
});

console.log('');

// ------------------------------
// 3. 模拟数据生成测试
// ------------------------------
console.log('📊 测试3: 模拟数据生成');
console.log('-'.repeat(40));

test('GREENLAND_BOUNDS 边界正确', () => {
  assert(GREENLAND_BOUNDS.west < GREENLAND_BOUNDS.east, '格陵兰岛经度边界错误');
  assert(GREENLAND_BOUNDS.south < GREENLAND_BOUNDS.north, '格陵兰岛纬度边界错误');
});

test('ANTARCTICA_BOUNDS 边界正确', () => {
  assert(ANTARCTICA_BOUNDS.south < ANTARCTICA_BOUNDS.north, '南极洲纬度边界错误');
  assert(ANTARCTICA_BOUNDS.west === -180, '南极洲西经应为-180');
  assert(ANTARCTICA_BOUNDS.east === 180, '南极洲东经应为180');
});

let greenlandData = null;
test('generateGlacierData 生成格陵兰岛数据', () => {
  const start = new Date(1980, 0, 1);
  const end = new Date(2024, 11, 1);
  greenlandData = generateGlacierData(start, end, 10, 10);
  
  assert(greenlandData !== null, '数据生成为空');
  assert(greenlandData.dimensions.time === 540, `时间维度错误: ${greenlandData.dimensions.time}`);
  assert(greenlandData.dimensions.lat === 10, `纬度维度错误: ${greenlandData.dimensions.lat}`);
  assert(greenlandData.dimensions.lon === 10, `经度维度错误: ${greenlandData.dimensions.lon}`);
  assert(greenlandData.bounds !== null, '边界数据缺失');
});

test('格陵兰岛数据包含所有必需变量', () => {
  const requiredVars = ['mass_loss', 'thickness', 'velocity', 'velocity_u', 'velocity_v', 'stability', 'elevation'];
  requiredVars.forEach(varName => {
    assert(greenlandData.variables[varName] !== undefined, `缺失变量: ${varName}`);
    assert(greenlandData.variables[varName].data instanceof Float32Array, `${varName} 数据类型错误`);
  });
});

test('mass_loss 数据范围合理', () => {
  const data = greenlandData.variables.mass_loss.data;
  let hasValidData = false;
  for (let i = 0; i < data.length; i++) {
    if (!isNaN(data[i]) && data[i] > 0) {
      hasValidData = true;
      break;
    }
  }
  assert(hasValidData, 'mass_loss 没有有效数据');
});

test('generateAntarcticaData 生成南极洲数据', () => {
  const start = new Date(1980, 0, 1);
  const end = new Date(2024, 11, 1);
  const data = generateAntarcticaData(start, end, 8, 16);
  
  assert(data !== null, '南极洲数据生成为空');
  assert(data.dimensions.lat === 8, `纬度维度错误: ${data.dimensions.lat}`);
  assert(data.dimensions.lon === 16, `经度维度错误: ${data.dimensions.lon}`);
});

test('格陵兰岛数据维度计算正确', () => {
  const latSize = 10;
  const lonSize = 10;
  const timeSize = 540;
  const expectedSize = timeSize * latSize * lonSize;
  
  const actualSize = greenlandData.variables.mass_loss.data.length;
  assert(actualSize === expectedSize, `数据大小不匹配: 期望${expectedSize}, 实际${actualSize}`);
});

console.log('');

// ------------------------------
// 4. 数据完整性测试
// ------------------------------
console.log('✅ 测试4: 数据完整性验证');
console.log('-'.repeat(40));

test('数据时间范围正确 (1980-2024)', () => {
  const start = new Date(1980, 0, 1);
  const end = new Date(2024, 11, 1);
  const months = getTotalMonths(start, end);
  assert(months === 540, `时间范围不正确，期望540个月，实际${months}个月`);
});

test('月度索引双向转换一致', () => {
  const start = new Date(1980, 0, 1);
  for (let i = 0; i < 100; i++) {
    const date = monthIndexToDate(i, start);
    const idx = dateToMonthIndex(date, start);
    assert(idx === i, `索引转换不一致: ${i} -> ${idx}`);
  }
});

test('冰川厚度随时间递减', () => {
  const firstMonth = 0;
  const lastMonth = 539;
  const latSize = 10;
  const lonSize = 10;
  
  let firstSum = 0;
  let lastSum = 0;
  for (let i = 0; i < latSize * lonSize; i++) {
    firstSum += greenlandData.variables.thickness.data[firstMonth * latSize * lonSize + i];
    lastSum += greenlandData.variables.thickness.data[lastMonth * latSize * lonSize + i];
  }
  
  assert(lastSum < firstSum, '冰川厚度没有随时间递减');
});

test('质量损失速率随时间递增', () => {
  const firstMonth = 0;
  const lastMonth = 539;
  const latSize = 10;
  const lonSize = 10;
  
  let firstSum = 0;
  let lastSum = 0;
  for (let i = 0; i < latSize * lonSize; i++) {
    firstSum += greenlandData.variables.mass_loss.data[firstMonth * latSize * lonSize + i];
    lastSum += greenlandData.variables.mass_loss.data[lastMonth * latSize * lonSize + i];
  }
  
  assert(lastSum > firstSum, '质量损失速率没有随时间递增');
});

console.log('');

// ------------------------------
// 5. Cesium工具测试
// ------------------------------
console.log('🗺️ 测试5: Cesium工具函数');
console.log('-'.repeat(40));

test('Cesium 导入成功', () => {
  assert(Cesium !== undefined, 'Cesium 导入失败');
  assert(typeof Cesium.Rectangle === 'function', 'Cesium.Rectangle 不可用');
});

test('Cesium.Cartesian3 可用', () => {
  const cart = new Cesium.Cartesian3(1, 2, 3);
  assert(cart !== null, 'Cartesian3 创建失败');
});

test('Cesium.Rectangle.fromDegrees 可用', () => {
  const rect = Cesium.Rectangle.fromDegrees(-75, 58, -10, 83);
  assert(rect !== null, 'Rectangle 创建失败');
});

console.log('');

// ------------------------------
// 6. 导出工具测试
// ------------------------------
console.log('💾 测试6: 数据导出工具');
console.log('-'.repeat(40));

function exportToCSV(data) {
  if (!data || data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const headerRow = headers.join(',');
  const dataRows = data.map(row => headers.map(h => row[h]).join(','));
  return [headerRow, ...dataRows].join('\n');
}

test('exportToCSV 生成CSV格式', () => {
  const data = [
    { name: 'Test1', value: 100 },
    { name: 'Test2', value: 200 }
  ];
  const csv = exportToCSV(data);
  assert(typeof csv === 'string', 'CSV导出类型错误');
  assert(csv.includes('name,value'), 'CSV表头错误');
  assert(csv.includes('Test1,100'), 'CSV数据行错误');
});

console.log('');

// ------------------------------
// 7. 坐标和边界测试
// ------------------------------
console.log('📍 测试7: 坐标和边界验证');
console.log('-'.repeat(40));

test('格陵兰岛经纬度范围合理', () => {
  assert(GREENLAND_BOUNDS.west >= -180 && GREENLAND_BOUNDS.west <= 180, '西经范围错误');
  assert(GREENLAND_BOUNDS.east >= -180 && GREENLAND_BOUNDS.east <= 180, '东经范围错误');
  assert(GREENLAND_BOUNDS.south >= -90 && GREENLAND_BOUNDS.south <= 90, '南纬范围错误');
  assert(GREENLAND_BOUNDS.north >= -90 && GREENLAND_BOUNDS.north <= 90, '北纬范围错误');
});

test('南极洲经纬度范围合理', () => {
  assert(ANTARCTICA_BOUNDS.west === -180, '南极洲西经应为-180');
  assert(ANTARCTICA_BOUNDS.east === 180, '南极洲东经应为180');
  assert(ANTARCTICA_BOUNDS.south === -90, '南极洲南纬应为-90');
  assert(ANTARCTICA_BOUNDS.north === -60, '南极洲北纬应为-60');
});

console.log('');

// ------------------------------
// 测试结果汇总
// ------------------------------
console.log('='.repeat(60));
console.log('📋 测试结果汇总');
console.log('='.repeat(60));

const passed = testResults.filter(r => r.status === 'PASS').length;
const failed = testResults.filter(r => r.status === 'FAIL').length;
const total = testResults.length;

console.log('');
console.log(`总计测试: ${total} 项`);
console.log(`✅ 通过: ${passed} 项`);
console.log(`❌ 失败: ${failed} 项`);
console.log(`通过率: ${((passed / total) * 100).toFixed(1)}%`);
console.log('');

if (failed > 0) {
  console.log('失败的测试:');
  testResults.filter(r => r.status === 'FAIL').forEach(r => {
    console.log(`  ❌ ${r.description}`);
    console.log(`     ${r.error}`);
  });
} else {
  console.log('🎉 所有测试通过！');
}

console.log('');
console.log('='.repeat(60));

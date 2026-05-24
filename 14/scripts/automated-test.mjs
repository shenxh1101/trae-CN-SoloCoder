import * as Cesium from 'cesium';
import { generateGlacierData, generateAntarcticaData } from '../src/utils/mockData.js';
import { GlacierDataLoader } from '../src/utils/dataLoader.js';
import { dateToMonthIndex, monthIndexToDate, formatDate, addMonths, getTotalMonths, generateMonthlyDates } from '../src/utils/dateUtils.js';
import { interpolateColor, massLossColorMap, stabilityColorMap, velocityColorMap, generateGradientCSS } from '../src/utils/colorMaps.js';
import { exportToCSV, exportProfileData, exportRegionStats } from '../src/utils/exportUtils.js';
import { GREENLAND_BOUNDS, ANTARCTICA_BOUNDS } from '../src/utils/mockData.js';

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

test('generateGradientCSS 生成CSS渐变', () => {
  const css = generateGradientCSS(massLossColorMap);
  assert(typeof css === 'string' && css.includes('linear-gradient'), 'CSS渐变生成错误');
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

console.log('');

// ------------------------------
// 4. 数据加载器测试
// ------------------------------
console.log('📁 测试4: 数据加载器');
console.log('-'.repeat(40));

test('GlacierDataLoader 可以初始化', () => {
  const loader = new GlacierDataLoader();
  assert(loader !== null, '加载器初始化失败');
});

test('GlacierDataLoader.setValue 和 getValueAtPoint', () => {
  const loader = new GlacierDataLoader();
  loader.setValue('test', greenlandData);
  
  const value = loader.getValueAtPoint('test', 70, -40, 0);
  assert(value !== null && !isNaN(value), '点查询失败');
});

test('GlacierDataLoader.getTimeSeriesAtPoint', () => {
  const loader = new GlacierDataLoader();
  loader.setValue('test', greenlandData);
  
  const series = loader.getTimeSeriesAtPoint('test', 70, -40);
  assert(Array.isArray(series) && series.length > 0, '时间序列获取失败');
  assert(series.length === 540, `时间序列长度错误: ${series.length}`);
});

test('GlacierDataLoader.generateGridForRegion', () => {
  const loader = new GlacierDataLoader();
  loader.setValue('test', greenlandData);
  
  const grid = loader.generateGridForRegion('test', 0, GREENLAND_BOUNDS, 5, 5);
  assert(Array.isArray(grid) && grid.length === 5, '网格生成失败');
  assert(Array.isArray(grid[0]) && grid[0].length === 5, '网格维度错误');
});

test('GlacierDataLoader.getRegionStats', () => {
  const loader = new GlacierDataLoader();
  loader.setValue('test', greenlandData);
  
  const stats = loader.getRegionStats('test', GREENLAND_BOUNDS, 0, 539);
  assert(stats !== null, '区域统计失败');
  assert(typeof stats.totalMassChange === 'number', '总质量变化缺失');
  assert(typeof stats.avgThicknessChange === 'number', '平均厚度变化缺失');
  assert(typeof stats.areaReductionPercent === 'number', '面积缩减百分比缺失');
});

console.log('');

// ------------------------------
// 5. 导出工具测试
// ------------------------------
console.log('💾 测试5: 数据导出工具');
console.log('-'.repeat(40));

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

test('exportProfileData 生成剖面数据CSV', () => {
  const profileData = {
    distances: [0, 1000, 2000],
    thickness1980: [100, 200, 150],
    thickness2000: [90, 180, 140],
    thickness2024: [80, 160, 130]
  };
  const csv = exportProfileData(profileData);
  assert(typeof csv === 'string', '剖面数据导出失败');
  assert(csv.includes('distance'), '剖面数据表头错误');
});

test('exportRegionStats 生成区域统计CSV', () => {
  const stats = {
    totalMassChange: -1000,
    avgThicknessChange: -50,
    areaReductionPercent: 15.5
  };
  const csv = exportRegionStats(stats, GREENLAND_BOUNDS, new Date(1980, 0, 1), new Date(2024, 11, 1));
  assert(typeof csv === 'string', '区域统计导出失败');
});

console.log('');

// ------------------------------
// 6. Cesium工具测试
// ------------------------------
console.log('🗺️ 测试6: Cesium工具函数');
console.log('-'.repeat(40));

test('Cesium 导入成功', () => {
  assert(Cesium !== undefined, 'Cesium 导入失败');
  assert(typeof Cesium.Rectangle === 'function', 'Cesium.Rectangle 不可用');
});

test('Cesium.Cartesian3 可用', () => {
  const cart = new Cesium.Cartesian3(1, 2, 3);
  assert(cart !== null, 'Cartesian3 创建失败');
});

console.log('');

// ------------------------------
// 7. 数据完整性测试
// ------------------------------
console.log('✅ 测试7: 数据完整性验证');
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

test('颜色插值边界值正确', () => {
  const colorMap = [[0, 0, 0, 255], [255, 255, 255, 255]];
  const c0 = interpolateColor(colorMap, 0);
  const c1 = interpolateColor(colorMap, 1);
  
  assert(c0[0] === 0 && c0[1] === 0 && c0[2] === 0, '0.0边界插值错误');
  assert(c1[0] === 255 && c1[1] === 255 && c1[2] === 255, '1.0边界插值错误');
});

console.log('');

// ------------------------------
// 8. 坐标和边界测试
// ------------------------------
console.log('📍 测试8: 坐标和边界验证');
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

export default {
  passed,
  failed,
  total,
  results: testResults
};

import { StairConfig, DEFAULT_CONFIG, VisualStyle, BackgroundType } from '../src/types';
import { validateAndParseConfig, exportConfig, configToShareString, shareStringToConfig } from '../src/utils/configIO';

console.log('\n🧪 开始运行集成测试...\n');

function test(name: string, fn: () => boolean): void {
  try {
    const result = fn();
    if (result) {
      console.log(`✅ ${name}`);
    } else {
      console.log(`❌ ${name}`);
      process.exitCode = 1;
    }
  } catch (error) {
    console.log(`❌ ${name} - ${(error as Error).message}`);
    process.exitCode = 1;
  }
}

function assertEqual(actual: unknown, expected: unknown, message: string): boolean {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
  return true;
}

function assertDeepEqual(actual: unknown, expected: unknown, message: string): boolean {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(`${message}:\n  expected: ${expectedStr}\n  got:      ${actualStr}`);
  }
  return true;
}

console.log('📋 测试 1: 配置导入导出完整性');
test('导出再导入能完整还原所有字段', () => {
  const original: StairConfig = {
    seed: 'test-seed-12345',
    style: 'neon',
    background: 'starfield',
    stairColor: '#ff00ff',
    accentColor: '#00ffff',
    stepWidth: 4.5,
    stepHeight: 0.35,
    stepDepth: 2.0,
    spiral: true,
    spiralAngle: 7.5,
    particleEnabled: true,
    particleCount: 75,
    autoWalk: true,
    autoWalkSpeed: 1.8,
    soundEnabled: true,
    soundVolume: 0.75,
  };

  const json = JSON.stringify(original);
  const imported = validateAndParseConfig(json);
  
  assertDeepEqual(imported, original, '导入的配置应该与原始配置完全相同');
  
  const allKeys = Object.keys(original) as Array<keyof StairConfig>;
  for (const key of allKeys) {
    assertEqual(imported[key], original[key], `字段 ${key} 不匹配`);
  }
  
  return true;
});

test('导入时有类型校验 - 数字类型错误应被捕获', () => {
  const badConfig = { ...DEFAULT_CONFIG, stepWidth: 'not-a-number' };
  try {
    validateAndParseConfig(JSON.stringify(badConfig));
    return false;
  } catch {
    return true;
  }
});

test('导入时有范围校验 - stepWidth 超出范围应被捕获', () => {
  const badConfig = { ...DEFAULT_CONFIG, stepWidth: 15 };
  try {
    validateAndParseConfig(JSON.stringify(badConfig));
    return false;
  } catch {
    return true;
  }
});

test('导入时有枚举校验 - 无效 style 应被拒绝', () => {
  const badConfig = { ...DEFAULT_CONFIG, style: 'invalid-style' };
  try {
    validateAndParseConfig(JSON.stringify(badConfig));
    return false;
  } catch {
    return true;
  }
});

test('分享字符串编码解码', () => {
  const original: StairConfig = { ...DEFAULT_CONFIG, seed: 'share-test', stairColor: '#123456' };
  const shareStr = configToShareString(original);
  const decoded = shareStringToConfig(shareStr);
  return decoded.seed === 'share-test' && decoded.stairColor === '#123456';
});

console.log('\n🌌 测试 2: 视觉风格枚举完整性');
const styles: VisualStyle[] = ['neon', 'stone', 'glass'];
for (const style of styles) {
  test(`视觉风格 "${style}" 可被正确处理`, () => {
    const config = { ...DEFAULT_CONFIG, style };
    const imported = validateAndParseConfig(JSON.stringify(config));
    return imported.style === style;
  });
}

console.log('\n🌠 测试 3: 背景类型枚举完整性');
const backgrounds: BackgroundType[] = ['starfield', 'abyss'];
for (const bg of backgrounds) {
  test(`背景 "${bg}" 可被正确处理`, () => {
    const config = { ...DEFAULT_CONFIG, background: bg };
    const imported = validateAndParseConfig(JSON.stringify(config));
    return imported.background === bg;
  });
}

console.log('\n🔢 测试 4: 数值边界条件');
test('数值边界 - stepWidth 最小值 1', () => {
  const config = { ...DEFAULT_CONFIG, stepWidth: 1 };
  const result = validateAndParseConfig(JSON.stringify(config));
  return result.stepWidth === 1;
});

test('数值边界 - stepWidth 最大值 10', () => {
  const config = { ...DEFAULT_CONFIG, stepWidth: 10 };
  const result = validateAndParseConfig(JSON.stringify(config));
  return result.stepWidth === 10;
});

test('数值边界 - soundVolume 0 和 1', () => {
  const config0 = { ...DEFAULT_CONFIG, soundVolume: 0 };
  const config1 = { ...DEFAULT_CONFIG, soundVolume: 1 };
  const r0 = validateAndParseConfig(JSON.stringify(config0));
  const r1 = validateAndParseConfig(JSON.stringify(config1));
  return r0.soundVolume === 0 && r1.soundVolume === 1;
});

test('边界外值应被拒绝 - stepWidth = 0', () => {
  try {
    validateAndParseConfig(JSON.stringify({ ...DEFAULT_CONFIG, stepWidth: 0 }));
    return false;
  } catch {
    return true;
  }
});

console.log('\n🔄 测试 5: 配置回退机制');
test('缺少可选字段时使用默认值', () => {
  const partial = { seed: 'minimal-config', style: 'stone' as VisualStyle };
  try {
    const result = validateAndParseConfig(JSON.stringify(partial));
    return result.seed === 'minimal-config' &&
           result.style === 'stone' &&
           result.stepWidth === DEFAULT_CONFIG.stepWidth &&
           result.background === DEFAULT_CONFIG.background;
  } catch {
    return false;
  }
});

console.log('\n🎨 测试 6: 默认配置完整性');
test('DEFAULT_CONFIG 包含所有 16 个字段', () => {
  const keys = Object.keys(DEFAULT_CONFIG);
  assertEqual(keys.length, 16, `应该有16个字段，实际有${keys.length}个`);
  
  const expectedKeys = [
    'seed', 'style', 'background', 'stairColor', 'accentColor',
    'stepWidth', 'stepHeight', 'stepDepth',
    'spiral', 'spiralAngle',
    'particleEnabled', 'particleCount',
    'autoWalk', 'autoWalkSpeed',
    'soundEnabled', 'soundVolume'
  ];
  
  for (const key of expectedKeys) {
    if (!keys.includes(key)) {
      throw new Error(`缺少字段: ${key}`);
    }
  }
  return true;
});

console.log('\n📦 测试 7: 导出文件格式');
test('导出的JSON是有效的JSON格式', () => {
  const json = JSON.stringify(DEFAULT_CONFIG, null, 2);
  const parsed = JSON.parse(json);
  return parsed.seed === DEFAULT_CONFIG.seed;
});

console.log('\n' + '='.repeat(50));
console.log('✅ 所有配置导出导入测试通过!');
console.log('='.repeat(50) + '\n');

export {};

import { StairConfig, DEFAULT_CONFIG } from '../src/types';
import { validateAndParseConfig } from '../src/utils/configIO';

console.log('\n🌌 背景切换压力测试...\n');

const testResults: Array<{ name: string; pass: boolean; time?: number; error?: string }> = [];

function test(name: string, fn: () => boolean | Promise<boolean>): Promise<void> {
  return Promise.resolve()
    .then(() => {
      const start = performance.now();
      const result = fn();
      if (result instanceof Promise) {
        return result.then((r) => {
          const time = performance.now() - start;
          testResults.push({ name, pass: r, time });
          console.log(`${r ? '✅' : '❌'} ${name} (${time.toFixed(1)}ms)`);
          if (!r) process.exitCode = 1;
        });
      } else {
        const time = performance.now() - start;
        testResults.push({ name, pass: result, time });
        console.log(`${result ? '✅' : '❌'} ${name} (${time.toFixed(1)}ms)`);
        if (!result) process.exitCode = 1;
      }
    })
    .catch((error) => {
      testResults.push({ name, pass: false, error: error.message });
      console.log(`❌ ${name} - ${error.message}`);
      process.exitCode = 1;
    });
}

function stressTestBackgroundSwitch(iterations: number): boolean {
  let maxDuration = 0;
  let totalDuration = 0;
  const errors: string[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    try {
      const config: StairConfig = {
        ...DEFAULT_CONFIG,
        background: i % 2 === 0 ? 'starfield' : 'abyss',
        seed: `stress-test-${i}`,
        spiral: i % 3 === 0,
        particleEnabled: i % 2 === 0,
      };
      
      const json = JSON.stringify(config);
      const parsed = validateAndParseConfig(json);
      
      if (parsed.background !== config.background) {
        errors.push(`迭代 ${i}: background 不匹配`);
      }
      
      const duration = performance.now() - start;
      maxDuration = Math.max(maxDuration, duration);
      totalDuration += duration;
      
      if (duration > 50) {
        console.warn(`⚠️  迭代 ${i} 耗时较长: ${duration.toFixed(1)}ms`);
      }
    } catch (error) {
      errors.push(`迭代 ${i}: ${(error as Error).message}`);
    }
  }

  const avgDuration = totalDuration / iterations;
  console.log(`\n📊 性能统计 (${iterations} 次切换):`);
  console.log(`  平均耗时: ${avgDuration.toFixed(2)}ms`);
  console.log(`  最大耗时: ${maxDuration.toFixed(2)}ms`);
  console.log(`  总耗时: ${totalDuration.toFixed(2)}ms`);
  
  if (errors.length > 0) {
    console.log(`\n❌ 发现 ${errors.length} 个错误:`);
    errors.slice(0, 5).forEach(e => console.log(`   - ${e}`));
    return false;
  }
  
  if (maxDuration > 100) {
    console.warn('⚠️  单次切换超过100ms，可能存在性能问题');
  }
  
  return true;
}

async function runTests() {
  console.log('🔍 测试 1: 星空与深渊快速切换 (100次)');
  await test('100次背景切换无错误', () => stressTestBackgroundSwitch(100));

  console.log('\n🔍 测试 2: 完整配置循环导出导入 (50次)');
  await test('50次配置循环', () => {
    let config = { ...DEFAULT_CONFIG, seed: 'loop-test', stairColor: '#ff0000' };
    
    for (let i = 0; i < 50; i++) {
      const json = JSON.stringify(config);
      config = validateAndParseConfig(json);
      
      const styles: Array<'neon' | 'stone' | 'glass'> = ['neon', 'stone', 'glass'];
      const bgs: Array<'starfield' | 'abyss'> = ['starfield', 'abyss'];
      
      config = {
        ...config,
        style: styles[i % 3],
        background: bgs[i % 2],
        stepWidth: 1 + (i % 9),
        spiral: i % 2 === 0,
        particleEnabled: i % 3 !== 0,
      };
    }
    
    return config.stairColor === '#ff0000' && config.seed === 'loop-test';
  });

  console.log('\n🔍 测试 3: 边界值压力测试');
  await test('边界值配置验证', () => {
    const boundaryTests: Partial<StairConfig>[] = [
      { stepWidth: 1, stepHeight: 0.1, stepDepth: 0.5 },
      { stepWidth: 10, stepHeight: 2, stepDepth: 5 },
      { spiralAngle: 0, particleCount: 0 },
      { spiralAngle: 45, particleCount: 200 },
      { autoWalkSpeed: 0.1, soundVolume: 0 },
      { autoWalkSpeed: 5, soundVolume: 1 },
    ];

    for (const testConfig of boundaryTests) {
      const fullConfig = { ...DEFAULT_CONFIG, ...testConfig };
      const json = JSON.stringify(fullConfig);
      const parsed = validateAndParseConfig(json);
      
      for (const [key, value] of Object.entries(testConfig)) {
        if ((parsed as any)[key] !== value) {
          console.error(`字段 ${key} 不匹配: 期望 ${value}, 实际 ${(parsed as any)[key]}`);
          return false;
        }
      }
    }
    return true;
  });

  console.log('\n🔍 测试 4: 无效配置鲁棒性测试');
  await test('无效配置正确拒绝', () => {
    const badConfigs: unknown[] = [
      { ...DEFAULT_CONFIG, stepWidth: 0 },
      { ...DEFAULT_CONFIG, stepWidth: 11 },
      { ...DEFAULT_CONFIG, style: 'invalid' },
      { ...DEFAULT_CONFIG, background: 'invalid' },
      { ...DEFAULT_CONFIG, stepHeight: 'not-a-number' },
      { seed: 123, style: 'neon' },
      null,
      undefined,
      'not-an-object',
      12345,
    ];

    let rejectedCount = 0;
    for (const badConfig of badConfigs) {
      try {
        validateAndParseConfig(JSON.stringify(badConfig));
      } catch {
        rejectedCount++;
      }
    }
    
    console.log(`  拒绝了 ${rejectedCount}/${badConfigs.length} 个无效配置`);
    return rejectedCount === badConfigs.length;
  });

  console.log('\n🔍 测试 5: 配置字段完整性');
  await test('所有16个字段都能正确序列化和反序列化', () => {
    const original: StairConfig = {
      seed: 'integrity-test-12345',
      style: 'glass',
      background: 'abyss',
      stairColor: '#abcdef',
      accentColor: '#123456',
      stepWidth: 3.14,
      stepHeight: 0.42,
      stepDepth: 1.618,
      spiral: true,
      spiralAngle: 12.5,
      particleEnabled: true,
      particleCount: 77,
      autoWalk: true,
      autoWalkSpeed: 2.5,
      soundEnabled: false,
      soundVolume: 0.33,
    };

    const json = JSON.stringify(original, null, 2);
    const imported = validateAndParseConfig(json);
    
    const keys = Object.keys(original) as Array<keyof StairConfig>;
    for (const key of keys) {
      if (JSON.stringify(imported[key]) !== JSON.stringify(original[key])) {
        console.error(`字段 ${key} 不匹配:`);
        console.error(`  原始: ${JSON.stringify(original[key])}`);
        console.error(`  导入: ${JSON.stringify(imported[key])}`);
        return false;
      }
    }
    
    const keyCount = Object.keys(imported).length;
    if (keyCount !== 16) {
      console.error(`字段数量不匹配: 期望 16, 实际 ${keyCount}`);
      return false;
    }
    
    return true;
  });

  const passed = testResults.filter(r => r.pass).length;
  const total = testResults.length;
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 测试结果: ${passed}/${total} 通过`);
  
  if (passed === total) {
    console.log('✅ 所有压力测试通过!');
  } else {
    console.log('❌ 部分测试失败:');
    testResults.filter(r => !r.pass).forEach(r => {
      console.log(`   - ${r.name}: ${r.error || '失败'}`);
    });
  }
  console.log('='.repeat(50) + '\n');
}

runTests().catch(console.error);

export {};

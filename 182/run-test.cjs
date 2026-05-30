const { createRequire } = require('module');
const require = createRequire(import.meta.url);

async function runTest() {
  const { createInitialPieces, applyMove, checkSolved, solvePyraminx, countCorrectTips, countCorrectEdges, shufflePieces } = await import('./src/engine/pyraminxEngine.ts');
  
  console.log('=== 测试复原算法 ===\n');
  
  // 测试1: 简单情况
  console.log('测试1: U face顺时针1次');
  let test1 = createInitialPieces();
  test1 = applyMove(test1, 'U', 'clockwise', 'face');
  console.log('  打乱后: tip=' + countCorrectTips(test1) + '/4, edge=' + countCorrectEdges(test1) + '/6');
  
  const start1 = Date.now();
  const result1 = solvePyraminx(test1);
  const time1 = Date.now() - start1;
  
  console.log('  结果: 步数=' + result1.moves.length + ', 耗时=' + time1 + 'ms, 成功=' + checkSolved(result1.pieces));
  if (result1.moves.length > 0) {
    console.log('  步骤: ' + result1.moves.map(m => m.face + '-' + m.type + '-' + (m.direction === 'clockwise' ? 'CW' : 'CCW')).join(', '));
  }
  console.log();
  
  // 测试2: 复杂情况
  console.log('测试2: 多种转动组合');
  let test2 = createInitialPieces();
  test2 = applyMove(test2, 'U', 'clockwise', 'face');
  test2 = applyMove(test2, 'R', 'counterclockwise', 'tip');
  test2 = applyMove(test2, 'L', 'clockwise', 'middle');
  test2 = applyMove(test2, 'B', 'counterclockwise', 'face');
  console.log('  打乱后: tip=' + countCorrectTips(test2) + '/4, edge=' + countCorrectEdges(test2) + '/6');
  
  const start2 = Date.now();
  const result2 = solvePyraminx(test2);
  const time2 = Date.now() - start2;
  
  console.log('  结果: 步数=' + result2.moves.length + ', 耗时=' + time2 + 'ms, 成功=' + checkSolved(result2.pieces));
  console.log();
  
  // 测试3: 5次随机测试
  console.log('测试3: 5次随机打乱（20步）');
  let success = 0;
  let totalSteps = 0;
  let totalTime = 0;
  
  for (let i = 0; i < 5; i++) {
    const shuffle = shufflePieces(createInitialPieces(), 20);
    const start = Date.now();
    const result = solvePyraminx(shuffle.pieces);
    const time = Date.now() - start;
    const solved = checkSolved(result.pieces);
    
    console.log('  测试' + (i+1) + ': 步数=' + result.moves.length + ', 耗时=' + time + 'ms, 成功=' + solved);
    
    if (solved) {
      success++;
      totalSteps += result.moves.length;
      totalTime += time;
    }
  }
  
  console.log('\n  成功率: ' + success + '/5');
  if (success > 0) {
    console.log('  平均成功步数: ' + (totalSteps / success).toFixed(1));
    console.log('  平均成功耗时: ' + (totalTime / success).toFixed(0) + 'ms');
  }
  
  console.log('\n=== 测试结束 ===');
}

runTest().catch(console.error);

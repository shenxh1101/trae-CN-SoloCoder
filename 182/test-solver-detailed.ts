import { createInitialPieces, applyMove, checkSolved, solvePyraminx, countCorrectTips, countCorrectEdges } from './src/engine/pyraminxEngine.ts';
import { Piece, Face, Direction, MoveType, Move } from './src/types/index.ts';

console.log('=== 详细测试复原算法 ===\n');

// 测试1: 简单情况 - 只旋转U face一次
console.log('测试1: 只旋转U face顺时针1次');
let test1 = createInitialPieces();
test1 = applyMove(test1, 'U', 'clockwise', 'face');
console.log('  打乱后已复原:', checkSolved(test1));
console.log('  正确tip数:', countCorrectTips(test1), '/ 4');
console.log('  正确edge数:', countCorrectEdges(test1), '/ 6');
console.log('  正在计算复原...');
console.time('  复原耗时');
const result1 = solvePyraminx(test1);
console.timeEnd('  复原耗时');
console.log('  复原步数:', result1.moves.length);
console.log('  复原步骤:', result1.moves.map(m => `${m.face}-${m.type}-${m.direction}`).join(', '));
console.log('  复原后已复原:', checkSolved(result1.pieces));
console.log('  复原后正确tip数:', countCorrectTips(result1.pieces), '/ 4');
console.log('  复原后正确edge数:', countCorrectEdges(result1.pieces), '/ 6');
console.log();

// 测试2: 只旋转U tip + U face
console.log('测试2: U tip顺时针 + U face顺时针');
let test2 = createInitialPieces();
test2 = applyMove(test2, 'U', 'clockwise', 'tip');
test2 = applyMove(test2, 'U', 'clockwise', 'face');
console.log('  打乱后已复原:', checkSolved(test2));
console.log('  正确tip数:', countCorrectTips(test2), '/ 4');
console.log('  正确edge数:', countCorrectEdges(test2), '/ 6');
console.log('  正在计算复原...');
console.time('  复原耗时');
const result2 = solvePyraminx(test2);
console.timeEnd('  复原耗时');
console.log('  复原步数:', result2.moves.length);
console.log('  复原后已复原:', checkSolved(result2.pieces));
console.log();

// 测试3: 随机打乱（包含face）5次测试
console.log('测试3: 随机打乱（包含face）20步，5次测试');
let success = 0;
let totalSteps = 0;
for (let i = 0; i < 5; i++) {
  let test = createInitialPieces();
  const faces: Face[] = ['U', 'R', 'L', 'B'];
  const types: MoveType[] = ['tip', 'middle', 'face'];
  const dirs: Direction[] = ['clockwise', 'counterclockwise'];
  
  const shuffleMoves: Move[] = [];
  for (let j = 0; j < 20; j++) {
    const f = faces[Math.floor(Math.random() * faces.length)];
    const t = types[Math.floor(Math.random() * types.length)];
    const d = dirs[Math.floor(Math.random() * dirs.length)];
    test = applyMove(test, f, d, t);
    shuffleMoves.push({ face: f, type: t, direction: d });
  }
  
  console.log(`  测试${i+1}: 打乱步数=${shuffleMoves.length}, 已复原=${checkSolved(test)}`);
  console.log(`    正确tip=${countCorrectTips(test)}/4, 正确edge=${countCorrectEdges(test)}/6`);
  
  const result = solvePyraminx(test);
  const solved = checkSolved(result.pieces);
  console.log(`    复原步数=${result.moves.length}, 成功=${solved}`);
  
  if (solved) {
    success++;
    totalSteps += result.moves.length;
  }
}
console.log(`  成功率: ${success}/5`);
if (success > 0) {
  console.log(`  平均成功步数: ${(totalSteps / success).toFixed(1)}`);
}
console.log();

// 测试4: 分析一个具体失败案例
console.log('测试4: 分析一个失败案例');
let test4 = createInitialPieces();
// 手动构造一个包含face转动的打乱
test4 = applyMove(test4, 'U', 'clockwise', 'face');
test4 = applyMove(test4, 'R', 'counterclockwise', 'face');
test4 = applyMove(test4, 'U', 'clockwise', 'tip');
test4 = applyMove(test4, 'R', 'clockwise', 'middle');
test4 = applyMove(test4, 'L', 'counterclockwise', 'face');

console.log('  初始打乱后:');
console.log('    已复原:', checkSolved(test4));
console.log('    正确tip:', countCorrectTips(test4), '/ 4');
console.log('    正确edge:', countCorrectEdges(test4), '/ 6');

// 打印每个tip的状态
console.log('  Tip状态:');
test4.filter(p => p.type === 'tip').forEach(p => {
  const posDist = Math.sqrt(
    Math.pow(p.position[0] - p.homePosition[0], 2) +
    Math.pow(p.position[1] - p.homePosition[1], 2) +
    Math.pow(p.position[2] - p.homePosition[2], 2)
  );
  console.log(`    ${p.id}: posDist=${posDist.toFixed(3)}, position=(${p.position.map(v => v.toFixed(2)).join(', ')})`);
  console.log(`      home=(${p.homePosition.map(v => v.toFixed(2)).join(', ')})`);
});

console.log('  正在计算复原...');
const result4 = solvePyraminx(test4);
console.log('  复原后:');
console.log('    已复原:', checkSolved(result4.pieces));
console.log('    正确tip:', countCorrectTips(result4.pieces), '/ 4');
console.log('    正确edge:', countCorrectEdges(result4.pieces), '/ 6');
console.log('    步数:', result4.moves.length);

console.log('\n=== 测试结束 ===');

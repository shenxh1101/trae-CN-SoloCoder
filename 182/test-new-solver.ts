import { createInitialPieces, applyMove, checkSolved, solvePyraminx, countCorrectTips, countCorrectEdges, shufflePieces } from './src/engine/pyraminxEngine.ts';
import { Piece, Face, Direction, MoveType, Move } from './src/types/index.ts';

console.log('=== 测试新四阶段复原算法 ===\n');

// 测试1: 简单情况 - 只旋转U face一次
console.log('测试1: 只旋转U face顺时针1次');
let test1 = createInitialPieces();
test1 = applyMove(test1, 'U', 'clockwise', 'face');
console.log('  打乱后已复原:', checkSolved(test1));
console.log('  正确tip:', countCorrectTips(test1), '/ 4');
console.log('  正确edge:', countCorrectEdges(test1), '/ 6');
console.log('  正在计算复原...');
console.time('  复原耗时');
const result1 = solvePyraminx(test1);
console.timeEnd('  复原耗时');
console.log('  复原步数:', result1.moves.length);
console.log('  复原步骤:', result1.moves.map(m => `${m.face}-${m.type}-${m.direction === 'clockwise' ? 'CW' : 'CCW'}`).join(', '));
console.log('  复原后已复原:', checkSolved(result1.pieces));
console.log('  复原后正确tip:', countCorrectTips(result1.pieces), '/ 4');
console.log('  复原后正确edge:', countCorrectEdges(result1.pieces), '/ 6');
console.log();

// 测试2: 包含多种转动的打乱
console.log('测试2: 复杂打乱 - U face + R tip + L middle');
let test2 = createInitialPieces();
test2 = applyMove(test2, 'U', 'clockwise', 'face');
test2 = applyMove(test2, 'R', 'counterclockwise', 'tip');
test2 = applyMove(test2, 'L', 'clockwise', 'middle');
test2 = applyMove(test2, 'B', 'counterclockwise', 'face');
console.log('  打乱后已复原:', checkSolved(test2));
console.log('  正确tip:', countCorrectTips(test2), '/ 4');
console.log('  正确edge:', countCorrectEdges(test2), '/ 6');
console.log('  正在计算复原...');
console.time('  复原耗时');
const result2 = solvePyraminx(test2);
console.timeEnd('  复原耗时');
console.log('  复原步数:', result2.moves.length);
console.log('  复原后已复原:', checkSolved(result2.pieces));
console.log();

// 测试3: 随机打乱10次测试
console.log('测试3: 随机打乱20步，10次测试');
let success = 0;
let totalSteps = 0;
let totalTime = 0;

for (let i = 0; i < 10; i++) {
  let test = createInitialPieces();
  const shuffleResult = shufflePieces(test, 20);
  
  console.log(`  测试${i+1}: 打乱步数=${shuffleResult.moves.length}`);
  console.log(`    初始: tip=${countCorrectTips(shuffleResult.pieces)}/4, edge=${countCorrectEdges(shuffleResult.pieces)}/6, solved=${checkSolved(shuffleResult.pieces)}`);
  
  const start = Date.now();
  const result = solvePyraminx(shuffleResult.pieces);
  const time = Date.now() - start;
  
  const solved = checkSolved(result.pieces);
  console.log(`    结果: 步数=${result.moves.length}, 耗时=${time}ms, 成功=${solved}`);
  
  if (solved) {
    success++;
    totalSteps += result.moves.length;
    totalTime += time;
  }
}

console.log(`\n  成功率: ${success}/10 (${(success/10*100).toFixed(0)}%)`);
if (success > 0) {
  console.log(`  平均成功步数: ${(totalSteps / success).toFixed(1)}`);
  console.log(`  平均成功耗时: ${(totalTime / success).toFixed(0)}ms`);
}
console.log();

// 测试4: 极端情况 - 只用face转动打乱
console.log('测试4: 只用face转动打乱（最难的情况）');
let test4 = createInitialPieces();
const faces: Face[] = ['U', 'R', 'L', 'B'];
const dirs: Direction[] = ['clockwise', 'counterclockwise'];
const faceMoves: Move[] = [];
for (let i = 0; i < 15; i++) {
  const f = faces[Math.floor(Math.random() * faces.length)];
  const d = dirs[Math.floor(Math.random() * dirs.length)];
  test4 = applyMove(test4, f, d, 'face');
  faceMoves.push({ face: f, direction: d, type: 'face' });
}
console.log(`  打乱步数: ${faceMoves.length} (全face转动)`);
console.log(`  正确tip: ${countCorrectTips(test4)}/4, 正确edge: ${countCorrectEdges(test4)}/6`);
console.log('  正在计算复原...');
console.time('  复原耗时');
const result4 = solvePyraminx(test4);
console.timeEnd('  复原耗时');
console.log('  复原步数:', result4.moves.length);
console.log('  复原后已复原:', checkSolved(result4.pieces));
console.log();

console.log('=== 测试结束 ===');

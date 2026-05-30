import { createInitialPieces, applyMove, checkSolved, solvePyraminx } from './src/engine/pyraminxEngine';
import { Face, Direction, MoveType, Move } from './src/types';

console.log('=== 测试face转动的复原 ===\n');

// 测试: 只有一次face转动
console.log('测试: 只有1次U-face顺时针转动');
let test = createInitialPieces();
test = applyMove(test, 'U', 'clockwise', 'face');
console.log('  打乱后已复原:', checkSolved(test));

// 检查哪些块被移动了
console.log('  检查块位置变化:');
test.forEach((piece, i) => {
  const initial = createInitialPieces()[i];
  const dist = Math.sqrt(
    Math.pow(piece.position[0] - initial.position[0], 2) +
    Math.pow(piece.position[1] - initial.position[1], 2) +
    Math.pow(piece.position[2] - initial.position[2], 2)
  );
  if (dist > 0.1) {
    console.log(`    ${piece.id} (${piece.type}): 移动了 ${dist.toFixed(2)}`);
  }
});

console.log('  正在计算复原...');
const result = solvePyraminx(test);
console.log('  复原步数:', result.moves.length);
console.log('  复原步骤:', result.moves.map(m => `${m.face}-${m.type}-${m.direction}`).join(', '));
console.log('  复原后已复原:', checkSolved(result.pieces));
console.log();

// 测试: 两次face转动
console.log('测试: U-face顺时针 + R-face顺时针');
let test2 = createInitialPieces();
test2 = applyMove(test2, 'U', 'clockwise', 'face');
test2 = applyMove(test2, 'R', 'clockwise', 'face');
console.log('  打乱后已复原:', checkSolved(test2));
console.log('  正在计算复原...');
const result2 = solvePyraminx(test2);
console.log('  复原步数:', result2.moves.length);
console.log('  复原后已复原:', checkSolved(result2.pieces));
console.log();

// 测试: 只用face转动打乱（5步）
console.log('测试: 只用face转动打乱（5步）');
let test3 = createInitialPieces();
const faces: Face[] = ['U', 'R', 'L', 'B'];
const dirs: Direction[] = ['clockwise', 'counterclockwise'];
const moves: Move[] = [];
for (let i = 0; i < 5; i++) {
  const f = faces[Math.floor(Math.random() * faces.length)];
  const d = dirs[Math.floor(Math.random() * dirs.length)];
  test3 = applyMove(test3, f, d, 'face');
  moves.push({ face: f, direction: d, type: 'face' });
}
console.log('  打乱步骤:', moves.map(m => `${m.face}-${m.type}-${m.direction}`).join(', '));
console.log('  打乱后已复原:', checkSolved(test3));
console.log('  正在计算复原...');
const result3 = solvePyraminx(test3);
console.log('  复原步数:', result3.moves.length);
console.log('  复原后已复原:', checkSolved(result3.pieces));

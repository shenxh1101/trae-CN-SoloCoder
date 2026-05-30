import { createInitialPieces, applyMove, checkSolved, shufflePieces, solvePyraminx, generateSolution } from './src/engine/pyraminxEngine';
import { Piece, Face, Direction, MoveType, Move } from './src/types';

console.log('=== 调试复原算法 ===\n');

// 测试1: 只用tip和middle打乱（不移动tip位置）
console.log('测试1: 只用tip和middle打乱（10步）');
let initial = createInitialPieces();
let shuffled1 = JSON.parse(JSON.stringify(initial));
const moves1: Move[] = [];
const faces: Face[] = ['U', 'R', 'L', 'B'];
const dirs: Direction[] = ['clockwise', 'counterclockwise'];
const types1: MoveType[] = ['tip', 'middle'];

for (let i = 0; i < 10; i++) {
  const f = faces[Math.floor(Math.random() * faces.length)];
  const d = dirs[Math.floor(Math.random() * dirs.length)];
  const t = types1[Math.floor(Math.random() * types1.length)];
  shuffled1 = applyMove(shuffled1, f, d, t);
  moves1.push({ face: f, direction: d, type: t });
}

console.log('  打乱步骤:', moves1.map(m => `${m.face}-${m.type}-${m.direction}`).join(', '));
console.log('  打乱后已复原:', checkSolved(shuffled1));
console.log('  正在计算复原...');
const result1 = solvePyraminx(shuffled1);
console.log('  复原步数:', result1.moves.length);
console.log('  复原后已复原:', checkSolved(result1.pieces));
console.log();

// 测试2: 手动测试一个简单情况 - 只旋转U tip一次
console.log('测试2: 简单情况 - 只旋转U tip顺时针1次');
let test2 = createInitialPieces();
test2 = applyMove(test2, 'U', 'clockwise', 'tip');
console.log('  打乱后已复原:', checkSolved(test2));
console.log('  正在计算复原...');
const result2 = solvePyraminx(test2);
console.log('  复原步数:', result2.moves.length);
console.log('  复原步骤:', result2.moves.map(m => `${m.face}-${m.type}-${m.direction}`).join(', '));
console.log('  复原后已复原:', checkSolved(result2.pieces));
console.log();

// 测试3: 手动测试 - 旋转U tip和U middle各一次
console.log('测试3: 旋转U tip顺时针 + U middle顺时针');
let test3 = createInitialPieces();
test3 = applyMove(test3, 'U', 'clockwise', 'tip');
test3 = applyMove(test3, 'U', 'clockwise', 'middle');
console.log('  打乱后已复原:', checkSolved(test3));
console.log('  正在计算复原...');
const result3 = solvePyraminx(test3);
console.log('  复原步数:', result3.moves.length);
console.log('  复原步骤:', result3.moves.map(m => `${m.face}-${m.type}-${m.direction}`).join(', '));
console.log('  复原后已复原:', checkSolved(result3.pieces));
console.log();

// 测试4: 检查评分函数
console.log('测试4: 检查评分函数');
let test4 = createInitialPieces();
const evaluatePieces = (pieces: Piece[]): number => {
  let score = 0;
  const tipBonus = pieces.filter(p => p.type === 'tip').every(piece => {
    const posDist = Math.sqrt(
      Math.pow(piece.position[0] - piece.homePosition[0], 2) +
      Math.pow(piece.position[1] - piece.homePosition[1], 2) +
      Math.pow(piece.position[2] - piece.homePosition[2], 2)
    );
    if (posDist > 0.01) return false;
    for (let i = 0; i < piece.facelets.length; i++) {
      if (piece.facelets[i].face !== piece.homeFacelets[i].face ||
          piece.facelets[i].color !== piece.homeFacelets[i].color) {
        return false;
      }
    }
    return true;
  }) ? -10000 : 0;
  
  const edgeBonus = pieces.filter(p => p.type === 'edge').every(piece => {
    const posDist = Math.sqrt(
      Math.pow(piece.position[0] - piece.homePosition[0], 2) +
      Math.pow(piece.position[1] - piece.homePosition[1], 2) +
      Math.pow(piece.position[2] - piece.homePosition[2], 2)
    );
    if (posDist > 0.01) return false;
    for (let i = 0; i < piece.facelets.length; i++) {
      if (piece.facelets[i].face !== piece.homeFacelets[i].face ||
          piece.facelets[i].color !== piece.homeFacelets[i].color) {
        return false;
      }
    }
    return true;
  }) ? -5000 : 0;
  
  for (const piece of pieces) {
    const posDist = Math.sqrt(
      Math.pow(piece.position[0] - piece.homePosition[0], 2) +
      Math.pow(piece.position[1] - piece.homePosition[1], 2) +
      Math.pow(piece.position[2] - piece.homePosition[2], 2)
    );
    score += posDist * 100;
    
    for (let i = 0; i < piece.facelets.length; i++) {
      const current = piece.facelets[i];
      const home = piece.homeFacelets[i];
      if (current.face !== home.face) score += 50;
      if (current.color !== home.color) score += 40;
    }
  }
  
  return score + tipBonus + edgeBonus;
};

console.log('  初始状态评分:', evaluatePieces(test4));
let test4b = applyMove(JSON.parse(JSON.stringify(test4)), 'U', 'clockwise', 'tip');
console.log('  U tip顺时针后评分:', evaluatePieces(test4b));
let test4c = applyMove(JSON.parse(JSON.stringify(test4b)), 'U', 'counterclockwise', 'tip');
console.log('  再逆时针后评分:', evaluatePieces(test4c));
console.log('  是否复原:', checkSolved(test4c));
console.log();

// 测试5: 检查facelet置换是否正确
console.log('测试5: 检查facelet置换');
let test5 = createInitialPieces();
console.log('  初始U tip的facelet:');
const tipU = test5.find(p => p.id === 'tip-0')!;
tipU.facelets.forEach((f, i) => console.log(`    ${i}: face=${f.face}, color=${f.color}, pos=${f.position}`));

let test5b = applyMove(JSON.parse(JSON.stringify(test5)), 'U', 'clockwise', 'tip');
const tipU2 = test5b.find(p => p.id === 'tip-0')!;
console.log('  U tip顺时针后facelet:');
tipU2.facelets.forEach((f, i) => console.log(`    ${i}: face=${f.face}, color=${f.color}, pos=${f.position}`));

let test5c = applyMove(JSON.parse(JSON.stringify(test5b)), 'U', 'clockwise', 'tip');
let test5d = applyMove(JSON.parse(JSON.stringify(test5c)), 'U', 'clockwise', 'tip');
const tipU3 = test5d.find(p => p.id === 'tip-0')!;
console.log('  旋转3次后facelet:');
tipU3.facelets.forEach((f, i) => console.log(`    ${i}: face=${f.face}, color=${f.color}, pos=${f.position}`));
console.log('  是否复原:', checkSolved(test5d));
console.log();

console.log('=== 调试结束 ===');

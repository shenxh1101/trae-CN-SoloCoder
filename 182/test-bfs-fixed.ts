import { createInitialPieces, applyMove, checkSolved, countCorrectTips, countCorrectEdges, shufflePieces, solvePyraminx } from './src/engine/pyraminxEngine';
import { TETRAHEDRON_VERTICES } from './src/types';
import type { Piece, Face, Direction, MoveType, Move } from './src/types';

const SCALE = 1.5;

function getClosestVertex(position: [number, number, number]): Face {
  const v = TETRAHEDRON_VERTICES;
  const faces: Face[] = ['U', 'R', 'L', 'B'];
  let minDist = Infinity;
  let closest: Face = 'U';
  
  for (const face of faces) {
    const vertex = v[face];
    const dist = Math.sqrt(
      Math.pow(position[0] - vertex[0] * SCALE, 2) +
      Math.pow(position[1] - vertex[1] * SCALE, 2) +
      Math.pow(position[2] - vertex[2] * SCALE, 2)
    );
    if (dist < minDist) {
      minDist = dist;
      closest = face;
    }
  }
  
  return closest;
}

function getTipPositionHash(pieces: Piece[]): string {
  return pieces.filter(p => p.type === 'tip').sort((a, b) => a.id.localeCompare(b.id)).map(p => {
    const vertex = getClosestVertex(p.position);
    return `${p.id}:${vertex}`;
  }).join('|');
}

function isTipPositionSolved(pieces: Piece[]): boolean {
  return pieces.filter(p => p.type === 'tip').every(piece => {
    const posDist = Math.sqrt(
      Math.pow(piece.position[0] - piece.homePosition[0], 2) +
      Math.pow(piece.position[1] - piece.homePosition[1], 2) +
      Math.pow(piece.position[2] - piece.homePosition[2], 2)
    );
    return posDist < 0.01;
  });
}

console.log('=== Test Fixed BFS ===\n');

// 测试hash函数
const test = createInitialPieces();
console.log('Initial tip hash:', getTipPositionHash(test));
console.log('Initial tip positions:');
test.filter(p => p.type === 'tip').forEach(p => {
  console.log(`  ${p.id}: closest=${getClosestVertex(p.position)}, homePos=${getClosestVertex(p.homePosition)}`);
});
console.log();

// 测试1: 简单情况
console.log('Test 1: U face clockwise once');
let test1 = createInitialPieces();
test1 = applyMove(test1, 'U', 'clockwise', 'face');
console.log('  Hash after U face CW:', getTipPositionHash(test1));
console.log('  Tip positions:');
test1.filter(p => p.type === 'tip').forEach(p => {
  console.log(`    ${p.id}: closest=${getClosestVertex(p.position)}`);
});
console.log();

// 测试2: 随机打乱后的solvePyraminx
console.log('Test 2: Full solvePyraminx with random shuffle (20 moves)');
const shuffled = shufflePieces(createInitialPieces(), 20);
console.log('  Initial tips:', countCorrectTips(shuffled.pieces), '/4');
console.log('  Initial edges:', countCorrectEdges(shuffled.pieces), '/6');
console.log('  Initial hash:', getTipPositionHash(shuffled.pieces));
console.log('  Solving...');

const start = Date.now();
const result = solvePyraminx(shuffled.pieces);
const time = Date.now() - start;

console.log('  Result:');
console.log('    Steps:', result.moves.length);
console.log('    Time:', time, 'ms');
console.log('    Solved:', checkSolved(result.pieces));
console.log('    Final tips:', countCorrectTips(result.pieces), '/4');
console.log('    Final edges:', countCorrectEdges(result.pieces), '/6');

if (result.moves.length > 0) {
  console.log('\n  Solution:');
  result.moves.forEach((m, i) => {
    console.log(`    ${i+1}. ${m.face} ${m.type} ${m.direction}`);
  });
}

// 验证解法
if (result.moves.length > 0) {
  console.log('\n  Verifying solution:');
  let verify = JSON.parse(JSON.stringify(shuffled.pieces));
  let allCorrect = true;
  result.moves.forEach((move, i) => {
    verify = applyMove(verify, move.face, move.direction, move.type);
  });
  const verified = checkSolved(verify);
  console.log(`    Verification: ${verified ? 'PASS' : 'FAIL'}`);
}

console.log('\n=== Test Complete ===');

import { createInitialPieces, applyMove, checkSolved, countCorrectTips, countCorrectEdges, shufflePieces, solvePyraminx } from './src/engine/pyraminxEngine';
import type { Piece, Face, Direction, MoveType, Move } from './src/types';

function getTipLocationIndex(pieces: Piece[], pieceId: string): number {
  const tipPieces = pieces.filter(p => p.type === 'tip');
  const piece = tipPieces.find(p => p.id === pieceId);
  if (!piece) return -1;
  
  let minDist = Infinity;
  let minIndex = -1;
  
  tipPieces.forEach((p, index) => {
    const dist = Math.sqrt(
      Math.pow(piece.position[0] - p.homePosition[0], 2) +
      Math.pow(piece.position[1] - p.homePosition[1], 2) +
      Math.pow(piece.position[2] - p.homePosition[2], 2)
    );
    if (dist < minDist) {
      minDist = dist;
      minIndex = index;
    }
  });
  
  return minIndex;
}

function getTipPositionHash(pieces: Piece[]): string {
  const tipPieces = pieces.filter(p => p.type === 'tip').sort((a, b) => a.id.localeCompare(b.id));
  return tipPieces.map(p => {
    const locIndex = getTipLocationIndex(pieces, p.id);
    return `${p.id}:${locIndex}`;
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

console.log('=== Debug BFS v2 ===\n');

// 测试hash函数
const test = createInitialPieces();
console.log('Initial tip hash:', getTipPositionHash(test));
console.log('Initial isTipPositionSolved:', isTipPositionSolved(test));
console.log();

// 测试U face转动后的hash
let test1 = createInitialPieces();
test1 = applyMove(test1, 'U', 'clockwise', 'face');
console.log('After U face CW:');
console.log('  Hash:', getTipPositionHash(test1));
console.log('  isTipPositionSolved:', isTipPositionSolved(test1));
console.log('  Tip positions:');
test1.filter(p => p.type === 'tip').forEach(p => {
  const locIdx = getTipLocationIndex(test1, p.id);
  const homeIdx = test1.filter(p2 => p2.type === 'tip').sort((a, b) => a.id.localeCompare(b.id)).findIndex(p2 => p2.id === p.id);
  console.log(`    ${p.id}: locIndex=${locIdx}, homeIndex=${homeIdx}`);
});
console.log();

// 测试3次转动后回到原位
let test2 = createInitialPieces();
test2 = applyMove(test2, 'U', 'clockwise', 'face');
test2 = applyMove(test2, 'U', 'clockwise', 'face');
test2 = applyMove(test2, 'U', 'clockwise', 'face');
console.log('After 3x U face CW:');
console.log('  Hash:', getTipPositionHash(test2));
console.log('  isTipPositionSolved:', isTipPositionSolved(test2));
console.log('  checkSolved:', checkSolved(test2));
console.log();

// 测试solvePyraminx
console.log('Testing solvePyraminx with random shuffle (15 moves)...');
const shuffled = shufflePieces(createInitialPieces(), 15);
console.log('Shuffled state:');
console.log('  Tips:', countCorrectTips(shuffled.pieces), '/4');
console.log('  Edges:', countCorrectEdges(shuffled.pieces), '/6');
console.log('  Hash:', getTipPositionHash(shuffled.pieces));
console.log();

const start = Date.now();
const result = solvePyraminx(shuffled.pieces);
const time = Date.now() - start;

console.log('Result:');
console.log('  Steps:', result.moves.length);
console.log('  Time:', time, 'ms');
console.log('  Solved:', checkSolved(result.pieces));
console.log('  Tips:', countCorrectTips(result.pieces), '/4');
console.log('  Edges:', countCorrectEdges(result.pieces), '/6');

if (result.moves.length > 0) {
  console.log('\nSolution:');
  result.moves.forEach((m, i) => {
    console.log(`  ${i+1}. ${m.face} ${m.type} ${m.direction}`);
  });
  
  // 验证
  console.log('\nVerification:');
  let verify = JSON.parse(JSON.stringify(shuffled.pieces));
  result.moves.forEach((move, i) => {
    verify = applyMove(verify, move.face, move.direction, move.type);
  });
  console.log('  Verified:', checkSolved(verify) ? 'PASS' : 'FAIL');
}

console.log('\n=== Done ===');

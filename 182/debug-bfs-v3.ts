import { createInitialPieces, applyMove, checkSolved, countCorrectTips, countCorrectEdges, shufflePieces, solvePyraminx } from './src/engine/pyraminxEngine';
import type { Piece, Face, Direction, MoveType, Move } from './src/types';

function permute<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    const perms = permute(rest);
    for (const perm of perms) {
      result.push([arr[i], ...perm]);
    }
  }
  return result;
}

function getTipPositionHash(pieces: Piece[]): string {
  const tipPieces = pieces.filter(p => p.type === 'tip').sort((a, b) => a.id.localeCompare(b.id));
  const homePositions = tipPieces.map(p => p.homePosition);
  const n = tipPieces.length;
  
  const indices = Array.from({ length: n }, (_, i) => i);
  const allPermutations = permute(indices);
  
  let bestPermutation: number[] = indices;
  let bestTotalDist = Infinity;
  
  for (const perm of allPermutations) {
    let totalDist = 0;
    for (let i = 0; i < n; i++) {
      const piece = tipPieces[i];
      const homePos = homePositions[perm[i]];
      const dist = Math.sqrt(
        Math.pow(piece.position[0] - homePos[0], 2) +
        Math.pow(piece.position[1] - homePos[1], 2) +
        Math.pow(piece.position[2] - homePos[2], 2)
      );
      totalDist += dist;
    }
    if (totalDist < bestTotalDist) {
      bestTotalDist = totalDist;
      bestPermutation = perm;
    }
  }
  
  return tipPieces.map((p, i) => `${p.id}:${bestPermutation[i]}`).join('|');
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

console.log('=== Debug BFS v3 ===\n');

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
console.log('  Tip permutation:');
const tipPieces = test1.filter(p => p.type === 'tip').sort((a, b) => a.id.localeCompare(b.id));
const hashParts = getTipPositionHash(test1).split('|');
hashParts.forEach((part, i) => {
  const [id, locIdx] = part.split(':');
  const piece = tipPieces[i];
  const posDist = Math.sqrt(
    Math.pow(piece.position[0] - piece.homePosition[0], 2) +
    Math.pow(piece.position[1] - piece.homePosition[1], 2) +
    Math.pow(piece.position[2] - piece.homePosition[2], 2)
  );
  console.log(`    ${id}: assigned to position ${locIdx}, posDist=${posDist.toFixed(3)}`);
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

// 测试hash的唯一性 - 不同的排列应该有不同的hash
console.log('Testing hash uniqueness:');
const allPermHashes = new Set<string>();
let test3 = createInitialPieces();
const faces: Face[] = ['U', 'R', 'L', 'B'];
const dirs: Direction[] = ['clockwise', 'counterclockwise'];
for (let i = 0; i < 50; i++) {
  const f = faces[Math.floor(Math.random() * faces.length)];
  const d = dirs[Math.floor(Math.random() * dirs.length)];
  test3 = applyMove(test3, f, d, 'face');
  const hash = getTipPositionHash(test3);
  allPermHashes.add(hash);
}
console.log(`  After 50 random face moves, found ${allPermHashes.size} unique tip position hashes`);
console.log(`  Max possible is 4! = 24`);
console.log();

// 测试solvePyraminx
console.log('Testing solvePyraminx with random shuffle (20 moves)...');
const shuffled = shufflePieces(createInitialPieces(), 20);
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

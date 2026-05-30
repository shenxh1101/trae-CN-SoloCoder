import { createInitialPieces, applyMove, checkSolved, countCorrectTips, countCorrectEdges, shufflePieces, solvePyraminx } from './src/engine/pyraminxEngine';
import type { Piece, Face, Direction, MoveType, Move } from './src/types';

console.log('=== Simple Debug ===\n');

// 测试1: 检查初始状态
const initial = createInitialPieces();
console.log('Test 1: Initial state');
console.log('  checkSolved:', checkSolved(initial));
console.log('  Tips:', countCorrectTips(initial), '/4');
console.log('  Edges:', countCorrectEdges(initial), '/6');
console.log('  solvePyraminx returns', solvePyraminx(initial).moves.length, 'steps');
console.log('');

// 测试2: 简单的一步打乱
console.log('Test 2: Single U face CW');
let simple = createInitialPieces();
simple = applyMove(simple, 'U', 'clockwise', 'face');
console.log('  checkSolved:', checkSolved(simple));
console.log('  Tips:', countCorrectTips(simple), '/4');
console.log('  Edges:', countCorrectEdges(simple), '/6');
const result2 = solvePyraminx(simple);
console.log('  solvePyraminx returns', result2.moves.length, 'steps');
console.log('  Result checkSolved:', checkSolved(result2.pieces));
if (result2.moves.length > 0) {
  console.log('  Solution:');
  result2.moves.forEach((m, i) => console.log(`    ${i+1}. ${m.face} ${m.type} ${m.direction}`));
  
  // 验证
  console.log('  Verification:');
  let verify = JSON.parse(JSON.stringify(simple));
  result2.moves.forEach(move => {
    verify = applyMove(verify, move.face, move.direction, move.type);
  });
  console.log('  Verified:', checkSolved(verify) ? 'PASS' : 'FAIL');
}
console.log('');

// 测试3: 看看solvePyraminx内部的BFS是否工作
// 我们直接复制BFS函数的逻辑来测试
console.log('Test 3: Testing BFS logic directly');

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

// 测试BFS
const testPieces = JSON.parse(JSON.stringify(simple));
console.log('  Initial isTipPositionSolved:', isTipPositionSolved(testPieces));
console.log('  Initial hash:', getTipPositionHash(testPieces));

interface State {
  pieces: Piece[];
  moves: Move[];
}

const visited = new Set<string>();
const queue: State[] = [{ pieces: testPieces, moves: [] }];
const faces: Face[] = ['U', 'R', 'L', 'B'];
const directions: Direction[] = ['clockwise', 'counterclockwise'];

let found = false;
let iterations = 0;
const maxIterations = 50;

while (queue.length > 0 && iterations < maxIterations && !found) {
  const current = queue.shift()!;
  iterations++;
  
  const hash = getTipPositionHash(current.pieces);
  
  if (isTipPositionSolved(current.pieces)) {
    console.log(`  SOLVED at iteration ${iterations} with ${current.moves.length} moves!`);
    found = true;
    break;
  }
  
  if (visited.has(hash)) {
    continue;
  }
  visited.add(hash);
  
  for (const face of faces) {
    for (const direction of directions) {
      const newPieces = applyMove(JSON.parse(JSON.stringify(current.pieces)), face, direction, 'face');
      const newHash = getTipPositionHash(newPieces);
      
      if (!visited.has(newHash)) {
        queue.push({
          pieces: newPieces,
          moves: [...current.moves, { face, direction, type: 'face' as MoveType }]
        });
      }
    }
  }
}

console.log(`  BFS finished: found=${found}, iterations=${iterations}, visited=${visited.size}`);
console.log('');

// 测试4: 多步打乱
console.log('Test 4: Random shuffle (15 moves)');
const shuffled4 = shufflePieces(createInitialPieces(), 15);
console.log('  checkSolved:', checkSolved(shuffled4.pieces));
console.log('  Tips:', countCorrectTips(shuffled4.pieces), '/4');
console.log('  Edges:', countCorrectEdges(shuffled4.pieces), '/6');
const result4 = solvePyraminx(shuffled4.pieces);
console.log('  solvePyraminx returns', result4.moves.length, 'steps');
console.log('  Result checkSolved:', checkSolved(result4.pieces));

if (result4.moves.length > 0) {
  console.log('  Solution:');
  result4.moves.forEach((m, i) => console.log(`    ${i+1}. ${m.face} ${m.type} ${m.direction}`));
  
  // 验证
  console.log('  Verification:');
  let verify = JSON.parse(JSON.stringify(shuffled4.pieces));
  result4.moves.forEach(move => {
    verify = applyMove(verify, move.face, move.direction, move.type);
  });
  console.log('  Verified:', checkSolved(verify) ? 'PASS' : 'FAIL');
}

console.log('\n=== Done ===');

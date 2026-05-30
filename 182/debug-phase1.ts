import { createInitialPieces, applyMove, checkSolved, countCorrectTips, countCorrectEdges, shufflePieces, solvePyraminx } from './src/engine/pyraminxEngine';
import type { Piece, Face, Direction, MoveType, Move } from './src/types';

console.log('=== Debug Phase 1 ===\n');

// 复制需要的函数
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

// 手动实现solveTipPositionBFS来观察它的行为
function solveTipPositionBFSDebug(initialPieces: Piece[]): { pieces: Piece[]; moves: Move[] } | null {
  if (isTipPositionSolved(initialPieces)) {
    console.log('  BFS: Already solved, returning empty');
    return { pieces: JSON.parse(JSON.stringify(initialPieces)), moves: [] };
  }
  
  interface State {
    pieces: Piece[];
    moves: Move[];
  }
  
  const visited = new Set<string>();
  const queue: State[] = [{ pieces: JSON.parse(JSON.stringify(initialPieces)), moves: [] }];
  const faces: Face[] = ['U', 'R', 'L', 'B'];
  const directions: Direction[] = ['clockwise', 'counterclockwise'];
  
  const maxIterations = 100;
  let iterations = 0;
  
  console.log(`  BFS: Starting, initial hash=${getTipPositionHash(initialPieces)}`);
  
  while (queue.length > 0 && iterations < maxIterations) {
    const current = queue.shift()!;
    iterations++;
    
    const hash = getTipPositionHash(current.pieces);
    
    console.log(`  BFS: Iter ${iterations}, depth=${current.moves.length}, hash=${hash}, queue=${queue.length}, visited=${visited.size}`);
    
    if (isTipPositionSolved(current.pieces)) {
      console.log(`  BFS: SOLVED at iteration ${iterations} with ${current.moves.length} moves!`);
      return { pieces: current.pieces, moves: current.moves };
    }
    
    if (visited.has(hash)) {
      console.log(`  BFS: Already visited, skipping`);
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
            moves: [...current.moves, { face, direction, type: 'face' }]
          });
        }
      }
    }
  }
  
  console.log(`  BFS: Failed! iterations=${iterations}, visited=${visited.size}, queue=${queue.length}`);
  return null;
}

// 测试1: 单步打乱 - 应该工作
console.log('Test 1: Single U face CW');
let test1 = createInitialPieces();
test1 = applyMove(test1, 'U', 'clockwise', 'face');
console.log('  Tips:', countCorrectTips(test1), '/4');
const result1 = solveTipPositionBFSDebug(test1);
console.log('  Result:', result1 ? `${result1.moves.length} moves` : 'null');
console.log('');

// 测试2: 15步随机打乱
console.log('Test 2: Random shuffle (15 moves)');
const shuffled = shufflePieces(createInitialPieces(), 15);
console.log('  Tips:', countCorrectTips(shuffled.pieces), '/4');
console.log('  Initial hash:', getTipPositionHash(shuffled.pieces));
console.log('  isTipPositionSolved:', isTipPositionSolved(shuffled.pieces));
const result2 = solveTipPositionBFSDebug(shuffled.pieces);
console.log('  Result:', result2 ? `${result2.moves.length} moves` : 'null');

if (result2) {
  console.log('  Solution:');
  result2.moves.forEach((m, i) => console.log(`    ${i+1}. ${m.face} ${m.type} ${m.direction}`));
  
  // 验证
  console.log('  Verification:');
  let verify = JSON.parse(JSON.stringify(shuffled.pieces));
  result2.moves.forEach(move => {
    verify = applyMove(verify, move.face, move.direction, move.type);
  });
  console.log('  Verified:', isTipPositionSolved(verify) ? 'PASS' : 'FAIL');
}
console.log('');

// 测试3: 直接调用solvePyraminx看看
console.log('Test 3: solvePyraminx on same shuffled state');
const result3 = solvePyraminx(shuffled.pieces);
console.log('  Steps:', result3.moves.length);
console.log('  Solved:', checkSolved(result3.pieces));
if (result3.moves.length > 0) {
  console.log('  Solution:');
  result3.moves.forEach((m, i) => console.log(`    ${i+1}. ${m.face} ${m.type} ${m.direction}`));
}

console.log('\n=== Done ===');

import { createInitialPieces, applyMove, checkSolved, countCorrectTips, countCorrectEdges, shufflePieces, solvePyraminx, isTipPositionSolved, evaluateTipOrientation, isEdgeSolved, isTipSolved } from './src/engine/pyraminxEngine';
import type { Piece, Face, Direction, MoveType, Move } from './src/types';

console.log('=== Debug solvePyraminx in detail ===\n');

// 测试一个简单的情况：只做一个U face转动
console.log('Test 1: Simple case - single U face CW');
let simple = createInitialPieces();
simple = applyMove(simple, 'U', 'clockwise', 'face');
console.log('checkSolved:', checkSolved(simple));
console.log('Tips:', countCorrectTips(simple), '/4');
console.log('isTipPositionSolved:', isTipPositionSolved(simple));
console.log('');

const result1 = solvePyraminx(simple);
console.log('Result1:');
console.log('  Steps:', result1.moves.length);
console.log('  Solved:', checkSolved(result1.pieces));
console.log('  Tips:', countCorrectTips(result1.pieces), '/4');
result1.moves.forEach((m, i) => {
  console.log(`  ${i+1}. ${m.face} ${m.type} ${m.direction}`);
});
console.log('');

// 测试BFS单独工作
console.log('Test 2: Testing BFS directly on the same simple case');
const pieces2 = JSON.parse(JSON.stringify(simple));
console.log('Initial isTipPositionSolved:', isTipPositionSolved(pieces2));

// 手动测试BFS逻辑
const faces: Face[] = ['U', 'R', 'L', 'B'];
const directions: Direction[] = ['clockwise', 'counterclockwise'];
const moveTypes: MoveType[] = ['face'];

interface State {
  pieces: Piece[];
  moves: Move[];
  depth: number;
}

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

console.log('Initial hash:', getTipPositionHash(pieces2));

const visited = new Set<string>();
const queue: State[] = [{ pieces: pieces2, moves: [], depth: 0 }];
let found = false;
let iterations = 0;
const maxIterations = 100;

while (queue.length > 0 && iterations < maxIterations && !found) {
  const current = queue.shift()!;
  iterations++;
  
  const hash = getTipPositionHash(current.pieces);
  console.log(`  Iteration ${iterations}: depth=${current.depth}, hash=${hash}, queue=${queue.length}, visited=${visited.size}`);
  
  if (isTipPositionSolved(current.pieces)) {
    console.log('  SOLVED at iteration', iterations, 'with', current.moves.length, 'moves!');
    current.moves.forEach((m, i) => {
      console.log(`    ${i+1}. ${m.face} ${m.type} ${m.direction}`);
    });
    found = true;
    break;
  }
  
  if (visited.has(hash)) {
    console.log('  Already visited, skipping');
    continue;
  }
  visited.add(hash);
  
  for (const face of faces) {
    for (const direction of directions) {
      for (const type of moveTypes) {
        const newPieces = applyMove(JSON.parse(JSON.stringify(current.pieces)), face, direction, type);
        const newHash = getTipPositionHash(newPieces);
        
        if (!visited.has(newHash)) {
          queue.push({
            pieces: newPieces,
            moves: [...current.moves, { face, direction, type }],
            depth: current.depth + 1
          });
        }
      }
    }
  }
}

console.log('');
console.log('BFS finished. found:', found, 'iterations:', iterations, 'visited:', visited.size);
console.log('');

// 测试solvePyraminx函数本身，看看它内部发生了什么
console.log('Test 3: Debug solvePyraminx internals');
const shuffled3 = shufflePieces(createInitialPieces(), 20);
console.log('Shuffled checkSolved:', checkSolved(shuffled3.pieces));
console.log('');

// 手动运行各阶段
console.log('Running phases manually:');
let current = JSON.parse(JSON.stringify(shuffled3.pieces));

// Phase 1
console.log('Phase 1: solveTipPositionBFS');
console.log('  Before: Tips', countCorrectTips(current), '/4');
console.log('  Before: isTipPositionSolved:', isTipPositionSolved(current));

// 导入实际的函数
import { solveTipPositionBFS, solveTipOrientationGreedy, solvePhase, evaluateEdge, evaluateCenter } from './src/engine/pyraminxEngine';

const p1 = solveTipPositionBFS(current);
if (p1) {
  current = p1.pieces;
  console.log('  After Phase 1: Tips', countCorrectTips(current), '/4');
  console.log('  After Phase 1: isTipPositionSolved:', isTipPositionSolved(current));
  console.log('  Phase 1 moves:', p1.moves.length);
  p1.moves.forEach((m, i) => console.log(`    ${i+1}. ${m.face} ${m.type} ${m.direction}`));
} else {
  console.log('  Phase 1 returned null!');
}
console.log('');

// Phase 2
console.log('Phase 2: solveTipOrientationGreedy');
console.log('  Before: tip orient score:', evaluateTipOrientation(current));
const p2 = solveTipOrientationGreedy(current);
current = p2.pieces;
console.log('  After Phase 2: tip orient score:', evaluateTipOrientation(current));
console.log('  Phase 2 moves:', p2.moves.length);
console.log('  After Phase 2: Tips', countCorrectTips(current), '/4');
console.log('  After Phase 2: isTipSolved:', isTipSolved(current));
console.log('');

// Phase 3
console.log('Phase 3: solvePhase for edges');
console.log('  Before: Edges', countCorrectEdges(current), '/6');
console.log('  Before: isEdgeSolved:', isEdgeSolved(current));
const p3 = solvePhase(current, ['middle'], isEdgeSolved, isTipSolved, evaluateEdge, 200);
current = p3.pieces;
console.log('  After Phase 3: Edges', countCorrectEdges(current), '/6');
console.log('  After Phase 3: isEdgeSolved:', isEdgeSolved(current));
console.log('  Phase 3 moves:', p3.moves.length);
console.log('');

// Phase 4
console.log('Phase 4: solvePhase for centers');
console.log('  Before: center score:', evaluateCenter(current));
console.log('  Before: checkSolved:', checkSolved(current));
const p4 = solvePhase(current, ['face', 'middle', 'tip'], checkSolved, (p) => isTipSolved(p) && isEdgeSolved(p), evaluateCenter, 150);
current = p4.pieces;
console.log('  After Phase 4: checkSolved:', checkSolved(current));
console.log('  After Phase 4: center score:', evaluateCenter(current));
console.log('  Phase 4 moves:', p4.moves.length);
console.log('');

console.log('=== Done ===');

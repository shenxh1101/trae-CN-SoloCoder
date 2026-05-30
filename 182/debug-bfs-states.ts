import { createInitialPieces, applyMove } from './src/engine/pyraminxEngine';
import type { Piece, Face, Direction, MoveType, Move } from './src/types';

console.log('=== Debug BFS State Space ===\n');

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

function getTipPositionHash(pieces: Piece[]): string {
  const tipPieces = pieces.filter(p => p.type === 'tip').sort((a, b) => a.id.localeCompare(b.id));
  return tipPieces.map(p => {
    const x = Math.round(p.position[0] * 1000000) / 1000000;
    const y = Math.round(p.position[1] * 1000000) / 1000000;
    const z = Math.round(p.position[2] * 1000000) / 1000000;
    return `${x},${y},${z}`;
  }).join('|');
}

interface State {
  pieces: Piece[];
  moves: Move[];
}

const initial = createInitialPieces();
const visited = new Set<string>();
const queue: State[] = [{ pieces: JSON.parse(JSON.stringify(initial)), moves: [] }];
const faces: Face[] = ['U', 'R', 'L', 'B'];
const directions: Direction[] = ['clockwise', 'counterclockwise'];

let iterations = 0;
let maxDepth = 0;
let solvedAt = -1;

while (queue.length > 0) {
  const current = queue.shift()!;
  iterations++;
  
  const hash = getTipPositionHash(current.pieces);
  
  if (isTipPositionSolved(current.pieces) && current.moves.length > 0) {
    solvedAt = current.moves.length;
    console.log(`Found solution at depth ${solvedAt} after ${iterations} iterations`);
    break;
  }
  
  if (visited.has(hash)) {
    continue;
  }
  visited.add(hash);
  
  if (current.moves.length > maxDepth) {
    maxDepth = current.moves.length;
    console.log(`Depth ${maxDepth}, visited=${visited.size}, queue=${queue.length}, iterations=${iterations}`);
  }
  
  if (visited.size >= 50) {
    console.log(`Reached 50 unique states, stopping.`);
    break;
  }
  
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

console.log('');
console.log('Summary:');
console.log('  Total unique states visited:', visited.size);
console.log('  Max depth reached:', maxDepth);
console.log('  Total iterations:', iterations);

// 现在让我们看看旋转后的实际位置
console.log('');
console.log('Let\'s see what a U face CW actually does to positions:');
let state = createInitialPieces();
const tipsBefore = state.filter(p => p.type === 'tip').sort((a, b) => a.id.localeCompare(b.id));
console.log('  Before:');
tipsBefore.forEach(p => console.log(`    ${p.id}: (${p.position.map(x => x.toFixed(6)).join(', ')})`));

state = applyMove(state, 'U', 'clockwise', 'face');
const tipsAfter = state.filter(p => p.type === 'tip').sort((a, b) => a.id.localeCompare(b.id));
console.log('  After U face CW:');
tipsAfter.forEach(p => console.log(`    ${p.id}: (${p.position.map(x => x.toFixed(6)).join(', ')})`));

// 计算每个tip块移动到哪里了
console.log('  Mapping:');
tipsAfter.forEach(after => {
  let minDist = Infinity;
  let minId = '';
  tipsBefore.forEach(before => {
    const dist = Math.sqrt(
      Math.pow(after.position[0] - before.position[0], 2) +
      Math.pow(after.position[1] - before.position[1], 2) +
      Math.pow(after.position[2] - before.position[2], 2)
    );
    if (dist < minDist) {
      minDist = dist;
      minId = before.id;
    }
  });
  console.log(`    ${after.id} moved from ${minId}'s position (dist=${minDist.toFixed(6)})`);
});

console.log('\n=== Done ===');

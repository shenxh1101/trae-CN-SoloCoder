import { createInitialPieces, applyMove, checkSolved, countCorrectTips, countCorrectEdges, shufflePieces } from './src/engine/pyraminxEngine';
import { Piece, Face, Direction, MoveType } from './src/types';

function getTipPositionHash(pieces: Piece[]): string {
  return pieces.filter(p => p.type === 'tip').map(p => {
    const posRounded = p.position.map(v => Math.round(v * 100) / 100);
    return `${posRounded.join(',')}`;
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

console.log('=== Debug BFS ===\n');

const test = createInitialPieces();
const shuffled = shufflePieces(test, 5);

console.log('Initial state:');
console.log('  Tips correct:', countCorrectTips(shuffled.pieces), '/4');
console.log('  Tip position hash:', getTipPositionHash(shuffled.pieces));
console.log('  Tip positions:');
shuffled.pieces.filter(p => p.type === 'tip').forEach(p => {
  const posRounded = p.position.map(v => Math.round(v * 100) / 100);
  const homeRounded = p.homePosition.map(v => Math.round(v * 100) / 100);
  console.log(`    ${p.id}: current=(${posRounded.join(',')}), home=(${homeRounded.join(',')})`);
});
console.log('  isTipPositionSolved:', isTipPositionSolved(shuffled.pieces));
console.log();

// 手动测试BFS
console.log('Testing BFS manually...');
const faces: Face[] = ['U', 'R', 'L', 'B'];
const directions: Direction[] = ['clockwise', 'counterclockwise'];

interface State {
  pieces: Piece[];
  moves: any[];
  hash: string;
}

const queue: State[] = [{
  pieces: JSON.parse(JSON.stringify(shuffled.pieces)),
  moves: [],
  hash: getTipPositionHash(shuffled.pieces),
}];

const visited = new Set<string>();
visited.add(queue[0].hash);

let found = false;
let iterations = 0;
const maxIterations = 500;

while (queue.length > 0 && iterations < maxIterations && !found) {
  iterations++;
  const current = queue.shift()!;
  
  if (iterations <= 3 || iterations % 50 === 0) {
    console.log(`  Iteration ${iterations}, queue size: ${queue.length}, visited: ${visited.size}`);
    console.log(`    Current hash: ${current.hash}`);
    console.log(`    isTipPositionSolved: ${isTipPositionSolved(current.pieces)}`);
  }
  
  if (isTipPositionSolved(current.pieces)) {
    console.log(`\n  SOLVED at iteration ${iterations}!`);
    console.log(`  Steps: ${current.moves.length}`);
    console.log(`  Moves: ${current.moves.map(m => `${m.face}-${m.type}-${m.direction}`).join(', ')}`);
    found = true;
    break;
  }
  
  for (const face of faces) {
    for (const direction of directions) {
      const newPieces = applyMove(JSON.parse(JSON.stringify(current.pieces)), face, direction, 'face');
      const newHash = getTipPositionHash(newPieces);
      
      if (visited.has(newHash)) {
        continue;
      }
      
      const newMoves = [...current.moves, { face, direction, type: 'face' as MoveType }];
      visited.add(newHash);
      queue.push({
        pieces: newPieces,
        moves: newMoves,
        hash: newHash,
      });
    }
  }
}

if (!found) {
  console.log(`\n  Not found after ${iterations} iterations`);
  console.log(`  Visited states: ${visited.size}`);
  console.log(`  Queue size: ${queue.length}`);
}

console.log('\n=== Debug Complete ===');

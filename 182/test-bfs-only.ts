import { createInitialPieces, applyMove, checkSolved, countCorrectTips, countCorrectEdges, shufflePieces } from './src/engine/pyraminxEngine';
import { Piece, Face, Direction, MoveType, Move } from './src/types';

function getTipPositionHash(pieces: Piece[]): string {
  return pieces.filter(p => p.type === 'tip').sort((a, b) => a.id.localeCompare(b.id)).map(p => {
    const posRounded = p.position.map(v => Math.round(v * 100) / 100);
    return `${p.id}:${posRounded.join(',')}`;
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

function solveTipPositionBFS(pieces: Piece[]): { pieces: Piece[]; moves: Move[] } | null {
  const initialPieces = JSON.parse(JSON.stringify(pieces));
  
  if (isTipPositionSolved(initialPieces)) {
    console.log('  BFS: Already solved!');
    return { pieces: initialPieces, moves: [] };
  }
  
  const faces: Face[] = ['U', 'R', 'L', 'B'];
  const directions: Direction[] = ['clockwise', 'counterclockwise'];
  
  interface State {
    pieces: Piece[];
    moves: Move[];
  }
  
  const queue: State[] = [{
    pieces: initialPieces,
    moves: [],
  }];
  
  const visited = new Set<string>();
  visited.add(getTipPositionHash(initialPieces));
  
  let iterations = 0;
  const maxIterations = 2000;
  
  console.log(`  BFS: Starting search, initial hash=${getTipPositionHash(initialPieces)}`);
  
  while (queue.length > 0 && iterations < maxIterations) {
    iterations++;
    const current = queue.shift()!;
    
    for (const face of faces) {
      for (const direction of directions) {
        const newPieces = applyMove(JSON.parse(JSON.stringify(current.pieces)), face, direction, 'face');
        const newHash = getTipPositionHash(newPieces);
        
        if (visited.has(newHash)) {
          continue;
        }
        
        const newMoves = [...current.moves, { face, direction, type: 'face' as MoveType }];
        
        if (isTipPositionSolved(newPieces)) {
          console.log(`  BFS: Solved at iteration ${iterations}!`);
          console.log(`  BFS: Steps: ${newMoves.length}`);
          return { pieces: newPieces, moves: newMoves };
        }
        
        visited.add(newHash);
        queue.push({
          pieces: newPieces,
          moves: newMoves,
        });
      }
    }
    
    if (iterations % 100 === 0) {
      console.log(`  BFS: Iteration ${iterations}, queue=${queue.length}, visited=${visited.size}`);
    }
  }
  
  console.log(`  BFS: Failed after ${iterations} iterations`);
  return null;
}

console.log('=== Test BFS Only ===\n');

const test = createInitialPieces();
const shuffled = shufflePieces(test, 10);

console.log('Initial state:');
console.log('  Tips correct:', countCorrectTips(shuffled.pieces), '/4');
console.log('  Edges correct:', countCorrectEdges(shuffled.pieces), '/6');
console.log('  Solved:', checkSolved(shuffled.pieces));
console.log();

console.log('Running BFS...');
const start = Date.now();
const result = solveTipPositionBFS(shuffled.pieces);
const time = Date.now() - start;
console.log(`  Time: ${time}ms`);
console.log();

if (result) {
  console.log('BFS Result:');
  console.log('  Steps:', result.moves.length);
  console.log('  Moves:', result.moves.map(m => `${m.face}-${m.type}-${m.direction}`).join(', '));
  console.log('  Tips correct after BFS:', countCorrectTips(result.pieces), '/4');
  console.log('  Tip position solved:', isTipPositionSolved(result.pieces));
  
  // 验证步骤是否正确
  console.log('\nVerifying solution:');
  let verify = JSON.parse(JSON.stringify(shuffled.pieces));
  result.moves.forEach((move, i) => {
    verify = applyMove(verify, move.face, move.direction, move.type);
    console.log(`  After step ${i+1}: tips=${countCorrectTips(verify)}/4`);
  });
  console.log('  Final tip position solved:', isTipPositionSolved(verify));
} else {
  console.log('BFS FAILED!');
}

console.log('\n=== Test Complete ===');

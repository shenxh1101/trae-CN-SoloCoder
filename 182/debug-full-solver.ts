import { createInitialPieces, applyMove, checkSolved, countCorrectTips, countCorrectEdges, shufflePieces } from './src/engine/pyraminxEngine';
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

function isTipOrientationSolved(pieces: Piece[]): boolean {
  return pieces.filter(p => p.type === 'tip').every(piece => {
    for (let i = 0; i < piece.facelets.length; i++) {
      if (piece.facelets[i].face !== piece.homeFacelets[i].face ||
          piece.facelets[i].color !== piece.homeFacelets[i].color) {
        return false;
      }
    }
    return true;
  });
}

function isTipSolved(pieces: Piece[]): boolean {
  return countCorrectTips(pieces) === 4;
}

function isEdgeSolved(pieces: Piece[]): boolean {
  return countCorrectEdges(pieces) === 6;
}

function evaluateTipOrientation(pieces: Piece[]): number {
  let score = 0;
  for (const piece of pieces.filter(p => p.type === 'tip')) {
    let correctCount = 0;
    for (let i = 0; i < piece.facelets.length; i++) {
      if (piece.facelets[i].face === piece.homeFacelets[i].face &&
          piece.facelets[i].color === piece.homeFacelets[i].color) {
        correctCount++;
      }
    }
    score += (3 - correctCount) * 100;
    if (correctCount === 3) score -= 1000;
  }
  return score;
}

function evaluateEdge(pieces: Piece[]): number {
  let score = 0;
  for (const piece of pieces.filter(p => p.type === 'edge')) {
    const posDist = Math.sqrt(
      Math.pow(piece.position[0] - piece.homePosition[0], 2) +
      Math.pow(piece.position[1] - piece.homePosition[1], 2) +
      Math.pow(piece.position[2] - piece.homePosition[2], 2)
    );
    score += posDist * 80;
    
    if (posDist < 0.01) {
      let correctCount = 0;
      for (let i = 0; i < piece.facelets.length; i++) {
        if (piece.facelets[i].face === piece.homeFacelets[i].face &&
            piece.facelets[i].color === piece.homeFacelets[i].color) {
          correctCount++;
        }
      }
      score += (2 - correctCount) * 80;
      if (correctCount === 2) score -= 800;
    }
  }
  return score;
}

function evaluateCenter(pieces: Piece[]): number {
  let score = 0;
  for (const piece of pieces.filter(p => p.type === 'center')) {
    for (let i = 0; i < piece.facelets.length; i++) {
      if (piece.facelets[i].face !== piece.homeFacelets[i].face ||
          piece.facelets[i].color !== piece.homeFacelets[i].color) {
        score += 50;
      }
    }
    if (piece.facelets.every((f, i) => f.face === piece.homeFacelets[i].face && f.color === piece.homeFacelets[i].color)) {
      score -= 300;
    }
  }
  return score;
}

function isOppositeMove(m1: Move, m2: Move): boolean {
  return m1.face === m2.face && 
         m1.type === m2.type && 
         m1.direction !== m2.direction;
}

function getStateHash(pieces: Piece[]): string {
  return pieces.map(p => {
    const posKey = `${p.position[0].toFixed(2)},${p.position[1].toFixed(2)},${p.position[2].toFixed(2)}`;
    const faceletKey = p.facelets.map(f => `${f.face}-${f.color}-${f.position}`).join('|');
    return `${p.id}:${posKey}:${faceletKey}`;
  }).join('||');
}

function solveTipPositionBFS(pieces: Piece[]): { pieces: Piece[]; moves: Move[] } | null {
  console.log('    [Phase1] Starting BFS for tip position');
  console.log('    [Phase1] Initial hash:', getTipPositionHash(pieces));
  console.log('    [Phase1] isTipPositionSolved:', isTipPositionSolved(pieces));
  
  const initialPieces = JSON.parse(JSON.stringify(pieces));
  
  if (isTipPositionSolved(initialPieces)) {
    console.log('    [Phase1] Already solved!');
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
  const maxIterations = 1000;
  
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
          console.log(`    [Phase1] Solved at iteration ${iterations}! Steps: ${newMoves.length}`);
          console.log(`    [Phase1] Moves: ${newMoves.map(m => `${m.face}-${m.type}-${m.direction}`).join(', ')}`);
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
      console.log(`    [Phase1] Iteration ${iterations}, queue=${queue.length}, visited=${visited.size}`);
    }
  }
  
  console.log(`    [Phase1] FAILED after ${iterations} iterations`);
  return null;
}

function solveTipOrientationGreedy(pieces: Piece[]): { pieces: Piece[]; moves: Move[] } {
  console.log('    [Phase2] Starting greedy for tip orientation');
  const currentPieces = JSON.parse(JSON.stringify(pieces));
  const moves: Move[] = [];
  const faces: Face[] = ['U', 'R', 'L', 'B'];
  const directions: Direction[] = ['clockwise', 'counterclockwise'];
  
  console.log('    [Phase2] Initial score:', evaluateTipOrientation(currentPieces));
  console.log('    [Phase2] isTipOrientationSolved:', isTipOrientationSolved(currentPieces));
  
  for (let iter = 0; iter < 20 && !isTipOrientationSolved(currentPieces); iter++) {
    let bestScore = evaluateTipOrientation(currentPieces);
    let bestMove: Move | null = null;
    let bestPieces: Piece[] | null = null;
    
    for (const face of faces) {
      for (const direction of directions) {
        const testPieces = applyMove(JSON.parse(JSON.stringify(currentPieces)), face, direction, 'tip');
        
        if (!isTipPositionSolved(testPieces)) {
          continue;
        }
        
        const score = evaluateTipOrientation(testPieces);
        if (score < bestScore - 0.001) {
          bestScore = score;
          bestMove = { face, direction, type: 'tip' };
          bestPieces = testPieces;
        }
      }
    }
    
    if (bestMove && bestPieces) {
      for (let i = 0; i < bestPieces.length; i++) {
        currentPieces[i] = bestPieces[i];
      }
      moves.push(bestMove);
      console.log(`    [Phase2] Iter ${iter}: found move, score=${bestScore}`);
    } else {
      console.log(`    [Phase2] Iter ${iter}: no improvement, stopping`);
      break;
    }
  }
  
  console.log(`    [Phase2] Done, steps=${moves.length}, solved=${isTipOrientationSolved(currentPieces)}`);
  return { pieces: currentPieces, moves };
}

function solvePhase(
  pieces: Piece[],
  allowedTypes: MoveType[],
  goalCheck: (p: Piece[]) => boolean,
  constraintCheck: ((p: Piece[]) => boolean) | null,
  evaluator: (p: Piece[]) => number,
  maxIterations: number,
  phaseName: string
): { pieces: Piece[]; moves: Move[] } {
  console.log(`    [${phaseName}] Starting solvePhase`);
  const currentPieces = JSON.parse(JSON.stringify(pieces));
  const moves: Move[] = [];
  const visited = new Set<string>();
  const faces: Face[] = ['U', 'R', 'L', 'B'];
  const directions: Direction[] = ['clockwise', 'counterclockwise'];
  
  visited.add(getStateHash(currentPieces));
  
  let iterations = 0;
  
  while (!goalCheck(currentPieces) && iterations < maxIterations) {
    iterations++;
    
    let bestScore = evaluator(currentPieces);
    let bestMove: Move | null = null;
    let bestPieces: Piece[] | null = null;
    
    for (const face of faces) {
      for (const direction of directions) {
        for (const type of allowedTypes) {
          if (moves.length > 0 && isOppositeMove(moves[moves.length - 1], { face, direction, type })) {
            continue;
          }
          
          const testPieces = applyMove(JSON.parse(JSON.stringify(currentPieces)), face, direction, type);
          
          if (constraintCheck && !constraintCheck(testPieces)) {
            continue;
          }
          
          const stateHash = getStateHash(testPieces);
          if (visited.has(stateHash)) {
            continue;
          }
          
          const score = evaluator(testPieces);
          if (score < bestScore - 0.001) {
            bestScore = score;
            bestMove = { face, direction, type };
            bestPieces = testPieces;
          }
        }
      }
    }
    
    if (bestMove && bestPieces) {
      for (let i = 0; i < bestPieces.length; i++) {
        currentPieces[i] = bestPieces[i];
      }
      moves.push(bestMove);
      visited.add(getStateHash(currentPieces));
      if (iterations % 20 === 0) {
        console.log(`    [${phaseName}] Iter ${iterations}: score=${bestScore.toFixed(0)}, steps=${moves.length}`);
      }
    } else {
      let foundRandom = false;
      for (let tries = 0; tries < 50 && !foundRandom; tries++) {
        const face = faces[Math.floor(Math.random() * faces.length)];
        const direction = directions[Math.floor(Math.random() * directions.length)];
        const type = allowedTypes[Math.floor(Math.random() * allowedTypes.length)];
        
        if (moves.length > 0 && isOppositeMove(moves[moves.length - 1], { face, direction, type })) {
          continue;
        }
        
        const testPieces = applyMove(JSON.parse(JSON.stringify(currentPieces)), face, direction, type);
        
        if (constraintCheck && !constraintCheck(testPieces)) {
          continue;
        }
        
        const stateHash = getStateHash(testPieces);
        if (visited.has(stateHash)) {
          continue;
        }
        
        for (let i = 0; i < testPieces.length; i++) {
          currentPieces[i] = testPieces[i];
        }
        moves.push({ face, direction, type });
        visited.add(stateHash);
        foundRandom = true;
      }
      
      if (!foundRandom) {
        console.log(`    [${phaseName}] No more moves, stopping at iter ${iterations}`);
        break;
      }
    }
  }
  
  console.log(`    [${phaseName}] Done, steps=${moves.length}, goal=${goalCheck(currentPieces)}`);
  return { pieces: currentPieces, moves };
}

function solvePyraminxDebug(pieces: Piece[]): { pieces: Piece[]; moves: Move[] } {
  console.log('\n=== Starting solvePyraminx ===');
  console.log('Input checkSolved:', checkSolved(pieces));
  console.log('Input tips:', countCorrectTips(pieces), '/4');
  console.log('Input edges:', countCorrectEdges(pieces), '/6');
  
  if (checkSolved(pieces)) {
    console.log('Already solved!');
    return { pieces: JSON.parse(JSON.stringify(pieces)), moves: [] };
  }
  
  let currentPieces = JSON.parse(JSON.stringify(pieces));
  const allMoves: Move[] = [];
  
  console.log('\n--- Phase 1: Tip Position (BFS) ---');
  const phase1 = solveTipPositionBFS(currentPieces);
  if (phase1) {
    currentPieces = phase1.pieces;
    allMoves.push(...phase1.moves);
    console.log('  Phase1 result: steps=', phase1.moves.length, 'tipPosSolved=', isTipPositionSolved(currentPieces));
  } else {
    console.log('  Phase1 FAILED!');
  }
  
  if (checkSolved(currentPieces)) {
    console.log('\nSolved after Phase1!');
    return { pieces: currentPieces, moves: allMoves };
  }
  
  console.log('\n--- Phase 2: Tip Orientation (Greedy) ---');
  console.log('  Before: tipPosSolved=', isTipPositionSolved(currentPieces), 'tipOriSolved=', isTipOrientationSolved(currentPieces));
  const phase2 = solveTipOrientationGreedy(currentPieces);
  currentPieces = phase2.pieces;
  allMoves.push(...phase2.moves);
  console.log('  Phase2 result: steps=', phase2.moves.length, 'tipSolved=', isTipSolved(currentPieces));
  
  if (checkSolved(currentPieces)) {
    console.log('\nSolved after Phase2!');
    return { pieces: currentPieces, moves: allMoves };
  }
  
  console.log('\n--- Phase 3: Edges (Greedy, middle only) ---');
  console.log('  Before: tipSolved=', isTipSolved(currentPieces), 'edgeSolved=', isEdgeSolved(currentPieces));
  const phase3 = solvePhase(
    currentPieces,
    ['middle'],
    isEdgeSolved,
    isTipSolved,
    evaluateEdge,
    200,
    'Phase3'
  );
  currentPieces = phase3.pieces;
  allMoves.push(...phase3.moves);
  console.log('  Phase3 result: steps=', phase3.moves.length, 'edgeSolved=', isEdgeSolved(currentPieces));
  
  if (checkSolved(currentPieces)) {
    console.log('\nSolved after Phase3!');
    return { pieces: currentPieces, moves: allMoves };
  }
  
  console.log('\n--- Phase 4: Centers (Greedy, all moves) ---');
  console.log('  Before: tipSolved=', isTipSolved(currentPieces), 'edgeSolved=', isEdgeSolved(currentPieces));
  const phase4 = solvePhase(
    currentPieces,
    ['face', 'middle', 'tip'],
    checkSolved,
    (p) => isTipSolved(p) && isEdgeSolved(p),
    evaluateCenter,
    150,
    'Phase4'
  );
  currentPieces = phase4.pieces;
  allMoves.push(...phase4.moves);
  console.log('  Phase4 result: steps=', phase4.moves.length, 'solved=', checkSolved(currentPieces));
  
  console.log('\n=== Final Result ===');
  console.log('Total steps:', allMoves.length);
  console.log('Final solved:', checkSolved(currentPieces));
  console.log('Final tips:', countCorrectTips(currentPieces), '/4');
  console.log('Final edges:', countCorrectEdges(currentPieces), '/6');
  
  return { pieces: currentPieces, moves: allMoves };
}

// 运行测试
console.log('=== Debug Full Solver ===\n');

const initial = createInitialPieces();
const shuffled = shufflePieces(initial, 10);

console.log('Shuffled state:');
console.log('  Tips:', countCorrectTips(shuffled.pieces), '/4');
console.log('  Edges:', countCorrectEdges(shuffled.pieces), '/6');
console.log('  Solved:', checkSolved(shuffled.pieces));
console.log('  Tip hash:', getTipPositionHash(shuffled.pieces));
console.log();

const result = solvePyraminxDebug(shuffled.pieces);

console.log('\n=== Verification ===');
let verify = JSON.parse(JSON.stringify(shuffled.pieces));
result.moves.forEach((move, i) => {
  verify = applyMove(verify, move.face, move.direction, move.type);
});
console.log('Verification result:', checkSolved(verify) ? 'PASS' : 'FAIL');

console.log('\n=== Done ===');

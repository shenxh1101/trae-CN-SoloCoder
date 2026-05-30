import { createInitialPieces, applyMove, checkSolved, countCorrectTips, countCorrectEdges, shufflePieces } from './src/engine/pyraminxEngine';
import type { Piece, Face, Direction, MoveType, Move } from './src/types';

console.log('=== Debug Hash Bug ===\n');

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

// 重现问题：15步打乱
const shuffled = shufflePieces(createInitialPieces(), 15);

// 应用打乱的步骤，看看每一步的hash
console.log('Replaying shuffle moves:');
let current = createInitialPieces();
console.log('  Step 0 (initial):');
console.log('    hash:', getTipPositionHash(current));
console.log('    isTipPositionSolved:', isTipPositionSolved(current));

shuffled.moves.forEach((move, i) => {
  current = applyMove(current, move.face, move.direction, move.type);
  console.log(`  Step ${i+1} (${move.face} ${move.type} ${move.direction}):`);
  console.log('    hash:', getTipPositionHash(current));
  console.log('    isTipPositionSolved:', isTipPositionSolved(current));
  
  // 如果hash显示solved但实际不是，打印详细信息
  const hash = getTipPositionHash(current);
  if (hash === 'tip-0:0|tip-1:1|tip-2:2|tip-3:3' && !isTipPositionSolved(current)) {
    console.log('    !!! HASH MATCHES BUT NOT SOLVED !!!');
    const tipPieces = current.filter(p => p.type === 'tip').sort((a, b) => a.id.localeCompare(b.id));
    tipPieces.forEach(piece => {
      const posDist = Math.sqrt(
        Math.pow(piece.position[0] - piece.homePosition[0], 2) +
        Math.pow(piece.position[1] - piece.homePosition[1], 2) +
        Math.pow(piece.position[2] - piece.homePosition[2], 2)
      );
      console.log(`    ${piece.id}: posDist=${posDist.toFixed(6)}`);
      console.log(`      position: (${piece.position.map(x => x.toFixed(3)).join(', ')})`);
      console.log(`      homePosition: (${piece.homePosition.map(x => x.toFixed(3)).join(', ')})`);
    });
  }
});

console.log('');
console.log('Now let\'s see what the hash function is actually doing:');
const tipPieces = current.filter(p => p.type === 'tip').sort((a, b) => a.id.localeCompare(b.id));
const homePositions = tipPieces.map(p => p.homePosition);
const n = tipPieces.length;
const indices = Array.from({ length: n }, (_, i) => i);
const allPermutations = permute(indices);

console.log('All permutations and their total distances:');
allPermutations.forEach(perm => {
  let totalDist = 0;
  const dists: number[] = [];
  for (let i = 0; i < n; i++) {
    const piece = tipPieces[i];
    const homePos = homePositions[perm[i]];
    const dist = Math.sqrt(
      Math.pow(piece.position[0] - homePos[0], 2) +
      Math.pow(piece.position[1] - homePos[1], 2) +
      Math.pow(piece.position[2] - homePos[2], 2)
    );
    totalDist += dist;
    dists.push(dist);
  }
  const permStr = perm.join(',');
  const isIdentity = perm.every((v, i) => v === i);
  console.log(`  [${permStr}] total=${totalDist.toFixed(3)}, dists=[${dists.map(d => d.toFixed(3)).join(', ')}] ${isIdentity ? '(IDENTITY)' : ''}`);
});

console.log('\n=== Done ===');

import { createInitialPieces, applyMove, checkSolved, solvePyraminx, countCorrectTips, countCorrectEdges } from './src/engine/pyraminxEngine.ts';

console.log('Simple Test Start');

let test = createInitialPieces();
console.log('Initial solved:', checkSolved(test));

test = applyMove(test, 'U', 'clockwise', 'face');
console.log('After U face CW:');
console.log('  solved:', checkSolved(test));
console.log('  tips:', countCorrectTips(test), '/4');
console.log('  edges:', countCorrectEdges(test), '/6');

console.log('Solving...');
const result = solvePyraminx(test);
console.log('Solved result:', checkSolved(result.pieces));
console.log('Steps:', result.moves.length);

console.log('Simple Test End');

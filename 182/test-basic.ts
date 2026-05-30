import { createInitialPieces, applyMove, checkSolved, solvePyraminx, countCorrectTips, countCorrectEdges, shufflePieces } from './src/engine/pyraminxEngine';

console.log('=== Basic Solver Test ===\n');

const test = createInitialPieces();
console.log('Initial solved:', checkSolved(test));

const shuffled = shufflePieces(test, 15);
console.log('After shuffle (15 moves):');
console.log('  Tips correct:', countCorrectTips(shuffled.pieces), '/4');
console.log('  Edges correct:', countCorrectEdges(shuffled.pieces), '/6');
console.log('  Solved:', checkSolved(shuffled.pieces));

console.log('\nSolving...');
const start = Date.now();
const result = solvePyraminx(shuffled.pieces);
const time = Date.now() - start;

console.log('Result:');
console.log('  Steps:', result.moves.length);
console.log('  Time:', time, 'ms');
console.log('  Solved:', checkSolved(result.pieces));
console.log('  Tips correct:', countCorrectTips(result.pieces), '/4');
console.log('  Edges correct:', countCorrectEdges(result.pieces), '/6');

if (result.moves.length > 0) {
  console.log('\nSolution steps:');
  result.moves.forEach((m, i) => {
    console.log(`  ${i+1}. ${m.face} ${m.type} ${m.direction}`);
  });
}

console.log('\n=== Test Complete ===');

import { createInitialPieces, applyMove, checkSolved, countCorrectTips, countCorrectEdges, shufflePieces, solvePyraminx, isTipPositionSolved } from './src/engine/pyraminxEngine';
import type { Piece, Face, Direction, MoveType, Move } from './src/types';

console.log('=== Debug Hash v2 ===\n');

// 测试1: 单步打乱 - 应该工作
console.log('Test 1: Single U face CW');
let test1 = createInitialPieces();
test1 = applyMove(test1, 'U', 'clockwise', 'face');
console.log('  checkSolved:', checkSolved(test1));
console.log('  Tips:', countCorrectTips(test1), '/4');
const result1 = solvePyraminx(test1);
console.log('  solvePyraminx returns', result1.moves.length, 'steps');
console.log('  Result checkSolved:', checkSolved(result1.pieces));
if (result1.moves.length > 0) {
  console.log('  Solution:');
  result1.moves.forEach((m, i) => console.log(`    ${i+1}. ${m.face} ${m.type} ${m.direction}`));
  let verify = JSON.parse(JSON.stringify(test1));
  result1.moves.forEach(move => {
    verify = applyMove(verify, move.face, move.direction, move.type);
  });
  console.log('  Verified:', checkSolved(verify) ? 'PASS' : 'FAIL');
}
console.log('');

// 测试2: hash唯一性
console.log('Test 2: Hash uniqueness with 50 random face moves');
function getTipPositionHash(pieces: Piece[]): string {
  const tipPieces = pieces.filter(p => p.type === 'tip').sort((a, b) => a.id.localeCompare(b.id));
  return tipPieces.map(p => {
    const x = Math.round(p.position[0] * 1000) / 1000;
    const y = Math.round(p.position[1] * 1000) / 1000;
    const z = Math.round(p.position[2] * 1000) / 1000;
    return `${p.id}:(${x},${y},${z})`;
  }).join('|');
}
let test2 = createInitialPieces();
const allHashes = new Set<string>();
const faces: Face[] = ['U', 'R', 'L', 'B'];
const dirs: Direction[] = ['clockwise', 'counterclockwise'];
for (let i = 0; i < 50; i++) {
  const f = faces[Math.floor(Math.random() * faces.length)];
  const d = dirs[Math.floor(Math.random() * dirs.length)];
  test2 = applyMove(test2, f, d, 'face');
  const hash = getTipPositionHash(test2);
  allHashes.add(hash);
}
console.log('  Unique hashes after 50 moves:', allHashes.size);
console.log('  Expected max: 4! = 24');
console.log('');

// 测试3: 15步随机打乱
console.log('Test 3: Random shuffle (15 moves)');
const shuffled = shufflePieces(createInitialPieces(), 15);
console.log('  checkSolved:', checkSolved(shuffled.pieces));
console.log('  Tips:', countCorrectTips(shuffled.pieces), '/4');
console.log('  Edges:', countCorrectEdges(shuffled.pieces), '/6');
const result3 = solvePyraminx(shuffled.pieces);
console.log('  solvePyraminx returns', result3.moves.length, 'steps');
console.log('  Result checkSolved:', checkSolved(result3.pieces));
console.log('  Result Tips:', countCorrectTips(result3.pieces), '/4');
console.log('  Result Edges:', countCorrectEdges(result3.pieces), '/6');

if (result3.moves.length > 0) {
  console.log('  Solution:');
  result3.moves.forEach((m, i) => console.log(`    ${i+1}. ${m.face} ${m.type} ${m.direction}`));
  
  console.log('  Verification:');
  let verify = JSON.parse(JSON.stringify(shuffled.pieces));
  result3.moves.forEach(move => {
    verify = applyMove(verify, move.face, move.direction, move.type);
  });
  console.log('  Verified:', checkSolved(verify) ? 'PASS' : 'FAIL');
}
console.log('');

// 测试4: 多次测试
console.log('Test 4: Multiple random shuffles (5 tests)');
let solvedCount = 0;
let totalSteps = 0;
for (let testIdx = 0; testIdx < 5; testIdx++) {
  const s = shufflePieces(createInitialPieces(), 20);
  const r = solvePyraminx(s.pieces);
  const isSolved = checkSolved(r.pieces);
  if (isSolved) solvedCount++;
  totalSteps += r.moves.length;
  console.log(`  Test ${testIdx+1}: steps=${r.moves.length}, solved=${isSolved}, tips=${countCorrectTips(r.pieces)}/4, edges=${countCorrectEdges(r.pieces)}/6`);
}
console.log(`  Summary: ${solvedCount}/5 solved, avg steps=${(totalSteps/5).toFixed(1)}`);

console.log('\n=== Done ===');

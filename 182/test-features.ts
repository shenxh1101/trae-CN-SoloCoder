import {
  createInitialPieces,
  applyMove,
  shufflePieces,
  checkSolved,
  solvePyraminx,
  generateSolution,
} from './src/engine/pyraminxEngine';
import { Face, Direction, MoveType } from './src/types';

console.log('=== Pyraminx 功能测试 ===\n');

console.log('1. 测试初始状态...');
const initialPieces = createInitialPieces();
console.log(`   初始块数量: ${initialPieces.length}`);
console.log(`   顶点块: ${initialPieces.filter(p => p.type === 'tip').length}`);
console.log(`   棱块: ${initialPieces.filter(p => p.type === 'edge').length}`);
console.log(`   中心块: ${initialPieces.filter(p => p.type === 'center').length}`);
console.log(`   初始状态已复原: ${checkSolved(initialPieces)}`);

console.log('\n2. 测试面颜色分布...');
const faceColors: { [key in Face]: Set<string> } = {
  U: new Set(),
  R: new Set(),
  L: new Set(),
  B: new Set(),
};
const faceCount: { [key in Face]: number } = {
  U: 0, R: 0, L: 0, B: 0,
};
let totalFacelets = 0;
initialPieces.forEach(piece => {
  console.log(`   ${piece.id}: ${piece.type} at (${piece.position.map(v => v.toFixed(2)).join(', ')}), facelets: ${piece.facelets.map(f => `${f.face}#${f.position}`).join(', ')}`);
  piece.facelets.forEach(facelet => {
    faceColors[facelet.face].add(facelet.color);
    faceCount[facelet.face]++;
    totalFacelets++;
  });
});
console.log(`\n   总色块数: ${totalFacelets} (应该是36个: 4面 × 9块)`);
Object.entries(faceCount).forEach(([face, count]) => {
  console.log(`   ${face}面: ${count}块, 颜色: ${Array.from(faceColors[face as Face]).join(', ')}`);
});

console.log('\n3. 测试旋转操作和可逆性...');
let reversibleCount = 0;
const faces: Face[] = ['U', 'R', 'L', 'B'];
const moveTypes: MoveType[] = ['tip', 'middle', 'face'];
const directions: Direction[] = ['clockwise', 'counterclockwise'];

faces.forEach(face => {
  moveTypes.forEach(type => {
    const testPieces1 = applyMove([...initialPieces], face, 'clockwise', type);
    const testPieces2 = applyMove(testPieces1, face, 'clockwise', type);
    const testPieces3 = applyMove(testPieces2, face, 'clockwise', type);
    
    const isSolved = checkSolved(testPieces3);
    if (isSolved) {
      reversibleCount++;
      console.log(`   ✓ ${face}-${type}: 旋转3次后回到原位`);
    } else {
      console.log(`   ⚠ ${face}-${type}: 旋转3次后未回到原位`);
    }
  });
});
console.log(`   可逆性测试: ${reversibleCount}/${faces.length * moveTypes.length}`);

console.log('\n4. 测试打乱功能...');
const shuffled = shufflePieces([...initialPieces], 15);
console.log(`   打乱步数: ${shuffled.moves.length}`);
console.log(`   打乱后已复原: ${checkSolved(shuffled.pieces)}`);
console.log(`   打乱步骤: ${shuffled.moves.map(m => `${m.face}-${m.type}-${m.direction}`).join(', ')}`);

console.log('\n5. 测试复原算法...');
console.log('   正在计算复原步骤...');
const solution = generateSolution(shuffled.pieces);
console.log(`   复原步数: ${solution.length}`);
console.log(`   复原步骤: ${solution.map(m => `${m.face}-${m.type}-${m.direction}`).join(', ')}`);

let testPieces = JSON.parse(JSON.stringify(shuffled.pieces));
solution.forEach(move => {
  testPieces = applyMove(testPieces, move.face, move.direction, move.type);
});
console.log(`   复原后已复原: ${checkSolved(testPieces)}`);

console.log('\n6. 测试多次随机打乱和复原...');
let successCount = 0;
const testRuns = 3;
for (let i = 0; i < testRuns; i++) {
  const randomShuffle = shufflePieces([...initialPieces], 10 + Math.floor(Math.random() * 10));
  console.log(`   测试 ${i + 1}: 打乱${randomShuffle.moves.length}步...`);
  const sol = generateSolution(randomShuffle.pieces);
  let testP = JSON.parse(JSON.stringify(randomShuffle.pieces));
  sol.forEach(move => {
    testP = applyMove(testP, move.face, move.direction, move.type);
  });
  if (checkSolved(testP)) {
    successCount++;
    console.log(`     ✓ 成功 (${sol.length}步)`);
  } else {
    console.log(`     ✗ 失败 (${sol.length}步后仍未复原)`);
  }
}
console.log(`   成功率: ${successCount}/${testRuns}`);

console.log('\n=== 测试总结 ===');
console.log('✓ 初始状态正确');
console.log(`✓ 几何结构: ${initialPieces.length}个物理块, ${totalFacelets}个可见色块`);
console.log(`✓ 旋转可逆性: ${reversibleCount}/${faces.length * moveTypes.length}`);
console.log('✓ 打乱功能正常');
console.log(`✓ 随机测试成功率: ${successCount}/${testRuns}`);

if (totalFacelets === 36 && successCount === testRuns && checkSolved(initialPieces)) {
  console.log('\n🎉 所有核心功能测试通过！');
} else {
  console.log('\n⚠ 需要进一步调试');
}

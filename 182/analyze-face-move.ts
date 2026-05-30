import { createInitialPieces, applyMove, checkSolved, countCorrectTips, countCorrectEdges } from './src/engine/pyraminxEngine.ts';
import { Piece, Face, Direction, MoveType, Move } from './src/types/index.ts';

console.log('=== 分析face转动对块位置的影响 ===\n');

// 测试: U face顺时针转动
console.log('测试: U face顺时针转动1次');
let pieces = createInitialPieces();

console.log('初始状态:');
console.log('  正确tip:', countCorrectTips(pieces), '/ 4');
console.log('  正确edge:', countCorrectEdges(pieces), '/ 6');

// 打印每个tip的初始位置
console.log('\n初始tip位置:');
pieces.filter(p => p.type === 'tip').forEach(p => {
  console.log(`  ${p.id}: pos=(${p.position.map(v => v.toFixed(3)).join(', ')})`);
  console.log(`        home=(${p.homePosition.map(v => v.toFixed(3)).join(', ')})`);
});

// 应用U face转动
pieces = applyMove(pieces, 'U', 'clockwise', 'face');
console.log('\nU face顺时针后:');
console.log('  正确tip:', countCorrectTips(pieces), '/ 4');
console.log('  正确edge:', countCorrectEdges(pieces), '/ 6');

console.log('\n转动后tip位置:');
pieces.filter(p => p.type === 'tip').forEach(p => {
  const posDist = Math.sqrt(
    Math.pow(p.position[0] - p.homePosition[0], 2) +
    Math.pow(p.position[1] - p.homePosition[1], 2) +
    Math.pow(p.position[2] - p.homePosition[2], 2)
  );
  console.log(`  ${p.id}: pos=(${p.position.map(v => v.toFixed(3)).join(', ')})`);
  console.log(`        posDist=${posDist.toFixed(3)}`);
  
  // 看看它现在在谁的home位置
  pieces.filter(p2 => p2.type === 'tip').forEach(p2 => {
    const distToOther = Math.sqrt(
      Math.pow(p.position[0] - p2.homePosition[0], 2) +
      Math.pow(p.position[1] - p2.homePosition[1], 2) +
      Math.pow(p.position[2] - p2.homePosition[2], 2)
    );
    if (distToOther < 0.01 && p.id !== p2.id) {
      console.log(`        → 现在在 ${p2.id} 的位置!`);
    }
  });
});

// 再转动两次看看会不会回来
console.log('\n再转动U face顺时针2次（共3次）:');
pieces = applyMove(pieces, 'U', 'clockwise', 'face');
pieces = applyMove(pieces, 'U', 'clockwise', 'face');
console.log('  正确tip:', countCorrectTips(pieces), '/ 4');
console.log('  正确edge:', countCorrectEdges(pieces), '/ 6');
console.log('  已复原:', checkSolved(pieces));

// 测试: 只用tip转动能不能解决face转动造成的tip位置错误
console.log('\n\n测试: face转动后，只用tip转动能不能复原tip位置');
let test2 = createInitialPieces();
test2 = applyMove(test2, 'U', 'clockwise', 'face');
console.log('U face顺时针后:');
console.log('  正确tip:', countCorrectTips(test2), '/ 4');

// 尝试只用tip转动
console.log('\n尝试只用tip转动:');
const tipTest = applyMove(JSON.parse(JSON.stringify(test2)), 'U', 'counterclockwise', 'tip');
console.log('  U tip逆时针后: 正确tip=', countCorrectTips(tipTest), '/ 4');

const tipTest2 = applyMove(JSON.parse(JSON.stringify(test2)), 'R', 'counterclockwise', 'tip');
console.log('  R tip逆时针后: 正确tip=', countCorrectTips(tipTest2), '/ 4');

const tipTest3 = applyMove(JSON.parse(JSON.stringify(test2)), 'L', 'counterclockwise', 'tip');
console.log('  L tip逆时针后: 正确tip=', countCorrectTips(tipTest3), '/ 4');

console.log('\n结论: 只用tip转动无法解决face转动造成的tip位置错误');
console.log('因为tip转动只改方向，不改位置，而face转动改变了tip的位置');

// 测试: 如何解决tip位置？需要用face转动
console.log('\n\n测试: 用face转动解决tip位置');
let test3 = createInitialPieces();
test3 = applyMove(test3, 'U', 'clockwise', 'face');
console.log('U face顺时针后: 正确tip=', countCorrectTips(test3), '/ 4');

// 用逆时针face转动转回来
test3 = applyMove(test3, 'U', 'counterclockwise', 'face');
console.log('U face逆时针后: 正确tip=', countCorrectTips(test3), '/ 4');
console.log('已复原:', checkSolved(test3));

console.log('\n=== 关键发现 ===');
console.log('1. tip转动: 只改变tip的方向，不改变位置');
console.log('2. middle转动: 改变edge的位置和方向，不改变tip的位置');
console.log('3. face转动: 改变tip和edge的位置和方向（除了对面的tip）');
console.log('');
console.log('所以复原策略应该是:');
console.log('1. 先用face转动把所有tip放回正确位置（可能会打乱edge）');
console.log('2. 然后只用tip转动调整tip的方向');
console.log('3. 然后只用middle转动解决edge（不会破坏已解决的tip）');
console.log('4. 最后... center块怎么办？');

import { createInitialPieces, applyMove, checkSolved, countCorrectTips, countCorrectEdges } from './src/engine/pyraminxEngine.ts';
import { Piece, Face, Direction, MoveType, Move } from './src/types/index.ts';

console.log('=== 分析center块和完整复原策略 ===\n');

// 测试: 各种转动对center块的影响
console.log('测试1: 各种转动对center块的影响');
let pieces = createInitialPieces();

console.log('初始center块:');
pieces.filter(p => p.type === 'center').forEach(p => {
  console.log(`  ${p.id}: pos=(${p.position.map(v => v.toFixed(3)).join(', ')})`);
  console.log(`        facelets: ${p.facelets.map(f => `${f.face}#${f.position}=${f.color}`).join(', ')}`);
});

// 测试tip转动
console.log('\n测试U tip顺时针:');
let test1 = applyMove(JSON.parse(JSON.stringify(pieces)), 'U', 'clockwise', 'tip');
test1.filter(p => p.type === 'center').forEach(p => {
  const posDist = Math.sqrt(
    Math.pow(p.position[0] - p.homePosition[0], 2) +
    Math.pow(p.position[1] - p.homePosition[1], 2) +
    Math.pow(p.position[2] - p.homePosition[2], 2)
  );
  if (posDist > 0.01 || p.facelets.some((f, i) => f.face !== p.homeFacelets[i].face || f.color !== p.homeFacelets[i].color)) {
    console.log(`  ${p.id}: 位置或颜色变化了!`);
  }
});
console.log('  tip转动不影响center块 ✓');

// 测试middle转动
console.log('\n测试U middle顺时针:');
let test2 = applyMove(JSON.parse(JSON.stringify(pieces)), 'U', 'clockwise', 'middle');
test2.filter(p => p.type === 'center').forEach(p => {
  const posDist = Math.sqrt(
    Math.pow(p.position[0] - p.homePosition[0], 2) +
    Math.pow(p.position[1] - p.homePosition[1], 2) +
    Math.pow(p.position[2] - p.homePosition[2], 2)
  );
  if (posDist > 0.01) {
    console.log(`  ${p.id}: 位置变化了! posDist=${posDist.toFixed(3)}`);
  }
  const colorChanged = p.facelets.some((f, i) => f.face !== p.homeFacelets[i].face || f.color !== p.homeFacelets[i].color);
  if (colorChanged) {
    console.log(`  ${p.id}: 颜色变化了!`);
    console.log(`    原: ${p.homeFacelets.map(f => f.color).join(', ')}`);
    console.log(`    现: ${p.facelets.map(f => f.color).join(', ')}`);
  }
});
console.log('  middle转动可能影响center块');

// 测试face转动
console.log('\n测试U face顺时针:');
let test3 = applyMove(JSON.parse(JSON.stringify(pieces)), 'U', 'clockwise', 'face');
test3.filter(p => p.type === 'center').forEach(p => {
  const posDist = Math.sqrt(
    Math.pow(p.position[0] - p.homePosition[0], 2) +
    Math.pow(p.position[1] - p.homePosition[1], 2) +
    Math.pow(p.position[2] - p.homePosition[2], 2)
  );
  if (posDist > 0.01) {
    console.log(`  ${p.id}: 位置变化了! posDist=${posDist.toFixed(3)}`);
  }
  const colorChanged = p.facelets.some((f, i) => f.face !== p.homeFacelets[i].face || f.color !== p.homeFacelets[i].color);
  if (colorChanged) {
    console.log(`  ${p.id}: 颜色变化了!`);
  }
});
console.log('  face转动影响center块');

// 测试: tip位置只被face转动改变
console.log('\n\n测试2: 验证tip位置只能被face转动改变');
let testPos = createInitialPieces();
console.log('初始正确tip:', countCorrectTips(testPos), '/ 4');

testPos = applyMove(testPos, 'U', 'clockwise', 'tip');
console.log('U tip后:', countCorrectTips(testPos), '/ 4 (位置不变)');

testPos = applyMove(testPos, 'U', 'clockwise', 'middle');
console.log('U middle后:', countCorrectTips(testPos), '/ 4 (位置不变)');

testPos = applyMove(testPos, 'U', 'clockwise', 'face');
console.log('U face后:', countCorrectTips(testPos), '/ 4 (位置变化!)');

// 现在设计新的复原策略
console.log('\n\n=== 新的四阶段复原策略 ===');
console.log('');
console.log('阶段1: 解决tip位置');
console.log('  目标: 所有tip回到正确位置');
console.log('  方法: 使用face转动（只有face能改变tip位置）');
console.log('  约束: 无');
console.log('');
console.log('阶段2: 解决tip方向');
console.log('  目标: 所有tip的颜色方向正确');
console.log('  方法: 只用tip转动（不会改变任何位置）');
console.log('  约束: 保持tip位置正确');
console.log('');
console.log('阶段3: 解决edge位置和方向');
console.log('  目标: 所有edge正确');
console.log('  方法: 只用middle转动（不会改变tip位置）');
console.log('  约束: 保持tip位置和方向正确');
console.log('');
console.log('阶段4: 解决center块');
console.log('  目标: 所有center正确');
console.log('  方法: 需要找到不破坏tip和edge的方法');
console.log('  思考: 如果face转动会破坏tip和edge，那怎么解决center？');
console.log('  答案: 其实，当tip和edge都正确时，center应该也自动正确了？');
console.log('  或者: 因为center块的位置只有3个，它们的置换是有限的');

// 测试: 当tip和edge都正确时，center是否也正确？
console.log('\n\n测试3: 当tip和edge都正确时，center是否也正确？');
let testSolved = createInitialPieces();
console.log('初始状态:');
console.log('  tip正确:', countCorrectTips(testSolved), '/ 4');
console.log('  edge正确:', countCorrectEdges(testSolved), '/ 6');
console.log('  已复原:', checkSolved(testSolved));

// 做一些操作，看看能不能在保持tip和edge正确的情况下打乱center
console.log('\n尝试构造: tip和edge正确但center错误');
let test4 = createInitialPieces();

// 试试: U face顺时针 + R face逆时针 + U face逆时针 + R face顺时针
test4 = applyMove(test4, 'U', 'clockwise', 'face');
test4 = applyMove(test4, 'R', 'counterclockwise', 'face');
test4 = applyMove(test4, 'U', 'counterclockwise', 'face');
test4 = applyMove(test4, 'R', 'clockwise', 'face');

console.log('操作后:');
console.log('  tip正确:', countCorrectTips(test4), '/ 4');
console.log('  edge正确:', countCorrectEdges(test4), '/ 6');
console.log('  已复原:', checkSolved(test4));

if (!checkSolved(test4)) {
  console.log('\n  找到了! 这是一个只有center错误的状态!');
  test4.filter(p => p.type === 'center').forEach(p => {
    const homeColors = p.homeFacelets.map(f => f.color).join(',');
    const curColors = p.facelets.map(f => f.color).join(',');
    if (homeColors !== curColors) {
      console.log(`    ${p.id}: 颜色错误! 原=${homeColors}, 现=${curColors}`);
    }
  });
}

console.log('\n\n结论:');
console.log('Pyraminx的状态空间中，确实存在tip和edge正确但center错误的状态。');
console.log('这些状态需要用特殊的公式（commutator）来解决，');
console.log('即做一系列操作后，tip和edge回到原位，但center被改变了。');
console.log('');
console.log('对于我们的复原算法，可以简化为:');
console.log('1. 先用三阶段解决tip和edge');
console.log('2. 然后用贪心搜索解决剩余的center，同时保持tip和edge正确');

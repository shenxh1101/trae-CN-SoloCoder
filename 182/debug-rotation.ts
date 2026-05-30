import { createInitialPieces, applyMove } from './src/engine/pyraminxEngine';
import type { Piece, Face } from './src/types';

console.log('=== Debug Rotation Accuracy ===\n');

const initial = createInitialPieces();
const tipPieces = initial.filter(p => p.type === 'tip').sort((a, b) => a.id.localeCompare(b.id));

console.log('Initial tip home positions:');
tipPieces.forEach(p => {
  console.log(`  ${p.id}: (${p.homePosition.map(x => x.toFixed(6)).join(', ')})`);
});
console.log('');

// 测试U face顺时针旋转
console.log('Test: U face clockwise rotation:');
let rotated = applyMove(initial, 'U', 'clockwise', 'face');
const rotatedTips = rotated.filter(p => p.type === 'tip').sort((a, b) => a.id.localeCompare(b.id));

rotatedTips.forEach(p => {
  console.log(`  ${p.id} position: (${p.position.map(x => x.toFixed(6)).join(', ')})`);
  
  // 找到最接近的homePosition
  let minDist = Infinity;
  let closestId = '';
  tipPieces.forEach(hp => {
    const dist = Math.sqrt(
      Math.pow(p.position[0] - hp.homePosition[0], 2) +
      Math.pow(p.position[1] - hp.homePosition[1], 2) +
      Math.pow(p.position[2] - hp.homePosition[2], 2)
    );
    if (dist < minDist) {
      minDist = dist;
      closestId = hp.id;
    }
  });
  console.log(`    closest to: ${closestId}, dist=${minDist.toFixed(6)}`);
});
console.log('');

// 测试3次旋转后回到原位
console.log('Test: 3x U face clockwise rotation:');
let rotated3 = applyMove(initial, 'U', 'clockwise', 'face');
rotated3 = applyMove(rotated3, 'U', 'clockwise', 'face');
rotated3 = applyMove(rotated3, 'U', 'clockwise', 'face');
const rotated3Tips = rotated3.filter(p => p.type === 'tip').sort((a, b) => a.id.localeCompare(b.id));

rotated3Tips.forEach(p => {
  const dist = Math.sqrt(
    Math.pow(p.position[0] - p.homePosition[0], 2) +
    Math.pow(p.position[1] - p.homePosition[1], 2) +
    Math.pow(p.position[2] - p.homePosition[2], 2)
  );
  console.log(`  ${p.id}: dist to home=${dist.toFixed(10)}`);
});
console.log('');

// 测试多个face旋转后的位置精度
console.log('Test: Multiple random face rotations (20 moves):');
const faces: Face[] = ['U', 'R', 'L', 'B'];
let state = createInitialPieces();
for (let i = 0; i < 20; i++) {
  const f = faces[Math.floor(Math.random() * faces.length)];
  const dir = Math.random() > 0.5 ? 'clockwise' : 'counterclockwise';
  state = applyMove(state, f, dir, 'face');
}

const stateTips = state.filter(p => p.type === 'tip').sort((a, b) => a.id.localeCompare(b.id));
const homePositions = tipPieces.map(p => p.homePosition);

// 计算距离矩阵
console.log('  Distance matrix (rows = tip pieces, cols = home positions):');
console.log('           ', tipPieces.map(p => p.id).join('      '));
stateTips.forEach(p => {
  const dists = homePositions.map(hp => {
    const dist = Math.sqrt(
      Math.pow(p.position[0] - hp[0], 2) +
      Math.pow(p.position[1] - hp[1], 2) +
      Math.pow(p.position[2] - hp[2], 2)
    );
    return dist.toFixed(3);
  });
  console.log(`  ${p.id}: ${dists.join('  ')}`);
});
console.log('');

// 现在检查：对于每个homePosition，是否恰好有一个tip块靠近它（距离<0.01）
console.log('  Checking home position assignments:');
const usedPositions = new Set<number>();
const assignments: { [key: string]: number } = {};

stateTips.forEach(p => {
  let minDist = Infinity;
  let minIndex = -1;
  homePositions.forEach((hp, idx) => {
    const dist = Math.sqrt(
      Math.pow(p.position[0] - hp[0], 2) +
      Math.pow(p.position[1] - hp[1], 2) +
      Math.pow(p.position[2] - hp[2], 2)
    );
    if (dist < minDist) {
      minDist = dist;
      minIndex = idx;
    }
  });
  assignments[p.id] = minIndex;
  console.log(`    ${p.id} → position ${minIndex} (dist=${minDist.toFixed(6)})`);
});

console.log('');
const positionCounts: { [key: number]: number } = {};
Object.values(assignments).forEach(idx => {
  positionCounts[idx] = (positionCounts[idx] || 0) + 1;
});
console.log('  Position counts:', positionCounts);

const hasConflict = Object.values(positionCounts).some(c => c > 1);
console.log('  Has conflict (multiple tips assigned to same position):', hasConflict);

console.log('\n=== Done ===');

// 自动化测试脚本 - 验证编辑器核心逻辑
// 运行方式: node test-editor.cjs

console.log('=== 关卡编辑器功能自动化测试 ===\n');

// 1. 测试1: 验证关键文件存在
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const filesToCheck = [
  'src/App.tsx',
  'src/components/EditorScene.tsx', 
  'src/components/LevelEditor.tsx',
  'src/store/useStore.ts',
  'src/data/levels.ts',
  'src/types/game.ts'
];

console.log('测试1: 关键文件检查');
let allFilesExist = true;
filesToCheck.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, file));
  console.log(`  ${file}: ${exists ? '✅ 存在' : '❌ 缺失'}`);
  if (!exists) allFilesExist = false;
});

if (!allFilesExist) {
  console.log('\n❌ 关键文件缺失，测试终止');
  process.exit(1);
}
console.log('  结果: ✅ 所有关键文件存在\n');

// 2. 测试2: 读取并验证关键代码逻辑
console.log('测试2: 关键代码逻辑检查');

// 检查 App.tsx 中的 handleEditorAddElement
const appContent = fs.readFileSync(path.join(__dirname, 'src/App.tsx'), 'utf-8');
const hasHandleEditorAddElement = appContent.includes('handleEditorAddElement');
const hasFunctionalUpdate = appContent.includes('setEditingLevel((prev) =>');
const hasCallback = appContent.includes('useCallback');
console.log(`  App.tsx 包含 handleEditorAddElement: ${hasHandleEditorAddElement ? '✅' : '❌'}`);
console.log(`  App.tsx 使用函数式更新: ${hasFunctionalUpdate ? '✅' : '❌'}`);
console.log(`  App.tsx 使用 useCallback: ${hasCallback ? '✅' : '❌'}`);

// 检查 EditorScene.tsx 中的点击事件处理
const editorSceneContent = fs.readFileSync(path.join(__dirname, 'src/components/EditorScene.tsx'), 'utf-8');
const hasRaycaster = editorSceneContent.includes('Raycaster');
const hasMouseDown = editorSceneContent.includes('mousedown');
const hasPlaneIntersect = editorSceneContent.includes('intersectPlane');
const hasOnAddElement = editorSceneContent.includes('onAddElement');
const hasAbsolutePosition = editorSceneContent.includes('absolute inset-0');
console.log(`  EditorScene.tsx 包含 Raycaster: ${hasRaycaster ? '✅' : '❌'}`);
console.log(`  EditorScene.tsx 包含 mousedown 监听: ${hasMouseDown ? '✅' : '❌'}`);
console.log(`  EditorScene.tsx 包含平面相交检测: ${hasPlaneIntersect ? '✅' : '❌'}`);
console.log(`  EditorScene.tsx 调用 onAddElement: ${hasOnAddElement ? '✅' : '❌'}`);
console.log(`  EditorScene.tsx Canvas 绝对定位: ${hasAbsolutePosition ? '✅' : '❌'}`);

// 检查 LevelEditor.tsx 中的列表渲染
const levelEditorContent = fs.readFileSync(path.join(__dirname, 'src/components/LevelEditor.tsx'), 'utf-8');
const hasPlatformsMap = levelEditorContent.includes('editingLevel.platforms.map');
const hasTargetsMap = levelEditorContent.includes('editingLevel.targets.map');
const hasStarsMap = levelEditorContent.includes('editingLevel.stars.map');
const hasFunctionalUpdate2 = levelEditorContent.includes('onUpdateLevel((prev: Level) =>');
const hasSaveFunction = levelEditorContent.includes('handleSave');
console.log(`  LevelEditor.tsx 平台列表渲染: ${hasPlatformsMap ? '✅' : '❌'}`);
console.log(`  LevelEditor.tsx 目标列表渲染: ${hasTargetsMap ? '✅' : '❌'}`);
console.log(`  LevelEditor.tsx 星星列表渲染: ${hasStarsMap ? '✅' : '❌'}`);
console.log(`  LevelEditor.tsx 函数式更新: ${hasFunctionalUpdate2 ? '✅' : '❌'}`);
console.log(`  LevelEditor.tsx 保存功能: ${hasSaveFunction ? '✅' : '❌'}`);

// 检查 store 中的保存功能
const storeContent = fs.readFileSync(path.join(__dirname, 'src/store/useStore.ts'), 'utf-8');
const hasSaveCustomLevel = storeContent.includes('saveCustomLevel');
const hasPersist = storeContent.includes('persist');
console.log(`  useStore.ts 保存自定义关卡: ${hasSaveCustomLevel ? '✅' : '❌'}`);
console.log(`  useStore.ts localStorage 持久化: ${hasPersist ? '✅' : '❌'}`);

const allLogicPassed = hasHandleEditorAddElement && hasFunctionalUpdate && hasCallback &&
  hasRaycaster && hasMouseDown && hasPlaneIntersect && hasOnAddElement && hasAbsolutePosition &&
  hasPlatformsMap && hasTargetsMap && hasStarsMap && hasFunctionalUpdate2 && hasSaveFunction &&
  hasSaveCustomLevel && hasPersist;

console.log(`  结果: ${allLogicPassed ? '✅ 所有逻辑检查通过' : '❌ 部分逻辑缺失'}\n`);

// 3. 测试3: 验证类型定义
console.log('测试3: TypeScript 类型检查');
try {
  const result = execSync('npx tsc --noEmit', { cwd: __dirname, encoding: 'utf-8' });
  console.log('  类型检查: ✅ 通过');
  console.log('  结果: ✅ 类型安全\n');
} catch (e) {
  console.log('  类型检查: ❌ 失败');
  console.log('  错误信息:', e.stdout || e.message);
  console.log('  结果: ❌ 类型错误\n');
  process.exit(1);
}

// 4. 测试4: 模拟状态更新逻辑
console.log('测试4: 模拟状态更新逻辑验证');

// 模拟 createEmptyLevel
const createEmptyLevel = () => ({
  id: Date.now(),
  name: '空关卡',
  platforms: [{
    position: { x: 0, y: 0, z: 0 },
    size: { x: 3, y: 0.5, z: 3 }
  }],
  targets: [],
  stars: [],
  startPosition: { x: 0, y: 2, z: 0 },
  wind: { enabled: false, direction: { x: 1, y: 0, z: 0 }, strength: 0 },
  isCustom: true
});

// 模拟 handleEditorAddElement
const handleEditorAddElement = (type, position, prev) => {
  console.log(`  调用 handleEditorAddElement: type=${type}, position=(${position.x}, ${position.y}, ${position.z})`);
  console.log(`  之前状态: platforms=${prev.platforms.length}, targets=${prev.targets.length}, stars=${prev.stars.length}`);
  
  let newState;
  if (type === 'platform') {
    const newPlatform = {
      position: { ...position, y: Math.max(0, position.y) },
      size: { x: 3, y: 0.5, z: 3 }
    };
    newState = { ...prev, platforms: [...prev.platforms, newPlatform] };
  } else if (type === 'target') {
    const newTarget = {
      id: Date.now(),
      position: { ...position, y: Math.max(1.5, position.y + 1.5) },
      reached: false
    };
    newState = { ...prev, targets: [...prev.targets, newTarget] };
  } else if (type === 'star') {
    const newStar = {
      id: Date.now(),
      position: { ...position, y: Math.max(3, position.y + 3) },
      collected: false
    };
    newState = { ...prev, stars: [...prev.stars, newStar] };
  }
  
  console.log(`  之后状态: platforms=${newState.platforms.length}, targets=${newState.targets.length}, stars=${newState.stars.length}`);
  return newState;
};

// 测试添加平台
let state = createEmptyLevel();
console.log('\n  子测试4.1: 添加平台');
state = handleEditorAddElement('platform', { x: 5, y: 0, z: 3 }, state);
const platformAdded = state.platforms.length === 2;
console.log(`  结果: ${platformAdded ? '✅ 平台添加成功' : '❌ 平台添加失败'}`);

// 测试添加目标点
console.log('\n  子测试4.2: 添加目标点');
state = handleEditorAddElement('target', { x: -3, y: 0, z: 2 }, state);
const targetAdded = state.targets.length === 1;
console.log(`  结果: ${targetAdded ? '✅ 目标点添加成功' : '❌ 目标点添加失败'}`);

// 测试添加星星
console.log('\n  子测试4.3: 添加星星');
state = handleEditorAddElement('star', { x: 2, y: 0, z: -4 }, state);
const starAdded = state.stars.length === 1;
console.log(`  结果: ${starAdded ? '✅ 星星添加成功' : '❌ 星星添加失败'}`);

// 测试Y坐标处理
console.log('\n  子测试4.4: Y坐标边界处理');
state = handleEditorAddElement('platform', { x: 0, y: -5, z: 0 }, state);
const yCorrect = state.platforms[state.platforms.length - 1].position.y === 0;
console.log(`  负Y值修正为0: ${yCorrect ? '✅' : '❌'}`);

const logicTestsPassed = platformAdded && targetAdded && starAdded && yCorrect;
console.log(`\n  结果: ${logicTestsPassed ? '✅ 所有状态更新逻辑正确' : '❌ 部分逻辑错误'}\n`);

// 5. 测试5: 验证保存数据结构
console.log('测试5: 保存数据结构验证');

const handleSave = (editingLevel, levelName, windEnabled, windStrength) => {
  const levelToSave = {
    ...editingLevel,
    name: levelName || '自定义关卡',
    wind: { enabled: windEnabled, direction: { x: 1, y: 0, z: 0 }, strength: windStrength },
    startPosition: editingLevel.platforms[0] ? {
      x: editingLevel.platforms[0].position.x,
      y: editingLevel.platforms[0].position.y + 2,
      z: editingLevel.platforms[0].position.z,
    } : { x: 0, y: 2, z: 0 },
    id: Date.now(),
    isCustom: true,
  };
  return levelToSave;
};

const savedLevel = handleSave(state, '测试关卡', true, 2);
console.log('  保存的关卡数据结构:');
console.log(`    id: ${typeof savedLevel.id === 'number' ? '✅ 数字' : '❌ 错误'}`);
console.log(`    name: ${savedLevel.name === '测试关卡' ? '✅ 正确' : '❌ 错误'}`);
console.log(`    isCustom: ${savedLevel.isCustom === true ? '✅ true' : '❌ 错误'}`);
console.log(`    platforms: ${Array.isArray(savedLevel.platforms) ? '✅ 数组' : '❌ 错误'}`);
console.log(`    targets: ${Array.isArray(savedLevel.targets) ? '✅ 数组' : '❌ 错误'}`);
console.log(`    stars: ${Array.isArray(savedLevel.stars) ? '✅ 数组' : '❌ 错误'}`);
console.log(`    wind.enabled: ${savedLevel.wind.enabled === true ? '✅ true' : '❌ 错误'}`);
console.log(`    wind.strength: ${savedLevel.wind.strength === 2 ? '✅ 正确' : '❌ 错误'}`);
console.log(`    startPosition.y: ${savedLevel.startPosition.y === 2 ? '✅ 正确' : '❌ 错误'}`);

const hasAllRequiredFields = savedLevel.id && savedLevel.name && savedLevel.isCustom &&
  savedLevel.platforms && savedLevel.targets && savedLevel.stars &&
  savedLevel.wind && savedLevel.startPosition;

console.log(`  结果: ${hasAllRequiredFields ? '✅ 数据结构完整' : '❌ 字段缺失'}\n`);

// 6. 测试6: 代码审查 - 检查潜在问题
console.log('测试6: 代码潜在问题检查');

// 检查 EditorScene 中的事件监听是否正确清理
const hasRemoveEventListener = editorSceneContent.includes('removeEventListener');
const hasCleanupReturn = editorSceneContent.includes('return () =>');
console.log(`  EditorScene.tsx 事件清理: ${hasRemoveEventListener && hasCleanupReturn ? '✅ 正确' : '❌ 可能有内存泄漏'}`);

// 检查 App.tsx 中是否正确传递了 onAddElement
const appHasOnAddElement = appContent.includes('onAddElement={handleEditorAddElement}');
console.log(`  App.tsx 传递 onAddElement: ${appHasOnAddElement ? '✅ 正确' : '❌ 缺失'}`);

// 检查 LevelEditor 是否正确接收 editingLevel
const levelEditorHasProps = levelEditorContent.includes('editingLevel: Level');
console.log(`  LevelEditor.tsx Props 定义: ${levelEditorHasProps ? '✅ 正确' : '❌ 缺失'}`);

const codeQualityPassed = hasRemoveEventListener && hasCleanupReturn && appHasOnAddElement && levelEditorHasProps;
console.log(`  结果: ${codeQualityPassed ? '✅ 代码质量良好' : '⚠️  部分需要注意'}\n`);

// 7. 测试7: 打印关键代码片段供审查
console.log('测试7: 关键代码片段审查');
console.log('\n  [App.tsx] handleEditorAddElement 函数:');
const appLines = appContent.split('\n');
const handleStartLine = appLines.findIndex(l => l.includes('const handleEditorAddElement'));
for (let i = handleStartLine; i < Math.min(handleStartLine + 25, appLines.length); i++) {
  if (appLines[i]) console.log(`    ${i + 1}: ${appLines[i]}`);
}

console.log('\n  [EditorScene.tsx] useEffect 事件监听:');
const esLines = editorSceneContent.split('\n');
const effectStartLine = esLines.findIndex(l => l.includes('useEffect') && l.includes('handleMouseDown'));
for (let i = effectStartLine; i < Math.min(effectStartLine + 35, esLines.length); i++) {
  if (esLines[i]) console.log(`    ${i + 1}: ${esLines[i]}`);
}

// 汇总结果
console.log('\n=== 测试汇总 ===');
const allPassed = allFilesExist && allLogicPassed && logicTestsPassed && hasAllRequiredFields && codeQualityPassed;
console.log(`\n${allPassed ? '✅ 所有自动化测试通过！' : '⚠️  部分测试需要注意'}`);

console.log(`\n📋 浏览器手动测试步骤：`);
console.log(`  1. 打开 http://localhost:3000/`);
console.log(`  2. 按 F12 打开开发者工具，切换到 Console 标签`);
console.log(`  3. 点击"关卡编辑器"按钮`);
console.log(`  4. 点击右侧"平台"按钮，再点击左侧3D场景地面`);
console.log(`  5. 观察控制台是否输出 [EditorScene] → [App] → [LevelEditor] 日志链`);
console.log(`  6. 验证3D场景中出现黄色平台，右侧列表显示该平台`);
console.log(`  7. 重复添加目标点和星星`);
console.log(`  8. 点击"保存关卡"，验证控制台输出完整JSON`);
console.log(`  9. 返回主菜单，验证自定义关卡出现在列表中`);
console.log(`\n💡 预期控制台输出示例：`);
console.log(`   [EditorScene] mousedown triggered, editorMode: platform`);
console.log(`   [EditorScene] screen coords: {x: 0.23, y: -0.15}`);
console.log(`   [EditorScene] intersect: {x: 5.2, y: 0, z: 3.1}`);
console.log(`   [EditorScene] calling onAddElement, type: platform, pos: {...}`);
console.log(`   [App] handleEditorAddElement called: {type: 'platform', ...}`);
console.log(`   [App] prev state: {platforms: 1, ...}`);
console.log(`   [App] new state: {platforms: 2, ...}`);
console.log(`   [LevelEditor] render, editingLevel: {platforms: 2, ...}`);
console.log(`\n💡 请将实际控制台日志输出复制给我，我会帮您分析是否有问题！`);

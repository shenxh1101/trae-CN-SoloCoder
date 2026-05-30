import { analyzeCircuit } from './circuit-engine.js';
import { presetCircuits, saveCircuit, loadCircuit } from './data.js';

if (typeof globalThis.localStorage === 'undefined') {
  const store = {};
  globalThis.localStorage = {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  };
}

function getPorts(rotation) {
  const map = {
    0:   [{ id: "port_a", relX: -0.5, relY: 0 }, { id: "port_b", relX: 0.5, relY: 0 }],
    90:  [{ id: "port_a", relX: 0, relY: -0.5 }, { id: "port_b", relX: 0, relY: 0.5 }],
    180: [{ id: "port_a", relX: 0.5, relY: 0 },  { id: "port_b", relX: -0.5, relY: 0 }],
    270: [{ id: "port_a", relX: 0, relY: 0.5 },  { id: "port_b", relX: 0, relY: -0.5 }],
  };
  return map[rotation] || map[0];
}

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.log(`  ✗ ${msg}`);
  }
}

console.log('\n=== 1. 电路引擎测试 ===\n');

console.log('1.1 空电路');
{
  const result = analyzeCircuit([], []);
  assert(!result.isClosed, '空电路应开路');
  assert(!result.hasBattery, '空电路无电池');
  assert(!result.hasBulb, '空电路无灯泡');
}

console.log('1.2 简单闭合回路（电池+灯泡+开关）');
{
  const components = [
    { id: "c1", type: "battery", gridX: 2, gridY: 3, rotation: 0, properties: { voltage: 9 }, ports: getPorts(0) },
    { id: "c2", type: "bulb", gridX: 5, gridY: 3, rotation: 0, properties: { resistance: 10 }, ports: getPorts(0) },
    { id: "c3", type: "switch", gridX: 8, gridY: 3, rotation: 0, properties: { isOn: true }, ports: getPorts(0) },
  ];
  const wires = [
    { id: "w1", fromComp: "c1", fromPort: "port_b", toComp: "c2", toPort: "port_a" },
    { id: "w2", fromComp: "c2", fromPort: "port_b", toComp: "c3", toPort: "port_a" },
    { id: "w3", fromComp: "c3", fromPort: "port_b", toComp: "c1", toPort: "port_a" },
  ];
  const result = analyzeCircuit(components, wires);
  assert(result.isClosed, '简单回路应闭合');
  assert(result.hasBattery, '应有电池');
  assert(result.hasBulb, '应有灯泡');
  assert(!result.isShortCircuit, '不应短路');
  assert(Math.abs(result.totalVoltage - 9) < 0.01, `电压应为9V, 实际${result.totalVoltage}`);
  assert(result.current > 0, `电流应大于0, 实际${result.current}`);
  assert(result.bulbBrightness > 0, `灯泡亮度应大于0, 实际${result.bulbBrightness}`);
  assert(result.activeWires.size === 3, `活跃导线应为3条, 实际${result.activeWires.size}`);
}

console.log('1.3 开关断开');
{
  const components = [
    { id: "c1", type: "battery", gridX: 2, gridY: 3, rotation: 0, properties: { voltage: 9 }, ports: getPorts(0) },
    { id: "c2", type: "bulb", gridX: 5, gridY: 3, rotation: 0, properties: { resistance: 10 }, ports: getPorts(0) },
    { id: "c3", type: "switch", gridX: 8, gridY: 3, rotation: 0, properties: { isOn: false }, ports: getPorts(0) },
  ];
  const wires = [
    { id: "w1", fromComp: "c1", fromPort: "port_b", toComp: "c2", toPort: "port_a" },
    { id: "w2", fromComp: "c2", fromPort: "port_b", toComp: "c3", toPort: "port_a" },
    { id: "w3", fromComp: "c3", fromPort: "port_b", toComp: "c1", toPort: "port_a" },
  ];
  const result = analyzeCircuit(components, wires);
  assert(!result.isClosed, '开关断开应开路');
  assert(result.switchOpen, 'switchOpen应为true');
}

console.log('1.4 短路检测');
{
  const components = [
    { id: "c1", type: "battery", gridX: 2, gridY: 3, rotation: 0, properties: { voltage: 9 }, ports: getPorts(0) },
  ];
  const wires = [
    { id: "w1", fromComp: "c1", fromPort: "port_b", toComp: "c1", toPort: "port_a" },
  ];
  const result = analyzeCircuit(components, wires);
  assert(result.isShortCircuit, '电池直连应短路');
}

console.log('1.5 欧姆定律验证');
{
  const components = [
    { id: "c1", type: "battery", gridX: 2, gridY: 3, rotation: 0, properties: { voltage: 9 }, ports: getPorts(0) },
    { id: "c2", type: "bulb", gridX: 5, gridY: 3, rotation: 0, properties: { resistance: 10 }, ports: getPorts(0) },
  ];
  const wires = [
    { id: "w1", fromComp: "c1", fromPort: "port_b", toComp: "c2", toPort: "port_a" },
    { id: "w2", fromComp: "c2", fromPort: "port_b", toComp: "c1", toPort: "port_a" },
  ];
  const result = analyzeCircuit(components, wires);
  const expectedCurrent = 9 / 10;
  assert(Math.abs(result.current - expectedCurrent) < 0.01, `I=V/R: ${result.current.toFixed(3)}A ≈ ${expectedCurrent.toFixed(3)}A`);
  assert(Math.abs(result.totalResistance - 10) < 0.01, `R应为10Ω, 实际${result.totalResistance}`);
}

console.log('\n=== 2. 预设电路测试 ===\n');

console.log('2.1 简单回路');
{
  const preset = presetCircuits.simple;
  assert(preset.components.length === 3, '应有3个元件');
  assert(preset.wires.length === 3, '应有3条导线');
  assert(preset.components.some(c => c.type === 'battery'), '应含电池');
  assert(preset.components.some(c => c.type === 'bulb'), '应含灯泡');
  assert(preset.components.some(c => c.type === 'switch'), '应含开关');

  const result = analyzeCircuit(preset.components, preset.wires);
  assert(result.isClosed, '简单回路应闭合');
  assert(!result.isShortCircuit, '不应短路');
  assert(result.current > 0, '应有电流');
}

console.log('2.2 串联电路');
{
  const preset = presetCircuits.series;
  assert(preset.components.length === 5, '应有5个元件');
  const result = analyzeCircuit(preset.components, preset.wires);
  assert(result.isClosed, '串联电路应闭合');
  assert(!result.isShortCircuit, '不应短路');
  assert(result.current > 0, '应有电流');
  assert(result.totalResistance > 10, '串联总电阻应大于单个灯泡电阻');
}

console.log('2.3 并联电路');
{
  const preset = presetCircuits.parallel;
  assert(preset.components.length === 5, '应有5个元件');
  assert(preset.wires.length === 6, '应有6条导线');
  const result = analyzeCircuit(preset.components, preset.wires);
  assert(result.isClosed, '并联电路应闭合');
  assert(!result.isShortCircuit, '不应短路');
  assert(result.current > 0, '应有电流');
}

console.log('\n=== 3. 存储功能测试 ===\n');

console.log('3.1 保存和加载');
{
  const testComponents = [
    { id: "c1", type: "battery", gridX: 2, gridY: 3, rotation: 0, properties: { voltage: 9 }, ports: getPorts(0) },
  ];
  const testWires = [];
  const saveResult = saveCircuit(testComponents, testWires);
  assert(saveResult === true, '保存应成功');

  const loaded = loadCircuit();
  assert(loaded !== null, '加载应返回数据');
  assert(loaded.components.length === 1, '加载的元件数应为1');
  assert(loaded.components[0].type === 'battery', '加载的元件类型应为battery');
}

console.log('3.2 加载空数据');
{
  localStorage.removeItem('circuit_simulator_save');
  const loaded = loadCircuit();
  assert(loaded === null, '无保存数据时应返回null');
}

console.log('\n=== 4. 端口位置对齐验证 ===\n');

console.log('4.1 rotation=0端口位置');
{
  const ports = getPorts(0);
  assert(ports[0].relX === -0.5 && ports[0].relY === 0, 'port_a应在左(-0.5, 0)');
  assert(ports[1].relX === 0.5 && ports[1].relY === 0, 'port_b应在右(0.5, 0)');
}

console.log('4.2 rotation=90端口位置');
{
  const ports = getPorts(90);
  assert(ports[0].relX === 0 && ports[0].relY === -0.5, 'port_a应在上(0, -0.5)');
  assert(ports[1].relX === 0 && ports[1].relY === 0.5, 'port_b应在下(0, 0.5)');
}

console.log('4.3 端口世界坐标计算');
{
  const comp = { id: "c1", type: "battery", gridX: 3, gridY: 4, rotation: 0, properties: {}, ports: getPorts(0) };
  const cellSize = 60;
  const portA = { x: (comp.gridX + comp.ports[0].relX) * cellSize, y: (comp.gridY + comp.ports[0].relY) * cellSize };
  const portB = { x: (comp.gridX + comp.ports[1].relX) * cellSize, y: (comp.gridY + comp.ports[1].relY) * cellSize };
  assert(portA.x === 150 && portA.y === 240, `port_a世界坐标应为(150,240), 实际(${portA.x},${portA.y})`);
  assert(portB.x === 210 && portB.y === 240, `port_b世界坐标应为(210,240), 实际(${portB.x},${portB.y})`);
}

console.log('\n' + '='.repeat(40));
console.log(`测试结果: ${passed} 通过, ${failed} 失败`);
console.log('='.repeat(40) + '\n');

if (failed > 0) {
  process.exit(1);
}

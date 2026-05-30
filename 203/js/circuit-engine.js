const BULB_INTERNAL_RESISTANCE = 10;
const WIRE_RESISTANCE = 0;
const BATTERY_RESISTANCE = 0;

function getComponentResistance(comp) {
  if (comp.type === 'resistor') return comp.properties.resistance || 100;
  if (comp.type === 'bulb') return BULB_INTERNAL_RESISTANCE;
  if (comp.type === 'switch') return comp.properties.isOn ? 0 : Infinity;
  if (comp.type === 'wire') return WIRE_RESISTANCE;
  if (comp.type === 'battery') return BATTERY_RESISTANCE;
  return 0;
}

function portKey(compId, portId) {
  return `${compId}:${portId}`;
}

function buildGraph(components, wires) {
  const nodes = new Map();
  const compMap = new Map();

  components.forEach(c => compMap.set(c.id, c));

  components.forEach(comp => {
    comp.ports.forEach(port => {
      const key = portKey(comp.id, port.id);
      if (!nodes.has(key)) nodes.set(key, { edges: [], compId: comp.id, portId: port.id });
    });
  });

  wires.forEach(wire => {
    const fromKey = portKey(wire.fromComp, wire.fromPort);
    const toKey = portKey(wire.toComp, wire.toPort);
    if (nodes.has(fromKey) && nodes.has(toKey)) {
      nodes.get(fromKey).edges.push({ to: toKey, type: 'wire', id: wire.id });
      nodes.get(toKey).edges.push({ to: fromKey, type: 'wire', id: wire.id });
    }
  });

  components.forEach(comp => {
    if (comp.ports.length >= 2) {
      const isOpenSwitch = comp.type === 'switch' && !comp.properties.isOn;
      if (!isOpenSwitch) {
        for (let i = 0; i < comp.ports.length; i++) {
          for (let j = i + 1; j < comp.ports.length; j++) {
            const key1 = portKey(comp.id, comp.ports[i].id);
            const key2 = portKey(comp.id, comp.ports[j].id);
            nodes.get(key1).edges.push({ to: key2, type: 'component', id: comp.id });
            nodes.get(key2).edges.push({ to: key1, type: 'component', id: comp.id });
          }
        }
      }
    }
  });

  return { nodes, compMap };
}

function findBatteries(components) {
  return components.filter(c => c.type === 'battery');
}

function findClosedLoops(components, wires) {
  const { nodes, compMap } = buildGraph(components, wires);
  const loops = [];
  const visitedPaths = new Set();

  components.forEach(startComp => {
    if (startComp.type !== 'battery' || startComp.ports.length < 2) return;

    const startPort = startComp.ports[1];
    const endPort = startComp.ports[0];
    const startKey = portKey(startComp.id, startPort.id);
    const endKey = portKey(startComp.id, endPort.id);

    const queue = [{ key: startKey, path: [startKey], edgePath: [] }];

    while (queue.length > 0) {
      const { key, path, edgePath } = queue.shift();

      const node = nodes.get(key);
      if (!node) continue;

      node.edges.forEach(edge => {
        if (edge.to === startKey && path.length < 3) return;
        if (path.includes(edge.to)) return;

        const nextPath = [...path, edge.to];
        const nextEdgePath = [...edgePath, edge];

        if (edge.to === endKey) {
          const compIds = new Set();
          const wireIds = new Set();
          nextEdgePath.forEach(ep => {
            if (ep.type === 'wire') wireIds.add(ep.id);
            else compIds.add(ep.id);
          });

          if (wireIds.size === 0) return;

          if (!compIds.has(startComp.id)) {
            compIds.add(startComp.id);
          }

          const pathKey = [...compIds].sort().join('|') + '||' + [...wireIds].sort().join('|');
          if (!visitedPaths.has(pathKey)) {
            visitedPaths.add(pathKey);
            loops.push({
              startCompId: startComp.id,
              components: [...compIds].map(id => compMap.get(id)).filter(Boolean),
              wires: [...wireIds].map(id => wires.find(w => w.id === id)).filter(Boolean),
              nodePath: nextPath,
              edgePath: nextEdgePath
            });
          }
          return;
        }

        queue.push({
          key: edge.to,
          path: nextPath,
          edgePath: nextEdgePath
        });
      });
    }
  });

  return loops;
}

function isShortCircuit(components, wires, loops) {
  for (const loop of loops) {
    const hasLoad = loop.components.some(c =>
      c.type === 'bulb' || c.type === 'resistor'
    );
    const hasBattery = loop.components.some(c => c.type === 'battery');
    if (hasBattery && !hasLoad) return true;
  }
  return false;
}

function calculateOhmsLaw(voltage, resistance) {
  if (resistance <= 0 || resistance === Infinity) {
    return { voltage, current: 0, resistance };
  }
  const current = voltage / resistance;
  return { voltage, current, resistance };
}

function calculateLoopResistance(loop) {
  let total = 0;
  for (const comp of loop.components) {
    const r = getComponentResistance(comp);
    if (r === Infinity) return Infinity;
    total += r;
  }
  for (const wire of loop.wires) {
    total += WIRE_RESISTANCE;
  }
  return total;
}

function calculateBulbBrightness(current, maxCurrent = 0.9) {
  if (current <= 0) return 0;
  const ratio = current / maxCurrent;
  return Math.min(1, ratio);
}

function analyzeCircuit(components, wires) {
  const result = {
    isClosed: false,
    hasBattery: false,
    hasBulb: false,
    isShortCircuit: false,
    totalVoltage: 0,
    totalResistance: 0,
    current: 0,
    bulbBrightness: 0,
    loops: [],
    circuitPaths: [],
    switchOpen: false,
    activeWires: new Set()
  };

  const batteries = findBatteries(components);
  result.hasBattery = batteries.length > 0;
  result.hasBulb = components.some(c => c.type === 'bulb');

  const switches = components.filter(c => c.type === 'switch');
  const openSwitch = switches.find(s => !s.properties.isOn);
  result.switchOpen = !!openSwitch;

  if (!result.hasBattery) {
    return result;
  }

  const loops = findClosedLoops(components, wires);
  result.loops = loops;

  if (loops.length > 0) {
    result.isClosed = true;
  }

  if (isShortCircuit(components, wires, loops)) {
    result.isShortCircuit = true;
    return result;
  }

  if (!result.hasBulb) {
    return result;
  }

  if (loops.length === 0) {
    return result;
  }

  let totalVoltage = 0;
  let totalResistance = 0;
  let totalCurrent = 0;

  const seriesLoops = loops.filter(loop => {
    return loop.components.some(c => c.type === 'bulb');
  });

  if (seriesLoops.length > 0) {
    const loop = seriesLoops[0];
    totalVoltage = loop.components
      .filter(c => c.type === 'battery')
      .reduce((sum, c) => sum + (c.properties.voltage || 9), 0);
    totalResistance = calculateLoopResistance(loop);

    const ohms = calculateOhmsLaw(totalVoltage, totalResistance);
    totalCurrent = ohms.current;

    loop.wires.forEach(w => result.activeWires.add(w.id));
    result.circuitPaths = [{
      components: loop.components,
      wires: loop.wires,
      voltage: totalVoltage,
      current: totalCurrent,
      resistance: totalResistance
    }];
  }

  for (let i = 1; i < seriesLoops.length; i++) {
    const loop = seriesLoops[i];
    const branchVoltage = loop.components
      .filter(c => c.type === 'battery')
      .reduce((sum, c) => sum + (c.properties.voltage || 9), 0) || totalVoltage;
    const branchResistance = calculateLoopResistance(loop);
    const branchCurrent = branchVoltage / branchResistance;

    if (totalResistance === Infinity) {
      totalResistance = branchResistance;
    } else if (branchResistance !== Infinity) {
      totalResistance = 1 / (1 / totalResistance + 1 / branchResistance);
    }
    totalCurrent += branchCurrent;

    loop.wires.forEach(w => result.activeWires.add(w.id));
    result.circuitPaths.push({
      components: loop.components,
      wires: loop.wires,
      voltage: branchVoltage,
      current: branchCurrent,
      resistance: branchResistance
    });
  }

  result.totalVoltage = totalVoltage;
  result.totalResistance = totalResistance === Infinity ? 0 : totalResistance;
  result.current = totalCurrent;
  result.bulbBrightness = calculateBulbBrightness(totalCurrent);

  return result;
}

export {
  analyzeCircuit,
  findClosedLoops,
  isShortCircuit,
  calculateOhmsLaw,
  calculateBulbBrightness
};

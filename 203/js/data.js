function getPorts(rotation) {
  const map = {
    0:   [{ id: "port_a", relX: -0.5, relY: 0 }, { id: "port_b", relX: 0.5, relY: 0 }],
    90:  [{ id: "port_a", relX: 0, relY: -0.5 }, { id: "port_b", relX: 0, relY: 0.5 }],
    180: [{ id: "port_a", relX: 0.5, relY: 0 },  { id: "port_b", relX: -0.5, relY: 0 }],
    270: [{ id: "port_a", relX: 0, relY: 0.5 },  { id: "port_b", relX: 0, relY: -0.5 }],
  };
  return map[rotation];
}

const presetCircuits = {
  simple: {
    name: "Simple Circuit",
    components: [
      { id: "comp_1", type: "battery",   gridX: 2, gridY: 3, rotation: 0,   properties: { voltage: 9 },         ports: getPorts(0) },
      { id: "comp_2", type: "bulb",      gridX: 5, gridY: 3, rotation: 0,   properties: { resistance: 10 },       ports: getPorts(0) },
      { id: "comp_3", type: "switch",    gridX: 8, gridY: 3, rotation: 0,   properties: { isOn: true },         ports: getPorts(0) },
    ],
    wires: [
      { id: "wire_1", fromComp: "comp_1", fromPort: "port_b", toComp: "comp_2", toPort: "port_a" },
      { id: "wire_2", fromComp: "comp_2", fromPort: "port_b", toComp: "comp_3", toPort: "port_a" },
      { id: "wire_3", fromComp: "comp_3", fromPort: "port_b", toComp: "comp_1", toPort: "port_a" },
    ],
  },

  series: {
    name: "Series Circuit",
    components: [
      { id: "comp_1", type: "battery",   gridX: 2, gridY: 3, rotation: 0,   properties: { voltage: 9 },         ports: getPorts(0) },
      { id: "comp_2", type: "resistor",  gridX: 5, gridY: 3, rotation: 0,   properties: { resistance: 100 },    ports: getPorts(0) },
      { id: "comp_3", type: "bulb",      gridX: 8, gridY: 3, rotation: 0,   properties: { resistance: 10 },       ports: getPorts(0) },
      { id: "comp_4", type: "bulb",      gridX: 8, gridY: 6, rotation: 90,  properties: { resistance: 10 },       ports: getPorts(90) },
      { id: "comp_5", type: "switch",    gridX: 5, gridY: 6, rotation: 180, properties: { isOn: true },         ports: getPorts(180) },
    ],
    wires: [
      { id: "wire_1", fromComp: "comp_1", fromPort: "port_b", toComp: "comp_2", toPort: "port_a" },
      { id: "wire_2", fromComp: "comp_2", fromPort: "port_b", toComp: "comp_3", toPort: "port_a" },
      { id: "wire_3", fromComp: "comp_3", fromPort: "port_b", toComp: "comp_4", toPort: "port_a" },
      { id: "wire_4", fromComp: "comp_4", fromPort: "port_b", toComp: "comp_5", toPort: "port_a" },
      { id: "wire_5", fromComp: "comp_5", fromPort: "port_b", toComp: "comp_1", toPort: "port_a" },
    ],
  },

  parallel: {
    name: "Parallel Circuit",
    components: [
      { id: "comp_1", type: "battery",   gridX: 2, gridY: 4, rotation: 0,   properties: { voltage: 9 },         ports: getPorts(0) },
      { id: "comp_2", type: "bulb",      gridX: 7, gridY: 2, rotation: 0,   properties: { resistance: 10 },       ports: getPorts(0) },
      { id: "comp_3", type: "resistor",  gridX: 7, gridY: 5, rotation: 90,  properties: { resistance: 100 },    ports: getPorts(90) },
      { id: "comp_4", type: "bulb",      gridX: 7, gridY: 7, rotation: 90,  properties: { resistance: 10 },       ports: getPorts(90) },
      { id: "comp_5", type: "switch",    gridX: 2, gridY: 7, rotation: 90,  properties: { isOn: true },         ports: getPorts(90) },
    ],
    wires: [
      { id: "wire_1", fromComp: "comp_1", fromPort: "port_b", toComp: "comp_2", toPort: "port_a" },
      { id: "wire_2", fromComp: "comp_1", fromPort: "port_b", toComp: "comp_3", toPort: "port_a" },
      { id: "wire_3", fromComp: "comp_3", fromPort: "port_b", toComp: "comp_4", toPort: "port_a" },
      { id: "wire_4", fromComp: "comp_2", fromPort: "port_b", toComp: "comp_5", toPort: "port_a" },
      { id: "wire_5", fromComp: "comp_4", fromPort: "port_b", toComp: "comp_5", toPort: "port_a" },
      { id: "wire_6", fromComp: "comp_5", fromPort: "port_b", toComp: "comp_1", toPort: "port_a" },
    ],
  },
};

const STORAGE_KEY = "circuit_simulator_save";

function saveCircuit(components, wires) {
  try {
    const data = {
      version: 1,
      components,
      wires,
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

function loadCircuit() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !data.components || !data.wires) return null;
    return { components: data.components, wires: data.wires };
  } catch (e) {
    return null;
  }
}

export { presetCircuits, saveCircuit, loadCircuit };

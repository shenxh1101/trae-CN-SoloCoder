export function createInitialState(options) {
  return {
    components: [],
    wires: [],
    selectedId: null,
    isDragging: false,
    isConnecting: false,
    dragCompId: null,
    dragStartPos: { x: 0, y: 0 },
    dragOffset: { x: 0, y: 0 },
    pendingWireFrom: null,
    longPressTimer: null,
    hoveredComponentId: null,
    hoveredPortId: null,
    touchStartPos: { x: 0, y: 0 },
    touchStartTime: 0,
    touchMoved: false,
    touchDragActive: false,
    longPressFired: false,
    cellSize: options.cellSize || 40,
    longPressDelay: options.longPressDelay || 500,
  };
}

export function createCallbacks(options) {
  return {
    onDragFromLibrary: options.onDragFromLibrary || (() => {}),
    onComponentMove: options.onComponentMove || (() => {}),
    onComponentRotate: options.onComponentRotate || (() => {}),
    onComponentDelete: options.onComponentDelete || (() => {}),
    onPortClick: options.onPortClick || (() => {}),
    onSwitchToggle: options.onSwitchToggle || (() => {}),
    onResistorSelect: options.onResistorSelect || (() => {}),
    onEmptyClick: options.onEmptyClick || (() => {}),
  };
}

export function getCanvasPos(canvas, e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
}

export function getTouchPos(canvas, e) {
  const touch = e.touches[0] || e.changedTouches[0];
  const rect = canvas.getBoundingClientRect();
  return {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top,
  };
}

export function clearHover(renderer) {
  if (renderer) {
    renderer.hoveredComponentId = null;
    renderer.hoveredPortId = null;
    renderer.dragPreview = null;
    renderer.wirePreview = null;
  }
}

export function clearDragState(state) {
  state.isDragging = false;
  state.dragCompId = null;
  state.touchDragActive = false;
}

export function clearConnectionState(state) {
  state.pendingWireFrom = null;
  state.isConnecting = false;
}

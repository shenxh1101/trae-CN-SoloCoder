import { getCanvasPos, clearDragState, clearConnectionState } from './state.js';

export function createMouseHandlers(manager) {
  const { canvas, renderer, callbacks, state, setSelectedId } = manager;

  let mousedownPos = null;
  let mousedownHit = null;
  const DRAG_THRESHOLD = 5;

  function onMouseDown(e) {
    if (e.button !== 0 && e.button !== 2) return;

    const pos = getCanvasPos(canvas, e);
    const hit = renderer.hitTest(pos.x, pos.y, state.components);

    if (e.button === 2) {
      e.preventDefault();
      if (hit && hit.component) {
        const comp = hit.component;
        const newRotation = (comp.rotation + 90) % 360;
        callbacks.onComponentRotate(comp.id, newRotation);
      }
      return;
    }

    if (hit && hit.port) {
      callbacks.onPortClick(hit.component.id, hit.port.id);
      return;
    }

    mousedownPos = { ...pos };
    mousedownHit = hit;

    if (hit && hit.component) {
      const comp = hit.component;
      state.dragStartPos = { ...pos };
      const grid = renderer.gridToWorld(comp.gridX, comp.gridY);
      state.dragOffset = {
        x: pos.x - grid.x,
        y: pos.y - grid.y,
      };
      setSelectedId(comp.id);
    } else {
      callbacks.onEmptyClick();
      setSelectedId(null);
      clearConnectionState(state);
    }
  }

  function onMouseMove(e) {
    const pos = getCanvasPos(canvas, e);
    const hit = renderer.hitTest(pos.x, pos.y, state.components);

    state.hoveredComponentId = hit && hit.component ? hit.component.id : null;
    state.hoveredPortId = hit && hit.port ? hit.port.id : null;

    if (renderer) {
      renderer.hoveredComponentId = state.hoveredComponentId;
      renderer.hoveredPortId = state.hoveredPortId;
    }

    if (mousedownPos && mousedownHit && mousedownHit.component && !state.isDragging) {
      const dx = pos.x - mousedownPos.x;
      const dy = pos.y - mousedownPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > DRAG_THRESHOLD) {
        state.isDragging = true;
        state.dragCompId = mousedownHit.component.id;
      }
    }

    if (state.isDragging && state.dragCompId) {
      const worldX = pos.x - state.dragOffset.x;
      const worldY = pos.y - state.dragOffset.y;
      const grid = renderer.worldToGrid(worldX, worldY);

      if (renderer) {
        renderer.dragPreview = {
          componentId: state.dragCompId,
          gridX: grid.gridX,
          gridY: grid.gridY,
        };
      }
      return;
    }

    if (state.pendingWireFrom && renderer) {
      renderer.wirePreview = {
        x: pos.x,
        y: pos.y
      };
    }
  }

  function onMouseUp(e) {
    if (e.button !== 0) return;

    const pos = getCanvasPos(canvas, e);

    if (state.isDragging && state.dragCompId) {
      const worldX = pos.x - state.dragOffset.x;
      const worldY = pos.y - state.dragOffset.y;
      const grid = renderer.worldToGrid(worldX, worldY);

      callbacks.onComponentMove(state.dragCompId, grid.gridX, grid.gridY);

      clearDragState(state);
      if (renderer) {
        renderer.dragPreview = null;
      }
      mousedownPos = null;
      mousedownHit = null;
      return;
    }

    if (mousedownPos && mousedownHit) {
      const dx = pos.x - mousedownPos.x;
      const dy = pos.y - mousedownPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= DRAG_THRESHOLD && mousedownHit.component) {
        const comp = mousedownHit.component;

        if (comp.type === 'switch') {
          callbacks.onSwitchToggle(comp.id);
          setSelectedId(comp.id);
        } else if (comp.type === 'resistor') {
          callbacks.onResistorSelect(comp.id);
          setSelectedId(comp.id);
        } else {
          setSelectedId(comp.id);
        }
      }
    }

    if (state.pendingWireFrom) {
      const hit = renderer.hitTest(pos.x, pos.y, state.components);
      if (hit && hit.port && hit.component) {
        if (hit.component.id !== state.pendingWireFrom.componentId) {
          callbacks.onPortClick(hit.component.id, hit.port.id);
        }
      }
    }

    mousedownPos = null;
    mousedownHit = null;
  }

  function onMouseLeave(e) {
    if (state.isDragging) {
      clearDragState(state);
      if (renderer) {
        renderer.dragPreview = null;
      }
    }
    if (state.pendingWireFrom && renderer) {
      renderer.wirePreview = null;
    }
    mousedownPos = null;
    mousedownHit = null;
  }

  return {
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onMouseLeave,
  };
}

export function bindMouseHandlers(canvas, handlers) {
  canvas.addEventListener('mousedown', handlers.onMouseDown);
  canvas.addEventListener('mousemove', handlers.onMouseMove);
  canvas.addEventListener('mouseup', handlers.onMouseUp);
  canvas.addEventListener('mouseleave', handlers.onMouseLeave);
}

export function unbindMouseHandlers(canvas, handlers) {
  canvas.removeEventListener('mousedown', handlers.onMouseDown);
  canvas.removeEventListener('mousemove', handlers.onMouseMove);
  canvas.removeEventListener('mouseup', handlers.onMouseUp);
  canvas.removeEventListener('mouseleave', handlers.onMouseLeave);
}

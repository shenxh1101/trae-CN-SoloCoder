import { getTouchPos, clearDragState, clearConnectionState } from './state.js';

function handleTap(pos, manager) {
  const { renderer, callbacks, state, setSelectedId } = manager;
  const hit = renderer.hitTest(pos.x, pos.y, state.components);

  if (hit && hit.port) {
    callbacks.onPortClick(hit.component.id, hit.port.id);
    return;
  }

  if (hit && hit.component) {
    const comp = hit.component;

    if (comp.type === 'switch') {
      callbacks.onSwitchToggle(comp.id);
      setSelectedId(comp.id);
      return;
    }

    if (comp.type === 'resistor') {
      callbacks.onResistorSelect(comp.id);
      setSelectedId(comp.id);
      return;
    }

    setSelectedId(comp.id);
    return;
  }

  callbacks.onEmptyClick();
  setSelectedId(null);
  clearConnectionState(state);
}

export function createTouchHandlers(manager) {
  const { canvas, renderer, callbacks, state, setSelectedId } = manager;

  function onTouchStart(e) {
    e.preventDefault();
    const pos = getTouchPos(canvas, e);
    state.touchStartPos = { ...pos };
    state.touchStartTime = Date.now();
    state.touchMoved = false;
    state.touchDragActive = false;

    const hit = renderer.hitTest(pos.x, pos.y, state.components);

    if (hit && hit.component) {
      state.dragStartPos = { ...pos };
      const grid = renderer.gridToWorld(hit.component.gridX, hit.component.gridY);
      state.dragOffset = {
        x: pos.x - grid.x,
        y: pos.y - grid.y,
      };
      state.dragCompId = hit.component.id;
      setSelectedId(hit.component.id);
    }

    state.longPressTimer = setTimeout(() => {
      if (!state.touchMoved && state.dragCompId) {
        const comp = state.components.find(c => c.id === state.dragCompId);
        if (comp) {
          const newRotation = (comp.rotation + 90) % 360;
          callbacks.onComponentRotate(comp.id, newRotation);
          state.longPressFired = true;

          if (navigator.vibrate) {
            navigator.vibrate(50);
          }
        }
      }
    }, state.longPressDelay);
  }

  function onTouchMove(e) {
    e.preventDefault();
    const pos = getTouchPos(canvas, e);

    const dx = pos.x - state.touchStartPos.x;
    const dy = pos.y - state.touchStartPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 10 && !state.touchMoved) {
      state.touchMoved = true;
      if (state.longPressTimer) {
        clearTimeout(state.longPressTimer);
        state.longPressTimer = null;
      }

      if (state.dragCompId && !state.longPressFired) {
        state.isDragging = true;
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
    }
  }

  function onTouchEnd(e) {
    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }

    const pos = getTouchPos(canvas, e);
    const duration = Date.now() - state.touchStartTime;
    const dx = pos.x - state.touchStartPos.x;
    const dy = pos.y - state.touchStartPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (state.isDragging && state.dragCompId) {
      const worldX = pos.x - state.dragOffset.x;
      const worldY = pos.y - state.dragOffset.y;
      const grid = renderer.worldToGrid(worldX, worldY);

      callbacks.onComponentMove(state.dragCompId, grid.gridX, grid.gridY);

      clearDragState(state);
      if (renderer) {
        renderer.dragPreview = null;
      }
      state.longPressFired = false;
      return;
    }

    if (duration < 200 && distance < 10 && !state.longPressFired) {
      handleTap(pos, manager);
    }

    state.longPressFired = false;
    state.dragCompId = null;
  }

  function onTouchCancel(e) {
    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }
    clearDragState(state);
    if (renderer) {
      renderer.dragPreview = null;
      renderer.wirePreview = null;
    }
    state.longPressFired = false;
  }

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel,
  };
}

export function bindTouchHandlers(canvas, handlers) {
  canvas.addEventListener('touchstart', handlers.onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handlers.onTouchMove, { passive: false });
  canvas.addEventListener('touchend', handlers.onTouchEnd);
  canvas.addEventListener('touchcancel', handlers.onTouchCancel);
}

export function unbindTouchHandlers(canvas, handlers) {
  canvas.removeEventListener('touchstart', handlers.onTouchStart);
  canvas.removeEventListener('touchmove', handlers.onTouchMove);
  canvas.removeEventListener('touchend', handlers.onTouchEnd);
  canvas.removeEventListener('touchcancel', handlers.onTouchCancel);
}

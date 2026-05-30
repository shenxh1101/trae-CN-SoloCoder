import { clearDragState, clearConnectionState } from './state.js';

export function createKeyboardHandler(manager) {
  const { callbacks, state, renderer, setSelectedId } = manager;

  function onKeyDown(e) {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (state.selectedId) {
        e.preventDefault();
        callbacks.onComponentDelete(state.selectedId);
        setSelectedId(null);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      clearDragState(state);
      clearConnectionState(state);
      setSelectedId(null);
      if (renderer) {
        renderer.dragPreview = null;
        renderer.wirePreview = null;
      }
    }
  }

  return { onKeyDown };
}

export function bindKeyboardHandler(handler) {
  document.addEventListener('keydown', handler.onKeyDown);
}

export function unbindKeyboardHandler(handler) {
  document.removeEventListener('keydown', handler.onKeyDown);
}

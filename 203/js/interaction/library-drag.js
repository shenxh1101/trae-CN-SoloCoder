import { getCanvasPos } from './state.js';

export function createLibraryDragHandlers(manager) {
  const { canvas, libraryContainer, renderer, callbacks, state } = manager;

  function onLibraryDragStart(e) {
    const type = e.currentTarget.dataset.type;
    e.dataTransfer.setData('text/plain', type);
    e.dataTransfer.effectAllowed = 'copy';

    const icon = e.currentTarget.querySelector('.item-icon');
    if (icon) {
      e.dataTransfer.setDragImage(icon, 20, 20);
    }
  }

  function onCanvasDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';

    const pos = getCanvasPos(canvas, e);
    const grid = renderer.worldToGrid(pos.x, pos.y);

    if (renderer) {
      renderer.dragPreview = {
        type: e.dataTransfer.getData('text/plain') || 'battery',
        gridX: grid.gridX,
        gridY: grid.gridY,
      };
    }
  }

  function onCanvasDragLeave(e) {
    if (renderer) {
      renderer.dragPreview = null;
    }
  }

  function onCanvasDrop(e) {
    e.preventDefault();
    const type = e.dataTransfer.getData('text/plain');
    const pos = getCanvasPos(canvas, e);
    const grid = renderer.worldToGrid(pos.x, pos.y);

    if (renderer) {
      renderer.dragPreview = null;
    }

    if (type) {
      callbacks.onDragFromLibrary(type, grid.gridX, grid.gridY);
    }
  }

  function onContextMenu(e) {
    e.preventDefault();
  }

  return {
    onLibraryDragStart,
    onCanvasDragOver,
    onCanvasDragLeave,
    onCanvasDrop,
    onContextMenu,
  };
}

export function bindLibraryDrag(manager, handlers) {
  const libraryItems = manager.libraryContainer.querySelectorAll('.library-item');
  libraryItems.forEach(item => {
    item.addEventListener('dragstart', handlers.onLibraryDragStart);
  });

  manager.canvas.addEventListener('dragover', handlers.onCanvasDragOver);
  manager.canvas.addEventListener('drop', handlers.onCanvasDrop);
  manager.canvas.addEventListener('dragleave', handlers.onCanvasDragLeave);
  manager.canvas.addEventListener('contextmenu', handlers.onContextMenu);
}

export function unbindLibraryDrag(manager, handlers) {
  const libraryItems = manager.libraryContainer.querySelectorAll('.library-item');
  libraryItems.forEach(item => {
    item.removeEventListener('dragstart', handlers.onLibraryDragStart);
  });

  manager.canvas.removeEventListener('dragover', handlers.onCanvasDragOver);
  manager.canvas.removeEventListener('drop', handlers.onCanvasDrop);
  manager.canvas.removeEventListener('dragleave', handlers.onCanvasDragLeave);
  manager.canvas.removeEventListener('contextmenu', handlers.onContextMenu);
}

const InteractionManager = (() => {
  let isSelecting = false;
  let startCell = null;
  let currentCells = [];
  let onSelectionChange = null;
  let onSelectionEnd = null;
  let gridContainer = null;

  function getCellFromEvent(e) {
    let target;
    if (e.touches) {
      const touch = e.touches[0] || e.changedTouches[0];
      target = document.elementFromPoint(touch.clientX, touch.clientY);
    } else {
      target = e.target;
    }
    if (!target) return null;
    const cell = target.closest('.grid-cell');
    if (!cell) return null;
    return {
      row: parseInt(cell.dataset.row),
      col: parseInt(cell.dataset.col),
      element: cell
    };
  }

  function startSelection(e) {
    e.preventDefault();
    const cell = getCellFromEvent(e);
    if (!cell) return;
    isSelecting = true;
    startCell = cell;
    currentCells = [cell];
    if (onSelectionChange) onSelectionChange(currentCells);
    AudioManager.resume();
  }

  function moveSelection(e) {
    if (!isSelecting || !startCell) return;
    e.preventDefault();
    const cell = getCellFromEvent(e);
    if (!cell) return;

    const cells = GridManager.getCellsBetween(startCell.row, startCell.col, cell.row, cell.col);
    if (cells) {
      currentCells = cells;
      if (onSelectionChange) onSelectionChange(currentCells);
    }
  }

  function endSelection(e) {
    if (!isSelecting) return;
    e.preventDefault();
    isSelecting = false;
    if (onSelectionEnd && currentCells.length > 0) {
      onSelectionEnd(currentCells);
    }
    startCell = null;
    currentCells = [];
  }

  function init(container, onChange, onEnd) {
    gridContainer = container;
    onSelectionChange = onChange;
    onSelectionEnd = onEnd;

    container.addEventListener('mousedown', startSelection);
    container.addEventListener('mousemove', moveSelection);
    container.addEventListener('mouseup', endSelection);
    container.addEventListener('mouseleave', endSelection);

    container.addEventListener('touchstart', startSelection, { passive: false });
    container.addEventListener('touchmove', moveSelection, { passive: false });
    container.addEventListener('touchend', endSelection, { passive: false });
    container.addEventListener('touchcancel', endSelection, { passive: false });
  }

  function destroy() {
    if (!gridContainer) return;
    gridContainer.removeEventListener('mousedown', startSelection);
    gridContainer.removeEventListener('mousemove', moveSelection);
    gridContainer.removeEventListener('mouseup', endSelection);
    gridContainer.removeEventListener('mouseleave', endSelection);
    gridContainer.removeEventListener('touchstart', startSelection);
    gridContainer.removeEventListener('touchmove', moveSelection);
    gridContainer.removeEventListener('touchend', endSelection);
    gridContainer.removeEventListener('touchcancel', endSelection);
    gridContainer = null;
  }

  return { init, destroy };
})();

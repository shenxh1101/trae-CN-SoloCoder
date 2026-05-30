import { createInitialState, createCallbacks, clearHover } from './interaction/state.js';
import { createLibraryDragHandlers, bindLibraryDrag, unbindLibraryDrag } from './interaction/library-drag.js';
import { createMouseHandlers, bindMouseHandlers, unbindMouseHandlers } from './interaction/mouse-handler.js';
import { createTouchHandlers, bindTouchHandlers, unbindTouchHandlers } from './interaction/touch-handler.js';
import { createKeyboardHandler, bindKeyboardHandler, unbindKeyboardHandler } from './interaction/keyboard-handler.js';

export class InteractionManager {
  constructor(canvas, libraryContainer, renderer, options = {}) {
    this.canvas = canvas;
    this.libraryContainer = libraryContainer;
    this.renderer = renderer;
    this.state = createInitialState(options);
    this.callbacks = createCallbacks(options);

    this._initHandlers();
    this._bindEvents();
  }

  _initHandlers() {
    const manager = this._getManagerApi();

    this.libraryHandlers = createLibraryDragHandlers(manager);
    this.mouseHandlers = createMouseHandlers(manager);
    this.touchHandlers = createTouchHandlers(manager);
    this.keyboardHandler = createKeyboardHandler(manager);
  }

  _getManagerApi() {
    return {
      canvas: this.canvas,
      libraryContainer: this.libraryContainer,
      renderer: this.renderer,
      callbacks: this.callbacks,
      state: this.state,
      setSelectedId: this.setSelectedId.bind(this),
    };
  }

  _bindEvents() {
    bindLibraryDrag(this, this.libraryHandlers);
    bindMouseHandlers(this.canvas, this.mouseHandlers);
    bindTouchHandlers(this.canvas, this.touchHandlers);
    bindKeyboardHandler(this.keyboardHandler);
  }

  _unbindEvents() {
    unbindLibraryDrag(this, this.libraryHandlers);
    unbindMouseHandlers(this.canvas, this.mouseHandlers);
    unbindTouchHandlers(this.canvas, this.touchHandlers);
    unbindKeyboardHandler(this.keyboardHandler);
  }

  setComponents(components) {
    this.state.components = components;
  }

  setWires(wires) {
    this.state.wires = wires;
  }

  setSelectedId(id) {
    this.state.selectedId = id;
    if (this.renderer) {
      this.renderer.selectedId = id;
    }
  }

  getSelectedId() {
    return this.state.selectedId;
  }

  destroy() {
    this._unbindEvents();
    if (this.state.longPressTimer) {
      clearTimeout(this.state.longPressTimer);
    }
    clearHover(this.renderer);
  }
}

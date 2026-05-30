import { Renderer } from './renderer.js';
import { InteractionManager } from './interaction.js';
import { analyzeCircuit } from './circuit-engine.js';
import { presetCircuits, saveCircuit, loadCircuit } from './data.js';

const CELL_SIZE = 60;

class CircuitApp {
  constructor() {
    this.components = [];
    this.wires = [];
    this.circuitState = null;
    this.nextCompId = 1;
    this.nextWireId = 1;
    this.selectedResistorId = null;
    this.shortWarningShown = false;

    this._initDom();
    this._initRenderer();
    this._initInteraction();
    this._bindToolbar();
    this._bindResistorSlider();

    this.analyzeAndRender();

    this._resizeHandler = () => this._onResize();
    window.addEventListener('resize', this._resizeHandler);
  }

  _initDom() {
    this.canvas = document.getElementById('circuit-canvas');
    this.libraryContainer = document.getElementById('library-items');
    this.toastContainer = document.getElementById('toast-container');
    this.shortWarning = document.getElementById('short-circuit-warning');
    this.voltageEl = document.getElementById('voltage-value');
    this.currentEl = document.getElementById('current-value');
    this.resistanceEl = document.getElementById('resistance-value');
    this.statusIndicator = document.getElementById('status-indicator');
    this.statusText = document.getElementById('status-text');
    this.circuitDetails = document.getElementById('circuit-details');
    this.verificationEl = document.getElementById('ohm-verification');
    this.resistorControl = document.getElementById('resistor-control');
    this.resistorSlider = document.getElementById('resistor-slider');
    this.resistorValueDisplay = document.getElementById('resistor-value-display');
  }

  _initRenderer() {
    this.renderer = new Renderer(this.canvas, { cellSize: CELL_SIZE });
  }

  _initInteraction() {
    this.interaction = new InteractionManager(
      this.canvas,
      this.libraryContainer,
      this.renderer,
      {
        cellSize: CELL_SIZE,
        longPressDelay: 500,
        onDragFromLibrary: this._onDragFromLibrary.bind(this),
        onComponentMove: this._onComponentMove.bind(this),
        onComponentRotate: this._onComponentRotate.bind(this),
        onComponentDelete: this._onComponentDelete.bind(this),
        onPortClick: this._onPortClick.bind(this),
        onSwitchToggle: this._onSwitchToggle.bind(this),
        onResistorSelect: this._onResistorSelect.bind(this),
        onEmptyClick: this._onEmptyClick.bind(this)
      }
    );

    this.interaction.setComponents(this.components);
    this.interaction.setWires(this.wires);
  }

  _bindToolbar() {
    document.getElementById('btn-preset-simple').addEventListener('click', () => {
      this.loadPreset('simple');
      this.showToast('已加载简单回路示例', 'success');
    });
    document.getElementById('btn-preset-series').addEventListener('click', () => {
      this.loadPreset('series');
      this.showToast('已加载串联电路示例', 'success');
    });
    document.getElementById('btn-preset-parallel').addEventListener('click', () => {
      this.loadPreset('parallel');
      this.showToast('已加载并联电路示例', 'success');
    });
    document.getElementById('btn-save').addEventListener('click', () => {
      this.handleSave();
    });
    document.getElementById('btn-load').addEventListener('click', () => {
      this.handleLoad();
    });
    document.getElementById('btn-reset').addEventListener('click', () => {
      this.handleReset();
    });
    document.getElementById('warning-close').addEventListener('click', () => {
      this.shortWarning.classList.add('hidden');
    });
  }

  _bindResistorSlider() {
    this.resistorSlider.addEventListener('input', (e) => {
      if (!this.selectedResistorId) return;
      const value = parseInt(e.target.value, 10);
      this.resistorValueDisplay.textContent = value;

      const resistor = this.components.find(c => c.id === this.selectedResistorId);
      if (resistor && resistor.type === 'resistor') {
        resistor.properties.resistance = value;
        this.analyzeAndRender();
      }
    });
  }

  _onResize() {
    this.renderer.resize();
    this.render();
  }

  _getPorts(rotation) {
    const map = {
      0:   [{ id: "port_a", relX: -0.5, relY: 0 }, { id: "port_b", relX: 0.5, relY: 0 }],
      90:  [{ id: "port_a", relX: 0, relY: -0.5 }, { id: "port_b", relX: 0, relY: 0.5 }],
      180: [{ id: "port_a", relX: 0.5, relY: 0 },  { id: "port_b", relX: -0.5, relY: 0 }],
      270: [{ id: "port_a", relX: 0, relY: 0.5 },  { id: "port_b", relX: 0, relY: -0.5 }],
    };
    return map[rotation] || map[0];
  }

  _createComponent(type, gridX, gridY, rotation = 0) {
    const id = `comp_${this.nextCompId++}`;
    const comp = {
      id,
      type,
      gridX,
      gridY,
      rotation,
      properties: {},
      ports: this._getPorts(rotation)
    };

    switch (type) {
      case 'battery':
        comp.properties = { voltage: 9 };
        break;
      case 'bulb':
        comp.properties = { resistance: 10 };
        break;
      case 'switch':
        comp.properties = { isOn: true };
        break;
      case 'resistor':
        comp.properties = { resistance: 100 };
        break;
      case 'wire':
        comp.properties = {};
        break;
    }

    return comp;
  }

  _onDragFromLibrary(type, gridX, gridY) {
    const comp = this._createComponent(type, gridX, gridY);
    this.components.push(comp);
    this.interaction.setComponents(this.components);
    this.analyzeAndRender();
    this.showToast(`已添加${this._getComponentName(type)}`, 'success');
  }

  _getComponentName(type) {
    const names = {
      battery: '电池',
      bulb: '灯泡',
      switch: '开关',
      resistor: '电阻',
      wire: '导线'
    };
    return names[type] || type;
  }

  _onComponentMove(id, gridX, gridY) {
    const comp = this.components.find(c => c.id === id);
    if (comp) {
      comp.gridX = gridX;
      comp.gridY = gridY;
      this.analyzeAndRender();
    }
  }

  _onComponentRotate(id, rotation) {
    const comp = this.components.find(c => c.id === id);
    if (comp) {
      comp.rotation = rotation;
      comp.ports = this._getPorts(rotation);
      this.analyzeAndRender();
      this.showToast('已旋转元件', 'success');
    }
  }

  _onComponentDelete(id) {
    const comp = this.components.find(c => c.id === id);
    if (!comp) return;

    this.components = this.components.filter(c => c.id !== id);
    this.wires = this.wires.filter(w =>
      w.fromComp !== id && w.toComp !== id
    );

    if (this.selectedResistorId === id) {
      this.selectedResistorId = null;
      this.resistorControl.style.display = 'none';
    }

    this.interaction.setComponents(this.components);
    this.interaction.setWires(this.wires);
    this.analyzeAndRender();
    this.showToast('已删除元件', 'success');
  }

  _onPortClick(componentId, portId) {
    const state = this.interaction.state;

    if (!state.pendingWireFrom) {
      state.pendingWireFrom = { componentId, portId };
      state.isConnecting = true;
      this.showToast('点击另一个端口完成连接', 'warning');
      return;
    }

    const from = state.pendingWireFrom;

    if (from.componentId === componentId && from.portId === portId) {
      state.pendingWireFrom = null;
      state.isConnecting = false;
      this.renderer.wirePreview = null;
      return;
    }

    if (from.componentId === componentId) {
      this.showToast('不能连接同一元件的端口', 'error');
      return;
    }

    const existingWire = this.wires.find(w =>
      (w.fromComp === from.componentId && w.fromPort === from.portId &&
       w.toComp === componentId && w.toPort === portId) ||
      (w.fromComp === componentId && w.fromPort === portId &&
       w.toComp === from.componentId && w.toPort === from.portId)
    );

    if (existingWire) {
      this.showToast('该连接已存在', 'error');
      state.pendingWireFrom = null;
      state.isConnecting = false;
      this.renderer.wirePreview = null;
      return;
    }

    const wire = {
      id: `wire_${this.nextWireId++}`,
      fromComp: from.componentId,
      fromPort: from.portId,
      toComp: componentId,
      toPort: portId
    };

    this.wires.push(wire);
    this.interaction.setWires(this.wires);
    state.pendingWireFrom = null;
    state.isConnecting = false;
    this.renderer.wirePreview = null;

    this.analyzeAndRender();
    this.showToast('已连接导线', 'success');
  }

  _onSwitchToggle(id) {
    const comp = this.components.find(c => c.id === id);
    if (comp && comp.type === 'switch') {
      comp.properties.isOn = !comp.properties.isOn;
      this.analyzeAndRender();
      this.showToast(comp.properties.isOn ? '开关已闭合' : '开关已断开', 'success');
    }
  }

  _onResistorSelect(id) {
    const comp = this.components.find(c => c.id === id);
    if (comp && comp.type === 'resistor') {
      this.selectedResistorId = id;
      this.resistorControl.style.display = 'block';
      this.resistorSlider.value = comp.properties.resistance;
      this.resistorValueDisplay.textContent = comp.properties.resistance;
      this.interaction.setSelectedId(id);
    }
  }

  _onEmptyClick() {
    this.selectedResistorId = null;
    this.resistorControl.style.display = 'none';
    this.interaction.setSelectedId(null);
    if (this.interaction.state.pendingWireFrom) {
      this.interaction.state.pendingWireFrom = null;
      this.interaction.state.isConnecting = false;
      this.renderer.wirePreview = null;
    }
  }

  analyzeCircuit() {
    this.circuitState = analyzeCircuit(this.components, this.wires);
    this.updateUI();
    return this.circuitState;
  }

  updateUI() {
    const s = this.circuitState;

    if (!s) {
      this.voltageEl.textContent = '0 V';
      this.currentEl.textContent = '0 A';
      this.resistanceEl.textContent = '0 Ω';
      this.statusIndicator.className = 'status-open';
      this.statusText.textContent = '开路';
      this.verificationEl.textContent = '';
      this.verificationEl.className = 'verification';
      this.circuitDetails.innerHTML = '';
      return;
    }

    this.voltageEl.textContent = `${s.totalVoltage.toFixed(1)} V`;
    this.currentEl.textContent = `${s.current.toFixed(3)} A`;
    this.resistanceEl.textContent = `${s.totalResistance.toFixed(1)} Ω`;

    if (s.isShortCircuit) {
      this.statusIndicator.className = 'status-short';
      this.statusText.textContent = '短路';
      if (!this.shortWarningShown) {
        this.shortWarning.classList.remove('hidden');
        this.shortWarningShown = true;
        this.showToast('警告：检测到短路！', 'error');
      }
    } else if (s.isClosed && s.hasBattery && s.hasBulb && !s.switchOpen) {
      this.statusIndicator.className = 'status-closed';
      this.statusText.textContent = '闭合';
      this.shortWarning.classList.add('hidden');
      this.shortWarningShown = false;
    } else {
      this.statusIndicator.className = 'status-open';
      if (s.switchOpen) {
        this.statusText.textContent = '开关断开';
      } else if (!s.hasBattery) {
        this.statusText.textContent = '缺少电池';
      } else if (!s.hasBulb) {
        this.statusText.textContent = '缺少灯泡';
      } else {
        this.statusText.textContent = '开路';
      }
      this.shortWarning.classList.add('hidden');
      this.shortWarningShown = false;
    }

    const details = [];
    if (s.hasBattery) details.push(`电池 ${s.totalVoltage}V`);
    const bulbCount = this.components.filter(c => c.type === 'bulb').length;
    if (bulbCount > 0) details.push(`灯泡 ×${bulbCount}`);
    if (s.switchOpen) details.push('开关断开');
    this.circuitDetails.innerHTML = details.map(d => `<div>${d}</div>`).join('');

    if (s.isClosed && !s.isShortCircuit && s.totalVoltage > 0 && s.totalResistance > 0) {
      const expectedCurrent = s.totalVoltage / s.totalResistance;
      const tolerance = 0.01;
      const isOk = Math.abs(expectedCurrent - s.current) < tolerance;
      this.verificationEl.textContent = isOk ? `✓ ${s.totalVoltage.toFixed(1)}V = ${s.current.toFixed(2)}A × ${s.totalResistance.toFixed(1)}Ω` : `✗ 欧姆定律验证失败`;
      this.verificationEl.className = 'verification ' + (isOk ? 'valid' : 'invalid');
    } else {
      this.verificationEl.textContent = s.isShortCircuit ? '⚠ 短路：请添加负载' : '电路未闭合';
      this.verificationEl.className = 'verification ' + (s.isShortCircuit ? 'invalid' : '');
    }
  }

  render() {
    const t = performance.now();
    this.renderer.clear();
    this.renderer.drawGrid();

    const activeWireIds = this.circuitState && this.circuitState.activeWires ?
      this.circuitState.activeWires : new Set();

    this.renderer.drawWires(this.wires, this.components, activeWireIds, this.circuitState || {}, t);
    this.renderer.drawComponents(
      this.components,
      this.interaction.getSelectedId(),
      this.interaction.state.hoveredComponentId,
      this.circuitState || {},
      t
    );

    if (this.renderer.dragPreview) {
      const dp = this.renderer.dragPreview;
      if (dp.type) {
        this.renderer.drawDragPreview(dp.type, dp.gridX, dp.gridY, 0);
      } else if (dp.componentId) {
        const comp = this.components.find(c => c.id === dp.componentId);
        if (comp) {
          this.renderer.drawDragPreview(comp.type, dp.gridX, dp.gridY, comp.rotation);
        }
      }
    }

    if (this.interaction.state.isConnecting && this.interaction.state.pendingWireFrom) {
      const from = this.interaction.state.pendingWireFrom;
      const fromComp = this.components.find(c => c.id === from.componentId);
      if (fromComp && this.renderer.wirePreview) {
        const fromPort = fromComp.ports.find(p => p.id === from.portId);
        if (fromPort) {
          const fromX = (fromComp.gridX + fromPort.relX) * this.renderer.cellSize;
          const fromY = (fromComp.gridY + fromPort.relY) * this.renderer.cellSize;
          this.renderer.drawConnectionPreview(
            { x: fromX, y: fromY },
            { x: this.renderer.wirePreview.x, y: this.renderer.wirePreview.y },
            true
          );
        }
      }
    }
  }

  analyzeAndRender() {
    this.analyzeCircuit();
    this.render();
  }

  start() {
    this.renderer.startAnimationLoop(() => {
      this.render();
    });

    this.loadPreset('simple');
  }

  loadPreset(name) {
    const preset = presetCircuits[name];
    if (!preset) return;

    this.components = JSON.parse(JSON.stringify(preset.components));
    this.wires = JSON.parse(JSON.stringify(preset.wires));

    this.nextCompId = this.components.reduce((max, c) => {
      const num = parseInt(c.id.split('_')[1], 10);
      return Math.max(max, isNaN(num) ? 0 : num + 1);
    }, 1);
    this.nextWireId = this.wires.reduce((max, w) => {
      const num = parseInt(w.id.split('_')[1], 10);
      return Math.max(max, isNaN(num) ? 0 : num + 1);
    }, 1);

    this.interaction.setComponents(this.components);
    this.interaction.setWires(this.wires);
    this.interaction.setSelectedId(null);
    this.selectedResistorId = null;
    this.resistorControl.style.display = 'none';
    this.shortWarning.classList.add('hidden');
    this.shortWarningShown = false;

    this.analyzeAndRender();
  }

  handleSave() {
    const success = saveCircuit(this.components, this.wires);
    if (success) {
      this.showToast('电路已保存', 'success');
    } else {
      this.showToast('保存失败', 'error');
    }
  }

  handleLoad() {
    const data = loadCircuit();
    if (data) {
      this.components = data.components;
      this.wires = data.wires;

      this.nextCompId = this.components.reduce((max, c) => {
        const num = parseInt(c.id.split('_')[1], 10);
        return Math.max(max, isNaN(num) ? 0 : num + 1);
      }, 1);
      this.nextWireId = this.wires.reduce((max, w) => {
        const num = parseInt(w.id.split('_')[1], 10);
        return Math.max(max, isNaN(num) ? 0 : num + 1);
      }, 1);

      this.interaction.setComponents(this.components);
      this.interaction.setWires(this.wires);
      this.analyzeAndRender();
      this.showToast('电路已加载', 'success');
    } else {
      this.showToast('没有找到保存的电路', 'error');
    }
  }

  handleReset() {
    if (!confirm('确定要重置画布吗？所有未保存的修改将丢失。')) {
      return;
    }

    this.components = [];
    this.wires = [];
    this.nextCompId = 1;
    this.nextWireId = 1;
    this.selectedResistorId = null;
    this.shortWarningShown = false;

    this.interaction.setComponents(this.components);
    this.interaction.setWires(this.wires);
    this.interaction.setSelectedId(null);
    this.resistorControl.style.display = 'none';
    this.shortWarning.classList.add('hidden');

    this.analyzeAndRender();
    this.showToast('画布已重置', 'success');
  }

  showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  destroy() {
    window.removeEventListener('resize', this._resizeHandler);
    this.renderer.stopAnimationLoop();
    this.interaction.destroy();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new CircuitApp();
  app.start();
});

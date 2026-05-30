export class Renderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cellSize = options.cellSize || 60;
    this.dpr = window.devicePixelRatio || 1;
    this.width = 0;
    this.height = 0;
    this.animationFrame = null;
    this.selectedId = null;
    this.hoveredComponentId = null;
    this.hoveredPortId = null;
    this.dragPreview = null;
    this.wirePreview = null;
    this.resize();
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawGrid() {
    const ctx = this.ctx;
    const dpr = this.dpr;
    const w = this.width;
    const h = this.height;
    const cell = this.cellSize;

    ctx.save();
    ctx.lineWidth = 1;

    for (let x = 0; x <= w; x += cell) {
      const isMajor = Math.round(x / cell) % 5 === 0;
      ctx.strokeStyle = isMajor ? '#1a3055' : '#152240';
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    for (let y = 0; y <= h; y += cell) {
      const isMajor = Math.round(y / cell) % 5 === 0;
      ctx.strokeStyle = isMajor ? '#1a3055' : '#152240';
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#1a3055';
    for (let x = 0; x <= w; x += cell) {
      for (let y = 0; y <= h; y += cell) {
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  drawWires(wires, components, activeWireIds, circuitState, time) {
    const ctx = this.ctx;
    const compMap = new Map(components.map(c => [c.id, c]));

    wires.forEach(wire => {
      const fromComp = compMap.get(wire.fromComp);
      const toComp = compMap.get(wire.toComp);
      if (!fromComp || !toComp) return;

      const fromPort = fromComp.ports.find(p => p.id === wire.fromPort);
      const toPort = toComp.ports.find(p => p.id === wire.toPort);
      if (!fromPort || !toPort) return;

      const x1 = (fromComp.gridX + fromPort.relX) * this.cellSize;
      const y1 = (fromComp.gridY + fromPort.relY) * this.cellSize;
      const x2 = (toComp.gridX + toPort.relX) * this.cellSize;
      const y2 = (toComp.gridY + toPort.relY) * this.cellSize;

      const path = this.getManhattanPath(x1, y1, x2, y2);
      const isActive = activeWireIds.has(wire.id) && circuitState.isClosed;
      const isShort = circuitState.isShortCircuit;

      let color, glowColor, lineWidth;
      if (isShort) {
        color = '#ff4444';
        glowColor = '#ff444466';
        lineWidth = 4;
      } else if (isActive) {
        color = '#00ffaa';
        glowColor = '#00ffaa44';
        lineWidth = 3;
      } else {
        color = '#00ff8888';
        glowColor = 'transparent';
        lineWidth = 2;
      }

      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (isActive || isShort) {
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 10;
      }

      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
      }
      ctx.stroke();
      ctx.restore();

      if ((isActive || isShort) && circuitState.isClosed) {
        const totalLength = this.getPathLength(path);
        const dotSpacing = 40;
        const speed = 0.05;
        const offset = (time * speed) % dotSpacing;

        for (let dist = offset; dist < totalLength; dist += dotSpacing) {
          const point = this.getPointAtDistance(path, dist);
          if (point) {
            ctx.save();
            ctx.fillStyle = isShort ? '#ffaaaa' : '#aaffee';
            ctx.shadowColor = isShort ? '#ff4444' : '#00ffaa';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      }
    });
  }

  drawComponents(components, selectedId, hoveredId, circuitState, time) {
    const ctx = this.ctx;

    components.forEach(comp => {
      const x = comp.gridX * this.cellSize;
      const y = comp.gridY * this.cellSize;
      const isSelected = comp.id === selectedId;
      const isHovered = comp.id === hoveredId;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((comp.rotation * Math.PI) / 180);

      switch (comp.type) {
        case 'battery':
          this.drawBattery(ctx, comp.properties);
          break;
        case 'bulb':
          const brightness = circuitState.isClosed && !circuitState.isShortCircuit
            ? circuitState.bulbBrightness
            : 0;
          this.drawBulb(ctx, comp.properties, brightness);
          break;
        case 'switch':
          this.drawSwitch(ctx, comp.properties.isOn);
          break;
        case 'resistor':
          this.drawResistor(ctx, comp.properties.resistance);
          break;
        case 'wire':
          this.drawWireConnector(ctx);
          break;
      }

      ctx.restore();

      comp.ports.forEach(port => {
        const px = (comp.gridX + port.relX) * this.cellSize;
        const py = (comp.gridY + port.relY) * this.cellSize;
        const isHighlighted = isSelected || isHovered;
        this.drawPort(ctx, px, py, isHighlighted);
      });

      if (isSelected) {
        ctx.save();
        ctx.strokeStyle = '#ffcc00';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        const size = 35;
        ctx.strokeRect(x - size, y - size, size * 2, size * 2);
        ctx.restore();
      }
    });
  }

  drawConnectionPreview(fromPoint, toPoint, isValid) {
    const ctx = this.ctx;

    const x1 = fromPoint.x;
    const y1 = fromPoint.y;
    const x2 = toPoint.x;
    const y2 = toPoint.y;

    const path = this.getManhattanPath(x1, y1, x2, y2);

    ctx.save();
    ctx.strokeStyle = isValid ? '#00ff88' : '#ff4444';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  drawDragPreview(type, gridX, gridY, rotation) {
    const ctx = this.ctx;
    const px = gridX * this.cellSize;
    const py = gridY * this.cellSize;

    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.translate(px, py);
    ctx.rotate((rotation * Math.PI) / 180);

    switch (type) {
      case 'battery':
        this.drawBattery(ctx, { voltage: 9 });
        break;
      case 'bulb':
        this.drawBulb(ctx, { resistance: 10 }, 0);
        break;
      case 'switch':
        this.drawSwitch(ctx, true);
        break;
      case 'resistor':
        this.drawResistor(ctx, 100);
        break;
      case 'wire':
        this.drawWireConnector(ctx);
        break;
    }

    ctx.restore();
  }

  startAnimationLoop(callback) {
    const loop = (timestamp) => {
      callback(timestamp);
      this.animationFrame = requestAnimationFrame(loop);
    };
    this.animationFrame = requestAnimationFrame(loop);
  }

  stopAnimationLoop() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.dpr = dpr;
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  worldToGrid(x, y) {
    return {
      gridX: Math.round(x / this.cellSize),
      gridY: Math.round(y / this.cellSize)
    };
  }

  gridToWorld(gridX, gridY) {
    return {
      x: gridX * this.cellSize,
      y: gridY * this.cellSize
    };
  }

  getPortWorldPosition(component, portId) {
    const port = component.ports.find(p => p.id === portId);
    if (!port) return null;
    return {
      x: (component.gridX + port.relX) * this.cellSize,
      y: (component.gridY + port.relY) * this.cellSize
    };
  }

  hitTest(x, y, components) {
    const portRadius = 12;
    const compRadius = 30;

    for (const comp of components) {
      for (const port of comp.ports) {
        const portX = (comp.gridX + port.relX) * this.cellSize;
        const portY = (comp.gridY + port.relY) * this.cellSize;
        const dist = Math.sqrt((x - portX) ** 2 + (y - portY) ** 2);
        if (dist < portRadius) {
          return { component: comp, port: port };
        }
      }
    }

    for (const comp of components) {
      const cx = comp.gridX * this.cellSize;
      const cy = comp.gridY * this.cellSize;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist < compRadius) {
        return { component: comp, port: null };
      }
    }

    return null;
  }

  _drawLeadLines(ctx, halfW) {
    ctx.strokeStyle = '#00ff8866';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-halfW, 0);
    ctx.lineTo(-halfW + 8, 0);
    ctx.moveTo(halfW - 8, 0);
    ctx.lineTo(halfW, 0);
    ctx.stroke();
  }

  drawBattery(ctx, props) {
    const w = 44;
    const h = 26;

    ctx.save();

    const gradient = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    gradient.addColorStop(0, '#4488ff');
    gradient.addColorStop(1, '#2266dd');

    ctx.fillStyle = gradient;
    ctx.strokeStyle = '#6699ff';
    ctx.lineWidth = 2;
    this.roundRect(ctx, -w / 2, -h / 2, w, h, 4);
    ctx.fill();
    ctx.stroke();

    this._drawLeadLines(ctx, 30);

    ctx.fillStyle = '#ff6644';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+', -8, 0);

    ctx.fillStyle = '#88bbff';
    ctx.fillText('−', 8, 0);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(`${props.voltage || 9}V`, 0, -h / 2 - 6);

    ctx.restore();
  }

  drawBulb(ctx, props, brightness) {
    const radius = 18;

    ctx.save();

    if (brightness > 0) {
      const glowRadius = radius + 20 * brightness;
      const gradient = ctx.createRadialGradient(0, 0, radius * 0.5, 0, 0, glowRadius);
      gradient.addColorStop(0, `rgba(255, 170, 0, ${0.8 * brightness})`);
      gradient.addColorStop(0.5, `rgba(255, 170, 0, ${0.3 * brightness})`);
      gradient.addColorStop(1, 'rgba(255, 170, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    const glassGradient = ctx.createRadialGradient(-radius * 0.3, -radius * 0.3, 0, 0, 0, radius);
    if (brightness > 0) {
      glassGradient.addColorStop(0, '#fff4cc');
      glassGradient.addColorStop(0.5, '#ffdd66');
      glassGradient.addColorStop(1, '#ffaa00');
    } else {
      glassGradient.addColorStop(0, '#445566');
      glassGradient.addColorStop(1, '#334455');
    }

    ctx.fillStyle = glassGradient;
    ctx.strokeStyle = brightness > 0 ? '#ffcc66' : '#556677';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = brightness > 0 ? '#ff8800' : '#556677';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.4, -radius * 0.2);
    ctx.lineTo(radius * 0.4, radius * 0.2);
    ctx.moveTo(radius * 0.4, -radius * 0.2);
    ctx.lineTo(-radius * 0.4, radius * 0.2);
    ctx.stroke();

    ctx.fillStyle = '#334455';
    ctx.strokeStyle = '#556677';
    ctx.lineWidth = 1;
    this.roundRect(ctx, -6, radius - 2, 12, 8, 2);
    ctx.fill();
    ctx.stroke();

    this._drawLeadLines(ctx, 30);

    ctx.fillStyle = brightness > 0 ? '#ffaa00' : '#8899aa';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${props.resistance || 10}Ω`, 0, radius + 12);

    ctx.restore();
  }

  drawSwitch(ctx, isOn) {
    const w = 40;
    const h = 18;

    ctx.save();

    ctx.fillStyle = '#1a3055';
    ctx.strokeStyle = '#2a4a7a';
    ctx.lineWidth = 2;
    this.roundRect(ctx, -w / 2, -h / 2, w, h, 4);
    ctx.fill();
    ctx.stroke();

    const pivotX = -w / 2 + 8;
    const contactX = w / 2 - 8;
    const endY = isOn ? 0 : -h * 0.6;

    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.arc(pivotX, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = isOn ? '#00ff88' : '#ff8844';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pivotX, 0);
    ctx.lineTo(contactX, endY);
    ctx.stroke();

    ctx.fillStyle = isOn ? '#00ff88' : '#ff8844';
    ctx.beginPath();
    ctx.arc(contactX, endY, 4, 0, Math.PI * 2);
    ctx.fill();

    this._drawLeadLines(ctx, 30);

    ctx.fillStyle = isOn ? '#00ff88' : '#ff8844';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(isOn ? 'ON' : 'OFF', 0, h / 2 + 10);

    ctx.restore();
  }

  drawResistor(ctx, resistance) {
    const totalWidth = 50;
    const bodyWidth = 30;
    const bodyHeight = 12;

    ctx.save();

    ctx.strokeStyle = '#ff8844';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(-totalWidth / 2, 0);
    ctx.lineTo(-bodyWidth / 2, 0);
    ctx.stroke();

    const zigZagCount = 6;
    const zigZagWidth = bodyWidth / zigZagCount;
    const zigZagHeight = bodyHeight / 2;

    ctx.beginPath();
    ctx.moveTo(-bodyWidth / 2, 0);

    for (let i = 0; i < zigZagCount; i++) {
      const x1 = -bodyWidth / 2 + zigZagWidth * i + zigZagWidth / 4;
      const x2 = -bodyWidth / 2 + zigZagWidth * i + zigZagWidth * 3 / 4;
      ctx.lineTo(x1, zigZagHeight);
      ctx.lineTo(x2, -zigZagHeight);
    }

    ctx.lineTo(bodyWidth / 2, 0);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(bodyWidth / 2, 0);
    ctx.lineTo(totalWidth / 2, 0);
    ctx.stroke();

    this._drawLeadLines(ctx, 30);

    ctx.fillStyle = '#ff8844';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${resistance || 100}Ω`, 0, bodyHeight + 8);

    ctx.restore();
  }

  drawWireConnector(ctx) {
    ctx.save();

    ctx.fillStyle = '#00ff88';
    ctx.strokeStyle = '#00cc6a';
    ctx.lineWidth = 2;

    this.roundRect(ctx, -15, -5, 30, 10, 3);
    ctx.fill();
    ctx.stroke();

    this._drawLeadLines(ctx, 25);

    ctx.restore();
  }

  drawPort(ctx, x, y, isHighlighted) {
    ctx.save();

    const radius = isHighlighted ? 7 : 5;

    if (isHighlighted) {
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 10;
    }

    ctx.fillStyle = '#00ff88';
    ctx.strokeStyle = '#00cc6a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  getManhattanPath(x1, y1, x2, y2) {
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);

    if (dx > dy) {
      return [
        { x: x1, y: y1 },
        { x: x1, y: midY },
        { x: x2, y: midY },
        { x: x2, y: y2 }
      ];
    } else {
      return [
        { x: x1, y: y1 },
        { x: midX, y: y1 },
        { x: midX, y: y2 },
        { x: x2, y: y2 }
      ];
    }
  }

  getPathLength(path) {
    let length = 0;
    for (let i = 1; i < path.length; i++) {
      const dx = path[i].x - path[i - 1].x;
      const dy = path[i].y - path[i - 1].y;
      length += Math.sqrt(dx * dx + dy * dy);
    }
    return length;
  }

  getPointAtDistance(path, dist) {
    let traveled = 0;
    for (let i = 1; i < path.length; i++) {
      const dx = path[i].x - path[i - 1].x;
      const dy = path[i].y - path[i - 1].y;
      const segLength = Math.sqrt(dx * dx + dy * dy);

      if (segLength === 0) continue;
      if (traveled + segLength >= dist) {
        const t = (dist - traveled) / segLength;
        return {
          x: path[i - 1].x + dx * t,
          y: path[i - 1].y + dy * t
        };
      }
      traveled += segLength;
    }
    return path[path.length - 1];
  }

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

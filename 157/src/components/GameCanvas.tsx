import { useEffect, useRef } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react';
import { Direction, Note } from '../types/game';
import { DIRECTIONS, GAME_CONFIG } from '../config/gameConfig';

interface GameCanvasProps {
  notes: Array<Note & { y: number }>;
  pressedKeys: Set<Direction>;
  width?: number;
  height?: number;
}

const directionColors: Record<Direction, string> = {
  left: '#06b6d4',
  down: '#10b981',
  up: '#f59e0b',
  right: '#ec4899',
};

const directionIcons: Record<Direction, typeof ArrowUp> = {
  left: ArrowLeft,
  down: ArrowDown,
  up: ArrowUp,
  right: ArrowRight,
};

export function GameCanvas({ notes, pressedKeys, width = 400, height = 600 }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    const trackWidth = GAME_CONFIG.trackWidth;
    const startX = (width - trackWidth * 4) / 2;

    for (let i = 0; i < 4; i++) {
      const x = startX + i * trackWidth;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.fillRect(x, 0, trackWidth, height);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.strokeRect(x, 0, trackWidth, height);
    }

    const judgeY = GAME_CONFIG.judgeLineY;
    const gradient = ctx.createLinearGradient(0, judgeY - 2, 0, judgeY + 2);
    gradient.addColorStop(0, 'rgba(6, 182, 212, 0)');
    gradient.addColorStop(0.5, 'rgba(6, 182, 212, 0.8)');
    gradient.addColorStop(1, 'rgba(6, 182, 212, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(startX, judgeY - 2, trackWidth * 4, 4);

    ctx.shadowBlur = 20;
    ctx.shadowColor = '#06b6d4';
    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(startX, judgeY - 1, trackWidth * 4, 2);
    ctx.shadowBlur = 0;

    for (const note of notes) {
      const trackIndex = DIRECTIONS.indexOf(note.direction);
      const x = startX + trackIndex * trackWidth + (trackWidth - GAME_CONFIG.noteWidth) / 2;
      const y = height - note.y;
      const color = directionColors[note.direction];

      ctx.shadowBlur = 15;
      ctx.shadowColor = color;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, y, GAME_CONFIG.noteWidth, GAME_CONFIG.noteHeight, 8);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 2, GAME_CONFIG.noteWidth - 4, GAME_CONFIG.noteHeight - 4, 6);
      ctx.fill();

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x + 4, y + 4, GAME_CONFIG.noteWidth - 8, GAME_CONFIG.noteHeight - 8, 4);
      ctx.fill();

      const Icon = directionIcons[note.direction];
      ctx.fillStyle = 'white';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const arrowSymbols: Record<Direction, string> = {
        left: '←',
        down: '↓',
        up: '↑',
        right: '→',
      };
      ctx.fillText(arrowSymbols[note.direction], x + GAME_CONFIG.noteWidth / 2, y + GAME_CONFIG.noteHeight / 2);
    }

    for (let i = 0; i < 4; i++) {
      const direction = DIRECTIONS[i];
      const isPressed = pressedKeys.has(direction);
      const x = startX + i * trackWidth;
      const y = height - GAME_CONFIG.judgeLineY;

      if (isPressed) {
        const color = directionColors[direction];
        ctx.shadowBlur = 30;
        ctx.shadowColor = color;
        ctx.fillStyle = `${color}40`;
        ctx.fillRect(x, y - GAME_CONFIG.noteHeight, trackWidth, GAME_CONFIG.noteHeight + 10);
        ctx.shadowBlur = 0;
      }
    }
  }, [notes, pressedKeys, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded-lg"
    />
  );
}

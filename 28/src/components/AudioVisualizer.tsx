import { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '@/store/playerStore';
import { BarChart3, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AudioVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const { analyser, visualizerMode, toggleVisualizerMode, isPlaying } =
    usePlayerStore();

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = dimensions.width * window.devicePixelRatio;
    canvas.height = dimensions.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const draw = () => {
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      if (!analyser || !isPlaying) {
        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      const gradient = ctx.createLinearGradient(
        0,
        0,
        dimensions.width,
        0
      );
      gradient.addColorStop(0, '#9333ea');
      gradient.addColorStop(0.5, '#a855f7');
      gradient.addColorStop(1, '#06b6d4');

      if (visualizerMode === 'bars') {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        const barCount = 64;
        const barWidth = dimensions.width / barCount;
        const barGap = 2;

        for (let i = 0; i < barCount; i++) {
          const dataIndex = Math.floor((i / barCount) * bufferLength);
          const value = dataArray[dataIndex];
          const barHeight = (value / 255) * dimensions.height * 0.8;

          const x = i * barWidth;
          const y = dimensions.height - barHeight;

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(
            x + barGap / 2,
            y,
            barWidth - barGap,
            barHeight,
            4
          );
          ctx.fill();
        }
      } else {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteTimeDomainData(dataArray);

        ctx.lineWidth = 3;
        ctx.strokeStyle = gradient;
        ctx.beginPath();

        const sliceWidth = dimensions.width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * dimensions.height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        ctx.lineTo(dimensions.width, dimensions.height / 2);
        ctx.stroke();
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [analyser, dimensions, visualizerMode, isPlaying]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ imageRendering: 'auto' }}
      />

      <button
        onClick={toggleVisualizerMode}
        className={cn(
          'absolute top-3 right-3 p-2 rounded-lg glass-hover',
          'text-text-secondary hover:text-text-primary transition-all duration-200'
        )}
        title={visualizerMode === 'bars' ? '切换到波形模式' : '切换到柱状模式'}
      >
        {visualizerMode === 'bars' ? (
          <Activity className="w-5 h-5" />
        ) : (
          <BarChart3 className="w-5 h-5" />
        )}
      </button>
    </div>
  );
}

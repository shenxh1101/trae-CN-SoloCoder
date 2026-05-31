import { useEffect, useRef } from "react";
import { useGameStore } from "@/lib/gameStore";
import { COCO_LABEL_MAP, DetectionResult } from "@/lib/constants";

interface GameCanvasProps {
  video: HTMLVideoElement | null;
}

export default function GameCanvas({ video }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const prevResultsRef = useRef<DetectionResult[]>([]);

  const detectionResults = useGameStore((s) => s.detectionResults);
  const showBoundingBoxes = useGameStore((s) => s.showBoundingBoxes);

  useEffect(() => {
    prevResultsRef.current = detectionResults;
  }, [detectionResults]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      if (!video || video.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(draw);
        return;
      }

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (canvas.width !== vw || canvas.height !== vh) {
        canvas.width = vw;
        canvas.height = vh;
      }

      ctx.save();
      ctx.translate(vw, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, vw, vh);
      ctx.restore();

      if (showBoundingBoxes) {
        const results = prevResultsRef.current;
        results.forEach((det) => {
          const [bx, by, bw, bh] = det.bbox;
          const cat = COCO_LABEL_MAP[det.label];
          const color = cat?.color || "#00ffd5";

          const displayX = vw - bx - bw;
          const displayY = by;

          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          ctx.shadowColor = color;
          ctx.shadowBlur = 8;
          ctx.strokeRect(displayX, displayY, bw, bh);
          ctx.shadowBlur = 0;

          const cornerLen = Math.min(bw, bh) * 0.2;
          ctx.strokeStyle = color;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(displayX, displayY + cornerLen);
          ctx.lineTo(displayX, displayY);
          ctx.lineTo(displayX + cornerLen, displayY);
          ctx.moveTo(displayX + bw - cornerLen, displayY);
          ctx.lineTo(displayX + bw, displayY);
          ctx.lineTo(displayX + bw, displayY + cornerLen);
          ctx.moveTo(displayX + bw, displayY + bh - cornerLen);
          ctx.lineTo(displayX + bw, displayY + bh);
          ctx.lineTo(displayX + bw - cornerLen, displayY + bh);
          ctx.moveTo(displayX + cornerLen, displayY + bh);
          ctx.lineTo(displayX, displayY + bh);
          ctx.lineTo(displayX, displayY + bh - cornerLen);
          ctx.stroke();

          const labelText = `${cat?.label || det.label} ${Math.round(det.confidence * 100)}%`;
          ctx.font = "bold 14px Rajdhani, sans-serif";
          const textWidth = ctx.measureText(labelText).width;
          const labelH = 22;
          const padX = 6;
          const labelY = displayY > labelH + 4 ? displayY - labelH - 2 : displayY + bh + 2;

          ctx.fillStyle = color + "dd";
          ctx.fillRect(displayX, labelY, textWidth + padX * 2, labelH);

          ctx.fillStyle = "#0a0e17";
          ctx.fillText(labelText, displayX + padX, labelY + 16);
        });
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = 0;
      }
    };
  }, [video, showBoundingBoxes]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-cyber-bg overflow-hidden">
      <div className="absolute inset-0 scanline-overlay z-20 pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none z-30">
        <div className="absolute top-2 left-2 w-12 h-12 border-t-2 border-l-2 border-cyber-cyan/40" />
        <div className="absolute top-2 right-2 w-12 h-12 border-t-2 border-r-2 border-cyber-cyan/40" />
        <div className="absolute bottom-2 left-2 w-12 h-12 border-b-2 border-l-2 border-cyber-cyan/40" />
        <div className="absolute bottom-2 right-2 w-12 h-12 border-b-2 border-r-2 border-cyber-cyan/40" />
      </div>

      {!video && (
        <div className="z-10 text-gray-600 font-rajdhani text-lg">
          等待摄像头...
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-contain z-10"
      />
    </div>
  );
}

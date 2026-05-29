import { useState, useEffect } from 'react';

export default function FPSDisplay() {
  const [fps, setFps] = useState(60);
  const [frameCount, setFrameCount] = useState(0);
  const [lastTime, setLastTime] = useState(performance.now());

  useEffect(() => {
    let animationId: number;

    const update = () => {
      setFrameCount((prev) => prev + 1);
      animationId = requestAnimationFrame(update);
    };

    animationId = requestAnimationFrame(update);

    return () => cancelAnimationFrame(animationId);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      const currentFps = Math.round(frameCount / delta);
      setFps(currentFps);
      setFrameCount(0);
      setLastTime(now);
    }, 1000);

    return () => clearInterval(interval);
  }, [frameCount, lastTime]);

  const fpsColor = fps >= 50 ? 'text-green-400' : fps >= 30 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="fixed top-4 right-4 z-50 bg-black/60 backdrop-blur-sm px-3 py-2 rounded-lg">
      <span className={`font-mono text-sm font-bold ${fpsColor}`}>FPS: {fps}</span>
    </div>
  );
}

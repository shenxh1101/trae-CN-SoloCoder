import { useRef, useState, useEffect } from 'react';
import { Scene3D, Scene3DHandle } from '@/components/Scene3D';
import { ControlPanel } from '@/components/ControlPanel';
import { ToolBar } from '@/components/ToolBar';
import { StatusBar } from '@/components/StatusBar';
import { useStore } from '@/store/useStore';

export default function Home() {
  const sceneRef = useRef<Scene3DHandle>(null);
  const [vertexCount, setVertexCount] = useState(0);
  const [fps, setFps] = useState(0);
  const { setRecording, setRecordProgress } = useStore();

  useEffect(() => {
    const interval = setInterval(() => {
      if (sceneRef.current) {
        setVertexCount(sceneRef.current.getVertexCount());
        setFps(sceneRef.current.getFps());
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const handleScreenshot = () => {
    sceneRef.current?.takeScreenshot();
  };

  const handleExportOBJ = () => {
    sceneRef.current?.exportOBJ();
  };

  const handleStartRecording = (onComplete?: () => void) => {
    setRecording(true);
    setRecordProgress(0);
    sceneRef.current?.startRecording(() => {
      setRecording(false);
      setRecordProgress(0);
      onComplete?.();
    });
  };

  const handleStopRecording = async () => {
    await sceneRef.current?.stopRecording();
    setRecording(false);
    setRecordProgress(0);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-900">
      <Scene3D ref={sceneRef} />
      <ToolBar
        onScreenshot={handleScreenshot}
        onExportOBJ={handleExportOBJ}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
      />
      <ControlPanel />
      <StatusBar vertexCount={vertexCount} fps={fps} />

      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-center pointer-events-none">
        <h1 className="text-2xl font-bold text-white/90 tracking-wider drop-shadow-lg">
          动态流体雕塑
        </h1>
        <p className="text-xs text-white/50 mt-1">
          拖拽旋转 · 滚轮缩放 · 点击左侧工具栏
        </p>
      </div>
    </div>
  );
}

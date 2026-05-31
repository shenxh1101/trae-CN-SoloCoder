import { useState, useEffect, useCallback } from "react";
import { useGameStore } from "@/lib/gameStore";
import { useObjectDetection, useSpeech, speakTarget } from "@/hooks/useObjectDetection";
import GameCanvas from "@/components/GameCanvas";
import GameHUD from "@/components/GameHUD";
import TargetDisplay from "@/components/TargetDisplay";
import StartScreen from "@/components/StartScreen";
import LoadingScreen from "@/components/LoadingScreen";
import ResultScreen from "@/components/ResultScreen";

export default function Home() {
  const status = useGameStore((s) => s.status);
  const startGame = useGameStore((s) => s.startGame);
  const setStatus = useGameStore((s) => s.setStatus);

  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    loadModel,
    startCamera,
    stopCamera,
    startDetection,
    stopDetection,
  } = useObjectDetection();
  const { stop: stopSpeech } = useSpeech();

  useEffect(() => {
    if (status === "ended") {
      stopDetection();
    }
  }, [status, stopDetection]);

  const handleStartGame = useCallback(async () => {
    setIsLoading(true);

    try {
      const modelLoaded = await loadModel();
      if (!modelLoaded) {
        setIsLoading(false);
        return;
      }

      const vid = await startCamera();
      if (!vid) {
        setIsLoading(false);
        return;
      }

      setVideo(vid);
      startGame();

      setTimeout(() => {
        startDetection();
        const target = useGameStore.getState().currentTarget;
        if (useGameStore.getState().voiceEnabled) {
          speakTarget(target);
        }
      }, 500);

      setIsLoading(false);
    } catch (err) {
      console.error("Failed to start game:", err);
      setIsLoading(false);
    }
  }, [loadModel, startCamera, startGame, startDetection]);

  const handleNextPlayer = useCallback(async () => {
    setIsLoading(true);

    const hasNext = useGameStore.getState().nextPlayer();
    if (!hasNext) {
      setIsLoading(false);
      return;
    }

    try {
      const vid = await startCamera();
      if (!vid) {
        setIsLoading(false);
        return;
      }
      setVideo(vid);
      startGame();

      setTimeout(() => {
        startDetection();
        const target = useGameStore.getState().currentTarget;
        if (useGameStore.getState().voiceEnabled) {
          speakTarget(target);
        }
      }, 500);

      setIsLoading(false);
    } catch (err) {
      console.error("Failed to start next player:", err);
      setIsLoading(false);
    }
  }, [startCamera, startGame, startDetection]);

  useEffect(() => {
    return () => {
      stopDetection();
      stopCamera();
      stopSpeech();
    };
  }, [stopDetection, stopCamera, stopSpeech]);

  if (status === "idle") {
    return <StartScreen onStartGame={handleStartGame} loading={isLoading} />;
  }

  if (status === "loading" || isLoading) {
    return <LoadingScreen />;
  }

  if (status === "ended") {
    return <ResultScreen onNextPlayer={handleNextPlayer} />;
  }

  return (
    <div className="h-screen w-screen relative overflow-hidden bg-cyber-bg">
      <GameCanvas video={video} />
      <GameHUD />
      <TargetDisplay />
    </div>
  );
}

import { useEffect, useRef } from "react";
import { useGameStore } from "@/lib/gameStore";

export function useGameTimer() {
  const status = useGameStore((s) => s.status);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasEndedRef = useRef(false);

  useEffect(() => {
    hasEndedRef.current = false;

    if (status === "playing") {
      intervalRef.current = setInterval(() => {
        const currentState = useGameStore.getState();

        if (hasEndedRef.current) return;

        if (currentState.timeRemaining <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }

          hasEndedRef.current = true;
          useGameStore.setState({ timeRemaining: 0 });

          setTimeout(() => {
            const s = useGameStore.getState();
            s.saveCurrentPlayerRecord();
            s.endGame();
          }, 50);
        } else {
          currentState.tick();
        }
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [status]);

  return null;
}

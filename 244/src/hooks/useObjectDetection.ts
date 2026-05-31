import { useEffect, useRef, useCallback } from "react";
import * as tf from "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import { useGameStore } from "@/lib/gameStore";
import { DIFFICULTY_CONFIG, COCO_LABEL_MAP, DetectionResult } from "@/lib/constants";

export function useObjectDetection() {
  const modelRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastDetectTimeRef = useRef<number>(0);
  const isRunningRef = useRef(false);
  const matchProcessedRef = useRef<string>("");

  const loadModel = useCallback(async (): Promise<boolean> => {
    try {
      await tf.ready();
      if (!modelRef.current) {
        modelRef.current = await cocoSsd.load({ base: "lite_mobilenet_v2" });
      }
      return true;
    } catch (err) {
      console.error("Failed to load model:", err);
      return false;
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current) {
      try {
        const stream = videoRef.current.srcObject as MediaStream | null;
        if (stream) {
          stream.getTracks().forEach((t) => t.stop());
        }
      } catch (e) {
        console.error("Error stopping camera:", e);
      }
      videoRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async (): Promise<HTMLVideoElement | null> => {
    try {
      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      const video = document.createElement("video");
      video.srcObject = stream;
      video.setAttribute("playsinline", "");
      video.setAttribute("autoplay", "");
      video.setAttribute("muted", "");
      video.muted = true;
      video.playsInline = true;

      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = reject;
        video.play().catch(reject);
      });

      videoRef.current = video;
      return video;
    } catch (err) {
      console.error("Camera access failed:", err);
      return null;
    }
  }, [stopCamera]);

  const detect = useCallback(async () => {
    if (!modelRef.current || !videoRef.current || !isRunningRef.current) {
      return;
    }

    const state = useGameStore.getState();
    const now = Date.now();
    const config = DIFFICULTY_CONFIG[state.difficulty];

    if (now - lastDetectTimeRef.current < config.detectionInterval) {
      animFrameRef.current = requestAnimationFrame(detect);
      return;
    }

    lastDetectTimeRef.current = now;

    try {
      const video = videoRef.current;
      if (video.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(detect);
        return;
      }

      const predictions = await modelRef.current.detect(video);

      const filtered: DetectionResult[] = predictions
        .filter(
          (p) =>
            Object.prototype.hasOwnProperty.call(COCO_LABEL_MAP, p.class) &&
            p.score >= config.confidenceThreshold &&
            state.selectedObjects.includes(p.class)
        )
        .map((p) => ({
          label: p.class,
          confidence: p.score,
          bbox: [p.bbox[0], p.bbox[1], p.bbox[2], p.bbox[3]] as [
            number,
            number,
            number,
            number
          ],
        }));

      state.setDetectionResults(filtered);

      const currentState = useGameStore.getState();
      if (
        currentState.currentTarget &&
        currentState.status === "playing"
      ) {
        const found = filtered.some((f) => f.label === currentState.currentTarget);
        if (found && matchProcessedRef.current !== currentState.currentTarget) {
          matchProcessedRef.current = currentState.currentTarget;
          currentState.recordMatch(true);

          setTimeout(() => {
            if (isRunningRef.current) {
              matchProcessedRef.current = "";
              useGameStore.getState().nextTarget();

              if (useGameStore.getState().voiceEnabled) {
                speakTarget(useGameStore.getState().currentTarget);
              }
            }
          }, config.targetSwitchDelay);
        }
      }
    } catch (err) {
      console.error("Detection error:", err);
    }

    if (isRunningRef.current) {
      animFrameRef.current = requestAnimationFrame(detect);
    }
  }, []);

  const startDetection = useCallback(() => {
    isRunningRef.current = true;
    matchProcessedRef.current = "";
    lastDetectTimeRef.current = 0;

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }

    animFrameRef.current = requestAnimationFrame(detect);
  }, [detect]);

  const stopDetection = useCallback(() => {
    isRunningRef.current = false;
    matchProcessedRef.current = "";

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }

    useGameStore.getState().setDetectionResults([]);
  }, []);

  useEffect(() => {
    return () => {
      stopDetection();
      stopCamera();

      if (modelRef.current) {
        try {
          modelRef.current.dispose();
        } catch (e) {
          console.error("Error disposing model:", e);
        }
        modelRef.current = null;
      }
    };
  }, [stopDetection, stopCamera]);

  return {
    loadModel,
    startCamera,
    stopCamera,
    startDetection,
    stopDetection,
    videoRef,
  };
}

export function speakTarget(target: string | null) {
  if (!target || !("speechSynthesis" in window)) return;

  const cat = COCO_LABEL_MAP[target];
  if (!cat) return;

  try {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cat.label);
    utterance.lang = "zh-CN";
    utterance.rate = 1.1;
    utterance.volume = 0.9;
    utterance.pitch = 1;

    const trySpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      const chineseVoice = voices.find(
        (v) => v.lang.startsWith("zh") || v.lang.startsWith("cmn")
      );
      if (chineseVoice) {
        utterance.voice = chineseVoice;
      }
      window.speechSynthesis.speak(utterance);
    };

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      trySpeak();
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        trySpeak();
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  } catch (e) {
    console.error("Speech error:", e);
  }
}

export function useSpeech() {
  const speak = useCallback((target: string | null) => {
    speakTarget(target);
  }, []);

  const stop = useCallback(() => {
    if ("speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        console.error("Error stopping speech:", e);
      }
    }
  }, []);

  return { speak, stop };
}

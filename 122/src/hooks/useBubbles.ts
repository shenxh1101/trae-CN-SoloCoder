import { useState, useCallback, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { BubbleData, ParticleData, SCENE_CONSTANTS, BUBBLE_DEFAULTS } from '../utils/constants';
import { generateBubbleColor } from '../utils/colors';
import { useBubbleStore } from '../store/useBubbleStore';

const randomRange = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

const createBubble = (id: number, colorMode: string, minSize: number, maxSize: number): BubbleData => {
  const { BOUNDS } = SCENE_CONSTANTS;
  const baseX = randomRange(-BOUNDS.X, BOUNDS.X);
  return {
    id,
    position: [
      baseX,
      randomRange(-BOUNDS.Y, BOUNDS.Y),
      randomRange(-BOUNDS.Z, BOUNDS.Z),
    ],
    velocity: [0, randomRange(0.01, 0.05), 0],
    size: randomRange(minSize, maxSize),
    color: generateBubbleColor(colorMode as any),
    wobbleOffset: randomRange(0, Math.PI * 2),
    wobbleSpeed: randomRange(0.5, 1.5),
    baseX,
  };
};

export const useBubbles = () => {
  const [bubbles, setBubbles] = useState<BubbleData[]>([]);
  const [particles, setParticles] = useState<ParticleData[]>([]);
  const particleIdRef = useRef(0);
  const bubbleIdRef = useRef(0);

  const { bubbleCount, minSize, maxSize, colorMode } = useBubbleStore();

  const initBubbles = useCallback(() => {
    const { count, min, max, mode } = {
      count: bubbleCount,
      min: minSize,
      max: maxSize,
      mode: colorMode,
    };
    const newBubbles: BubbleData[] = [];
    for (let i = 0; i < count; i++) {
      newBubbles.push(createBubble(bubbleIdRef.current++, mode, min, max));
    }
    setBubbles(newBubbles);
  }, [bubbleCount, minSize, maxSize, colorMode]);

  useEffect(() => {
    initBubbles();
  }, [bubbleCount, colorMode, minSize, maxSize]);

  const updateBubbles = useCallback((time: number) => {
    const { BOUNDS, WOBBLE_AMPLITUDE } = SCENE_CONSTANTS;
    const floatSpeed = useBubbleStore.getState().floatSpeed;

    setBubbles((prevBubbles) =>
      prevBubbles.map((bubble) => {
        let [x, y, z] = bubble.position;
        const [, vy] = bubble.velocity;

        y += vy * floatSpeed * 60;

        const wobble = Math.sin(time * bubble.wobbleSpeed + bubble.wobbleOffset) * WOBBLE_AMPLITUDE;
        x = bubble.baseX + wobble;

        if (y > BOUNDS.Y) {
          y = -BOUNDS.Y;
          bubble.baseX = randomRange(-BOUNDS.X, BOUNDS.X);
        }

        return {
          ...bubble,
          position: [x, y, z] as [number, number, number],
        };
      })
    );
  }, []);

  const popBubble = useCallback((bubbleId: number) => {
    const bubble = bubbles.find((b) => b.id === bubbleId);
    if (!bubble) return;

    const particleCount = Math.floor(randomRange(15, 25));
    const newParticles: ParticleData[] = [];

    for (let i = 0; i < particleCount; i++) {
      const theta = randomRange(0, Math.PI * 2);
      const phi = randomRange(0, Math.PI);
      const speed = randomRange(0.1, 0.3);

      newParticles.push({
        id: particleIdRef.current++,
        position: [...bubble.position] as [number, number, number],
        velocity: [
          Math.sin(phi) * Math.cos(theta) * speed,
          Math.sin(phi) * Math.sin(theta) * speed,
          Math.cos(phi) * speed,
        ],
        color: bubble.color,
        size: randomRange(0.1, 0.3),
        life: 1.5,
        maxLife: 1.5,
      });
    }

    setParticles((prev) => [...prev, ...newParticles]);

    setBubbles((prevBubbles) => {
      const state = useBubbleStore.getState();
      const filtered = prevBubbles.filter((b) => b.id !== bubbleId);
      const newBubble = createBubble(
        bubbleIdRef.current++,
        state.colorMode,
        state.minSize,
        state.maxSize
      );
      newBubble.position[1] = -SCENE_CONSTANTS.BOUNDS.Y;
      return [...filtered, newBubble];
    });
  }, [bubbles]);

  const updateParticles = useCallback((deltaTime: number) => {
    setParticles((prevParticles) =>
      prevParticles
        .map((particle) => {
          const [x, y, z] = particle.position;
          const [vx, vy, vz] = particle.velocity;

          return {
            ...particle,
            position: [x + vx, y + vy, z + vz] as [number, number, number],
            life: particle.life - deltaTime,
            size: particle.size * (particle.life / particle.maxLife),
          };
        })
        .filter((particle) => particle.life > 0)
    );
  }, []);

  return {
    bubbles,
    particles,
    initBubbles,
    updateBubbles,
    updateParticles,
    popBubble,
  };
};

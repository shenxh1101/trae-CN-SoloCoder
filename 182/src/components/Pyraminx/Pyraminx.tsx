import { useState, useRef, useCallback, useEffect } from 'react';
import { useThree, ThreeEvent } from '@react-three/fiber';
import { useAppStore } from '../../store/appStore';
import { Piece, Face, Direction } from '../../types';
import PyraminxPiece from './PyraminxPiece';

export default function Pyraminx() {
  const { pieces, style, showEdges, makeMove, isAnimating } = useAppStore();
  const [selectedPiece, setSelectedPiece] = useState<Piece | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const { gl } = useThree();
  const mouse = useRef({ x: 0, y: 0 });
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);
  const touchStartTime = useRef<number>(0);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = useCallback((piece: Piece, e: ThreeEvent<PointerEvent>) => {
    if (isAnimating) return;

    const isTouch = e.pointerType === 'touch';
    
    if (isTouch) {
      touchStartTime.current = Date.now();
      touchStartPos.current = { x: e.clientX, y: e.clientY };
      
      longPressTimer.current = setTimeout(() => {
        isLongPress.current = true;
        setSelectedPiece(piece);
        setIsDragging(true);
        setDragStart({ x: 0, y: 0 });
      }, 500);
    } else {
      setSelectedPiece(piece);
      setIsDragging(true);
      setDragStart({ x: 0, y: 0 });
    }
  }, [isAnimating]);

  const handlePointerMove = useCallback((event: PointerEvent) => {
    if (!isDragging || !selectedPiece || !dragStart) return;

    const rect = gl.domElement.getBoundingClientRect();
    mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    if (dragStart.x === 0 && dragStart.y === 0) {
      setDragStart({ x: mouse.current.x, y: mouse.current.y });
      return;
    }

    const dx = mouse.current.x - dragStart.x;
    const dy = mouse.current.y - dragStart.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0.08) {
      const face = determineFaceFromPiece(selectedPiece);
      const direction = determineDirection(dx, dy) as Direction;

      if (face && direction) {
        makeMove(face, direction, 'middle');
      }

      setIsDragging(false);
      setSelectedPiece(null);
      setDragStart(null);
      isLongPress.current = false;
      
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }
  }, [isDragging, selectedPiece, dragStart, makeMove, gl]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    setSelectedPiece(null);
    setDragStart(null);
    isLongPress.current = false;
    touchStartPos.current = null;
    
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchStartPos.current) return;
    
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartPos.current.x;
    const dy = touch.clientY - touchStartPos.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 10 && !isLongPress.current && longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const determineFaceFromPiece = (piece: Piece): Face | null => {
    const pos = piece.position;
    const dotProducts = [
      { face: 'U' as Face, dot: pos[1] },
      { face: 'R' as Face, dot: pos[0] * 0.577 + pos[1] * -0.577 + pos[2] * 0.577 },
      { face: 'L' as Face, dot: pos[0] * -0.577 + pos[1] * -0.577 + pos[2] * 0.577 },
      { face: 'B' as Face, dot: pos[0] * 0 + pos[1] * -0.577 + pos[2] * -0.816 },
    ];

    dotProducts.sort((a, b) => b.dot - a.dot);
    return dotProducts[0].face;
  };

  const determineDirection = (dx: number, dy: number): Direction => {
    const angle = Math.atan2(dy, dx);
    const normalizedAngle = ((angle + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2);
    return normalizedAngle < 0.5 ? 'clockwise' : 'counterclockwise';
  };

  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointerleave', handlePointerUp);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointerleave', handlePointerUp);
      canvas.removeEventListener('touchmove', handleTouchMove);
    };
  }, [handlePointerMove, handlePointerUp, handleTouchMove, gl]);

  return (
    <group>
      {pieces.map((piece) => (
        <PyraminxPiece
          key={piece.id}
          piece={piece}
          style={style}
          showEdges={showEdges}
          onPointerDown={(p, e) => handlePointerDown(p, e as any)}
        />
      ))}
      
      {selectedPiece && (
        <mesh position={selectedPiece.position}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial color="#00f5ff" transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  );
}

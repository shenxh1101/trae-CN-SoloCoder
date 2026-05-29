import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Pause, Play, X } from 'lucide-react';
import { GameEngine } from '../game/GameEngine';
import { GameCanvas } from '../components/GameCanvas';
import { GameHUD } from '../components/GameHUD';
import { JudgeFeedback } from '../components/JudgeFeedback';
import { useGameStore } from '../store/gameStore';
import { Direction, GameState, JudgeResult, Note } from '../types/game';
import { calculateAccuracy, GAME_CONFIG, getGrade, KEY_MAP } from '../config/gameConfig';
import { getHighScoreForSong, saveHighScore } from '../utils/storage';

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;

export function GamePage() {
  const { songId } = useParams<{ songId: string }>();
  const navigate = useNavigate();
  const { songs, setGameResult } = useGameStore();
  const song = songs.find(s => s.id === songId);

  const engineRef = useRef<GameEngine | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    combo: 0,
    maxCombo: 0,
    health: 100,
    perfectCount: 0,
    goodCount: 0,
    missCount: 0,
    isPlaying: false,
    isPaused: false,
    currentTime: 0,
  });
  const [visibleNotes, setVisibleNotes] = useState<Array<Note & { y: number }>>([]);
  const [pressedKeys, setPressedKeys] = useState<Set<Direction>>(new Set());
  const [judgeResult, setJudgeResult] = useState<JudgeResult | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [showPause, setShowPause] = useState(false);

  useEffect(() => {
    if (!song) {
      navigate('/');
      return;
    }

    const engine = new GameEngine(song, song.audioUrl);

    engine.onUpdate((state) => {
      setGameState(state);
      const notes = engine.getVisibleNotes(
        state.currentTime,
        GAME_CONFIG.noteSpeed,
        CANVAS_HEIGHT
      );
      setVisibleNotes(notes);
    });

    engine.onJudge((result) => {
      setJudgeResult(result);
      setTimeout(() => setJudgeResult(null), 500);
    });

    engine.onEnd(() => {
      handleGameEnd();
    });

    engineRef.current = engine;

    return () => {
      engine.destroy();
    };
  }, [song, navigate]);

  const handleGameEnd = () => {
    if (!song) return;

    const totalNotes = song.notes.length;
    const accuracy = calculateAccuracy(
      gameState.perfectCount,
      gameState.goodCount,
      totalNotes
    );
    const grade = getGrade(accuracy);
    const prevHighScore = getHighScoreForSong(song.id);
    const isNewRecord = !prevHighScore || gameState.score > (prevHighScore?.score || 0);

    if (isNewRecord) {
      saveHighScore({
        songId: song.id,
        score: gameState.score,
        grade,
        date: new Date().toISOString(),
      });
    }

    setGameResult({
      score: gameState.score,
      maxCombo: gameState.maxCombo,
      perfectCount: gameState.perfectCount,
      goodCount: gameState.goodCount,
      missCount: gameState.missCount,
      accuracy,
      grade,
      isNewRecord,
    });

    navigate('/result');
  };

  useEffect(() => {
    if (!isStarted) return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      engineRef.current?.start();
    }
  }, [isStarted, countdown]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();

      if (e.key === 'Escape') {
        if (gameState.isPlaying) {
          if (gameState.isPaused) {
            engineRef.current?.resume();
            setShowPause(false);
          } else {
            engineRef.current?.pause();
            setShowPause(true);
          }
        }
        return;
      }

      if (!isStarted || countdown > 0 || showPause) return;

      const direction = KEY_MAP[e.key];
      if (direction) {
        setPressedKeys((prev) => new Set(prev).add(direction));
        engineRef.current?.handleKeyPress(direction);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const direction = KEY_MAP[e.key];
      if (direction) {
        setPressedKeys((prev) => {
          const next = new Set(prev);
          next.delete(direction);
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isStarted, countdown, showPause, gameState.isPlaying, gameState.isPaused]);

  const handleStart = () => {
    setIsStarted(true);
  };

  const handleQuit = () => {
    engineRef.current?.stop();
    navigate('/');
  };

  const handleResume = () => {
    engineRef.current?.resume();
    setShowPause(false);
  };

  const handleRetry = () => {
    window.location.reload();
  };

  if (!song) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
      <div className="relative">
        <GameHUD gameState={gameState} />

        <div className="relative rounded-lg overflow-hidden shadow-2xl shadow-cyan-500/20">
          <GameCanvas
            notes={visibleNotes}
            pressedKeys={pressedKeys}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
          />

          <JudgeFeedback result={judgeResult} />

          {!isStarted && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
              <h2 className="text-2xl font-bold text-white mb-4">{song.name}</h2>
              <p className="text-gray-400 mb-8">准备开始</p>
              <button
                onClick={handleStart}
                className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-pink-500 text-white rounded-lg font-bold text-lg hover:from-cyan-400 hover:to-pink-400 transition-all duration-300 hover:scale-105"
              >
                开始游戏
              </button>
            </div>
          )}

          {isStarted && countdown > 0 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-8xl font-bold text-cyan-400 animate-pulse">
                {countdown}
              </span>
            </div>
          )}

          {showPause && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center">
              <h2 className="text-3xl font-bold text-white mb-8">暂停</h2>
              <div className="flex flex-col gap-4">
                <button
                  onClick={handleResume}
                  className="flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-cyan-500 to-pink-500 text-white rounded-lg font-bold hover:from-cyan-400 hover:to-pink-400 transition-all"
                >
                  <Play className="w-5 h-5" />
                  继续
                </button>
                <button
                  onClick={handleRetry}
                  className="flex items-center justify-center gap-2 px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold transition-all"
                >
                  重试
                </button>
                <button
                  onClick={handleQuit}
                  className="flex items-center justify-center gap-2 px-8 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-bold transition-all"
                >
                  <X className="w-5 h-5" />
                  返回菜单
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-center gap-2">
          {['left', 'down', 'up', 'right'].map((dir) => {
            const isPressed = pressedKeys.has(dir as Direction);
            return (
              <div
                key={dir}
                className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-xl transition-all ${
                  isPressed
                    ? 'bg-cyan-500 text-white scale-95'
                    : 'bg-gray-700 text-gray-400'
                }`}
              >
                {dir === 'left' && '←'}
                {dir === 'down' && '↓'}
                {dir === 'up' && '↑'}
                {dir === 'right' && '→'}
              </div>
            );
          })}
        </div>

        <div className="mt-4 text-center text-gray-500 text-sm">
          <p>使用方向键或 WASD 按键 | ESC 暂停</p>
        </div>
      </div>
    </div>
  );
}

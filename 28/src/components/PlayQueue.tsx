import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  X,
  GripVertical,
  Trash2,
  Play,
  ListMusic,
  Music,
} from 'lucide-react';
import { usePlayerStore } from '@/store/playerStore';
import { cn } from '@/lib/utils';
import type { Song } from '@/services/api';

interface PlayQueueProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SortableItemProps {
  song: Song;
  index: number;
  isActive: boolean;
  onRemove: (index: number) => void;
  onPlay: (song: Song) => void;
}

function SortableItem({ song, index, isActive, onRemove, onPlay }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: song.id.toString(),
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ delay: index * 0.03 }}
      className={cn(
        'song-item group',
        isActive && 'active',
        isDragging && 'opacity-50 shadow-lg shadow-accent-purple/20'
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-white/5 transition-colors"
      >
        <GripVertical className="w-4 h-4 text-text-muted" />
      </div>

      <img
        src={song.album.picUrl}
        alt={song.name}
        className="w-10 h-10 rounded object-cover"
      />

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm font-medium truncate',
            isActive ? 'text-accent-cyan' : 'text-text-primary'
          )}
        >
          {song.name}
        </p>
        <p className="text-xs text-text-secondary truncate">
          {song.artists.map((a) => a.name).join(' / ')}
        </p>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onPlay(song)}
          className="p-1.5 rounded-full hover:bg-accent-purple/20 text-text-secondary hover:text-accent-purple transition-colors"
          title="播放"
        >
          <Play className="w-4 h-4" />
        </button>
        <button
          onClick={() => onRemove(index)}
          className="p-1.5 rounded-full hover:bg-red-500/20 text-text-secondary hover:text-red-400 transition-colors"
          title="移除"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {isActive && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-accent rounded-r-full" />
      )}
    </motion.div>
  );
}

export default function PlayQueue({ isOpen, onClose }: PlayQueueProps) {
  const { playQueue, currentSong, reorderQueue, removeFromQueue, clearQueue, setCurrentSong } =
    usePlayerStore();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = playQueue.findIndex((s) => s.id.toString() === active.id);
      const newIndex = playQueue.findIndex((s) => s.id.toString() === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderQueue(oldIndex, newIndex);
      }
    }
  };

  const handlePlayAll = () => {
    if (playQueue.length > 0) {
      setCurrentSong(playQueue[0], true);
    }
  };

  const handlePlaySong = (song: Song) => {
    setCurrentSong(song, true);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-bg-secondary border-l border-border-subtle z-50 flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <ListMusic className="w-5 h-5 text-accent-purple" />
                <h2 className="text-lg font-semibold text-text-primary">播放队列</h2>
                <span className="text-sm text-text-muted">({playQueue.length} 首)</span>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/5 text-text-secondary hover:text-text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {playQueue.length > 0 && (
              <div className="flex items-center gap-2 p-3 border-b border-border-subtle">
                <button
                  onClick={handlePlayAll}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-gradient-accent text-white font-medium hover:opacity-90 transition-opacity btn-glow"
                >
                  <Play className="w-4 h-4" />
                  播放全部
                </button>
                <button
                  onClick={clearQueue}
                  className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg border border-border-subtle text-text-secondary hover:bg-white/5 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  清空
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-3">
              {playQueue.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center h-full text-center p-8"
                >
                  <div className="w-20 h-20 rounded-full bg-bg-tertiary flex items-center justify-center mb-4">
                    <Music className="w-10 h-10 text-text-muted" />
                  </div>
                  <p className="text-text-secondary mb-2">播放队列为空</p>
                  <p className="text-text-muted text-sm">去搜索添加一些歌曲吧</p>
                </motion.div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={playQueue.map((s) => s.id.toString())}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {playQueue.map((song, index) => (
                        <SortableItem
                          key={song.id}
                          song={song}
                          index={index}
                          isActive={currentSong?.id === song.id}
                          onRemove={removeFromQueue}
                          onPlay={handlePlaySong}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

import { useState } from 'react';
import { ChevronUp, ChevronDown, Keyboard } from 'lucide-react';

export function Shortcuts() {
  const [expanded, setExpanded] = useState(true);

  const shortcuts = [
    { keys: ['W', '↑'], description: '向前移动' },
    { keys: ['S', '↓'], description: '向后移动' },
    { keys: ['A', '←'], description: '向左移动' },
    { keys: ['D', '→'], description: '向右移动' },
    { keys: ['V'], description: '切换视角' },
    { keys: ['R'], description: '重置位置' },
    { keys: ['鼠标'], description: '视角控制' },
    { keys: ['点击'], description: '锁定鼠标' },
    { keys: ['ESC'], description: '解锁鼠标' },
  ];

  return (
    <div className="absolute bottom-4 right-4 z-10">
      <div className="bg-black/60 backdrop-blur-md border border-purple-500/30 rounded-lg overflow-hidden shadow-lg shadow-purple-500/10 min-w-[200px]">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-4 py-2 flex items-center justify-between text-sm text-gray-300 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Keyboard size={14} className="text-purple-400" />
            <span className="font-mono">快捷键</span>
          </div>
          {expanded ? (
            <ChevronDown size={14} className="text-gray-500" />
          ) : (
            <ChevronUp size={14} className="text-gray-500" />
          )}
        </button>

        {expanded && (
          <div className="p-3 space-y-1.5 border-t border-gray-700/50">
            {shortcuts.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  {item.keys.map((key, i) => (
                    <span key={i}>
                      <kbd className="px-1.5 py-0.5 bg-gray-800 border border-gray-600 rounded text-gray-300 font-mono text-[10px]">
                        {key}
                      </kbd>
                      {i < item.keys.length - 1 && (
                        <span className="text-gray-600 mx-0.5">/</span>
                      )}
                    </span>
                  ))}
                </div>
                <span className="text-gray-400 font-mono text-[10px]">
                  {item.description}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { getShortClassName } from '../utils/api';

interface TagCloudProps {
  frequency: Record<string, number>;
}

const tagColors = [
  'from-primary-500/30 to-primary-400/20 border-primary-400/40 text-primary-200',
  'from-accent-500/30 to-accent-400/20 border-accent-400/40 text-accent-200',
  'from-cyan-500/30 to-cyan-400/20 border-cyan-400/40 text-cyan-200',
  'from-purple-500/30 to-purple-400/20 border-purple-400/40 text-purple-200',
  'from-pink-500/30 to-pink-400/20 border-pink-400/40 text-pink-200',
  'from-emerald-500/30 to-emerald-400/20 border-emerald-400/40 text-emerald-200',
  'from-amber-500/30 to-amber-400/20 border-amber-400/40 text-amber-200',
  'from-rose-500/30 to-rose-400/20 border-rose-400/40 text-rose-200',
];

export function TagCloud({ frequency }: TagCloudProps) {
  const entries = Object.entries(frequency).sort((a, b) => b[1] - a[1]);
  const maxCount = Math.max(...entries.map(([, count]) => count), 1);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 justify-center items-center p-4">
      {entries.map(([className, count], index) => {
        const sizeRatio = count / maxCount;
        const fontSize = 0.875 + sizeRatio * 0.875;
        const paddingX = 3 + sizeRatio * 3;
        const paddingY = 1 + sizeRatio * 1.5;
        const colorClass = tagColors[index % tagColors.length];
        const shortName = getShortClassName(className);

        return (
          <span
            key={className}
            className={`inline-flex items-center gap-1.5 rounded-full font-medium
              bg-gradient-to-r border transition-all duration-300
              hover:scale-110 hover:shadow-lg cursor-default animate-float
              ${colorClass}`}
            style={{
              fontSize: `${fontSize}rem`,
              padding: `${paddingY}px ${paddingX * 2}px`,
              animationDelay: `${index * 0.1}s`,
            }}
          >
            <span>{shortName}</span>
            <span className="text-xs opacity-70 bg-dark-900/30 px-1.5 py-0.5 rounded-full">
              ×{count}
            </span>
          </span>
        );
      })}
    </div>
  );
}

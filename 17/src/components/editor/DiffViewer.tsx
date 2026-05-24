import { useMemo } from 'react';
import * as Diff from 'diff';
import { cn } from '@/lib/utils';

interface DiffViewerProps {
  oldCode: string;
  newCode: string;
  language?: string;
  oldLabel?: string;
  newLabel?: string;
}

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export default function DiffViewer({
  oldCode,
  newCode,
  oldLabel = '旧版本',
  newLabel = '新版本',
}: DiffViewerProps) {
  const diffLines = useMemo(() => {
    const changes = Diff.diffLines(oldCode, newCode);
    const lines: DiffLine[] = [];
    let oldLineNum = 1;
    let newLineNum = 1;

    changes.forEach((change) => {
      const changeLines = change.value.split('\n');
      if (changeLines[changeLines.length - 1] === '') {
        changeLines.pop();
      }

      changeLines.forEach((line) => {
        if (change.added) {
          lines.push({
            type: 'added',
            content: line,
            newLineNumber: newLineNum++,
          });
        } else if (change.removed) {
          lines.push({
            type: 'removed',
            content: line,
            oldLineNumber: oldLineNum++,
          });
        } else {
          lines.push({
            type: 'unchanged',
            content: line,
            oldLineNumber: oldLineNum++,
            newLineNumber: newLineNum++,
          });
        }
      });
    });

    return lines;
  }, [oldCode, newCode]);

  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    diffLines.forEach((line) => {
      if (line.type === 'added') added++;
      if (line.type === 'removed') removed++;
    });
    return { added, removed };
  }, [diffLines]);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 rounded-full bg-green-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              新增 {stats.added} 行
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 rounded-full bg-red-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              删除 {stats.removed} 行
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-500 dark:text-gray-400">{oldLabel}</span>
          <span className="text-gray-300 dark:text-gray-600">→</span>
          <span className="text-gray-500 dark:text-gray-400">{newLabel}</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full border-collapse font-mono text-sm">
          <tbody>
            {diffLines.map((line, idx) => (
              <tr
                key={idx}
                className={cn(
                  'border-b border-gray-100 last:border-b-0 dark:border-gray-800',
                  line.type === 'added' && 'bg-green-50 dark:bg-green-900/20',
                  line.type === 'removed' && 'bg-red-50 dark:bg-red-900/20'
                )}
              >
                <td className="w-12 select-none border-r border-gray-200 bg-gray-50 px-2 py-0.5 text-right text-gray-400 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-500">
                  {line.oldLineNumber || ''}
                </td>
                <td className="w-12 select-none border-r border-gray-200 bg-gray-50 px-2 py-0.5 text-right text-gray-400 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-500">
                  {line.newLineNumber || ''}
                </td>
                <td className="w-6 px-1 py-0.5 text-center">
                  {line.type === 'added' && (
                    <span className="text-green-600 dark:text-green-400">+</span>
                  )}
                  {line.type === 'removed' && (
                    <span className="text-red-600 dark:text-red-400">-</span>
                  )}
                </td>
                <td
                  className={cn(
                    'px-3 py-0.5 whitespace-pre',
                    line.type === 'added' && 'text-green-800 dark:text-green-300',
                    line.type === 'removed' && 'text-red-800 dark:text-red-300',
                    line.type === 'unchanged' && 'text-gray-700 dark:text-gray-300'
                  )}
                >
                  {line.content || ' '}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

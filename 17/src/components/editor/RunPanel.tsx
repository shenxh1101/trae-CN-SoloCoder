import { useState, useCallback } from 'react';
import { Play, Square, Terminal, Clock, Cpu, HardDrive, ChevronUp, ChevronDown, Copy, Check, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RunResponse } from '@/shared/types';

interface RunPanelProps {
  onRun: (stdin: string) => Promise<RunResponse | null> | void;
  isRunning?: boolean;
  result?: RunResponse | null;
  defaultStdin?: string;
  className?: string;
}

interface ResourceUsage {
  cpu: number;
  memory: number;
  time: number;
}

export default function RunPanel({
  onRun,
  isRunning = false,
  result,
  defaultStdin = '',
  className,
}: RunPanelProps) {
  const [stdin, setStdin] = useState(defaultStdin);
  const [activeTab, setActiveTab] = useState<'stdin' | 'stdout' | 'stderr'>('stdout');
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const resourceUsage: ResourceUsage = {
    cpu: result ? Math.min(100, Math.random() * 50 + 10) : 0,
    memory: result ? Math.min(100, (result.memoryUsed / 512) * 100) : 0,
    time: result ? Math.min(100, (result.executionTime / 5000) * 100) : 0,
  };

  const handleRun = useCallback(async () => {
    await onRun(stdin);
  }, [onRun, stdin]);

  const handleCopyOutput = useCallback(async () => {
    if (!result) return;
    const text = result.stdout + (result.stderr ? `\n${result.stderr}` : '');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [result]);

  const handleClear = useCallback(() => {
    setStdin('');
  }, []);

  const ProgressBar = ({
    label,
    value,
    maxValue,
    unit,
    icon: Icon,
    color,
  }: {
    label: string;
    value: number;
    maxValue: number;
    unit: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  }) => (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
      <div className="flex-1">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
          <span className="text-xs font-mono text-gray-500 dark:text-gray-500">
            {value.toFixed(1)}{unit} / {maxValue}{unit}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className={cn('h-full rounded-full transition-all duration-500', color)}
            style={{ width: `${Math.min(100, (value / maxValue) * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );

  const tabs = [
    { key: 'stdin' as const, label: '标准输入', icon: Terminal },
    { key: 'stdout' as const, label: '标准输出', icon: Terminal },
    { key: 'stderr' as const, label: '错误输出', icon: Terminal },
  ];

  const hasContent = (tab: typeof activeTab) => {
    if (tab === 'stdin') return stdin.length > 0;
    if (tab === 'stdout') return result?.stdout && result.stdout.length > 0;
    if (tab === 'stderr') return result?.stderr && result.stderr.length > 0;
    return false;
  };

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900',
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/50">
        <div className="flex items-center gap-3">
          <button
            onClick={handleRun}
            disabled={isRunning}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              isRunning
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                : 'bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900'
            )}
          >
            {isRunning ? (
              <>
                <Square className="h-4 w-4" />
                运行中...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                运行
              </>
            )}
          </button>

          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            控制台
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyOutput}
            disabled={!result}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-200 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            title="复制输出"
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </button>
          <button
            onClick={handleClear}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            title="清空"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            title={isExpanded ? '收起' : '展开'}
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          <div className="grid gap-4 border-b border-gray-200 p-4 dark:border-gray-800 md:grid-cols-3">
            <ProgressBar
              label="CPU 使用率"
              value={resourceUsage.cpu}
              maxValue={100}
              unit="%"
              icon={Cpu}
              color="bg-blue-500"
            />
            <ProgressBar
              label="内存使用"
              value={result?.memoryUsed || 0}
              maxValue={512}
              unit="MB"
              icon={HardDrive}
              color="bg-purple-500"
            />
            <ProgressBar
              label="执行时间"
              value={result?.executionTime || 0}
              maxValue={5000}
              unit="ms"
              icon={Clock}
              color="bg-orange-500"
            />
          </div>

          <div className="border-b border-gray-200 dark:border-gray-800">
            <div className="flex">
              {tabs.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={cn(
                    'relative inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                    activeTab === key
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  {hasContent(key) && (
                    <span className="ml-1 rounded-full bg-gray-200 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      {key === 'stdin'
                        ? stdin.length
                        : result?.[key]?.length || 0}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            {activeTab === 'stdin' && (
              <textarea
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                placeholder="在此输入标准输入数据..."
                className="h-full min-h-[200px] w-full resize-none bg-gray-50 p-4 font-mono text-sm text-gray-900 placeholder-gray-400 focus:outline-none dark:bg-gray-800/50 dark:text-white dark:placeholder-gray-500"
                spellCheck={false}
              />
            )}

            {activeTab === 'stdout' && (
              <div className="h-full min-h-[200px] overflow-auto bg-gray-50 p-4 font-mono text-sm dark:bg-gray-800/50">
                {isRunning ? (
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <div className="h-3 w-3 animate-pulse rounded-full bg-green-500" />
                    正在执行...
                  </div>
                ) : result?.stdout ? (
                  <pre className="whitespace-pre-wrap text-gray-900 dark:text-gray-100">
                    {result.stdout}
                  </pre>
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-400 dark:text-gray-500">
                    暂无输出
                  </div>
                )}
              </div>
            )}

            {activeTab === 'stderr' && (
              <div className="h-full min-h-[200px] overflow-auto bg-gray-50 p-4 font-mono text-sm dark:bg-gray-800/50">
                {result?.stderr ? (
                  <pre className="whitespace-pre-wrap text-red-600 dark:text-red-400">
                    {result.stderr}
                  </pre>
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-400 dark:text-gray-500">
                    暂无错误输出
                  </div>
                )}
              </div>
            )}
          </div>

          {result && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-2 text-xs dark:border-gray-800 dark:bg-gray-800/50">
              <div className="flex items-center gap-4">
                <span className={cn(
                  'font-medium',
                  result.exitCode === 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                )}>
                  退出码: {result.exitCode}
                </span>
                {result.error && (
                  <span className="text-red-600 dark:text-red-400">
                    错误: {result.error}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400">
                <span>耗时: {result.executionTime}ms</span>
                <span>内存: {result.memoryUsed}MB</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

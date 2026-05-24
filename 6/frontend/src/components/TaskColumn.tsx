import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import TaskCard from './TaskCard';
import type { TaskList } from '../types';

interface Props {
  list: TaskList;
  onAddTask: (listId: string) => void;
}

const statusColors: Record<string, string> = {
  '待处理': 'bg-gray-100 text-gray-700',
  '进行中': 'bg-blue-100 text-blue-700',
  '待审核': 'bg-purple-100 text-purple-700',
  '已完成': 'bg-green-100 text-green-700',
};

export default function TaskColumn({ list, onAddTask }: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: list.id,
  });

  return (
    <div className="flex-shrink-0 w-72 md:w-80">
      <div className="bg-gray-100 rounded-t-lg px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <span className={`w-3 h-3 rounded-full mr-2 ${statusColors[list.name] || 'bg-gray-400'}`} />
          <h3 className="font-medium text-gray-800">{list.name}</h3>
          <span className="ml-2 bg-white text-gray-600 text-xs px-2 py-0.5 rounded-full">
            {list.tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAddTask(list.id)}
          className="text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded p-1"
        >
          ➕
        </button>
      </div>

      <div
        ref={setNodeRef}
        className={`bg-gray-100 rounded-b-lg p-3 min-h-[200 space-y-3 ${
          isOver ? 'bg-gray-200' : ''
        } transition-colors`}
      >
        <SortableContext
          items={list.tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {list.tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </SortableContext>

        {list.tasks.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-8">
          暂无任务
          </div>
        )}
      </div>
    </div>
  );
}

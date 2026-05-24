import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Link } from 'react-router-dom';
import { format, isPast } from 'date-fns';
import type { Task } from '../types';

interface Props {
  task: Task;
}

const priorityColors = {
  HIGH: 'bg-red-100 text-red-700 border-red-200',
  MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  LOW: 'bg-green-100 text-green-700 border-green-200',
};

const priorityLabels = {
  HIGH: '高',
  MEDIUM: '中',
  LOW: '低',
};

export default function TaskCard({ task }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== 'DONE';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white rounded-lg border border-gray-200 p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
    >
      <Link to={`/tasks/${task.id}`} onClick={(e) => e.stopPropagation()}>
        <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">
          {task.title}
        </h4>
      </Link>

      <div className="flex flex-wrap gap-2 mb-2">
        {task.tags.map((tag) => (
        <span
          key={tag.id}
          className="px-2 py-0.5 text-xs rounded-full"
          style={{ backgroundColor: tag.color + '20', color: tag.color }}
        >
          {tag.name}
        </span>
      ))}
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span
          className={`px-2 py-0.5 rounded text-xs border ${priorityColors[task.priority]}`}
        >
          {priorityLabels[task.priority]}优先级
        </span>

          {task.dueDate && (
          <span
            className={`px-2 py-0.5 rounded text-xs ${
              isOverdue
                ? 'bg-red-100 text-red-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            📅 {format(new Date(task.dueDate), 'MM-dd')}
          </span>
        )}
        </div>

        <div className="flex items-center gap-2 text-gray-500">
          {task._count?.comments && task._count.comments > 0 && (
            <span>💬 {task._count.comments}</span>
          )}
          {task._count?.attachments && task._count.attachments > 0 && (
            <span>📎 {task._count.attachments}</span>
          )}
          {task._count?.subtasks && task._count.subtasks > 0 && (
            <span>
              ✅ {task.subtasks.filter((s) => s.completed).length}/{task._count.subtasks}
            </span>
          )}
        </div>
      </div>

      {task.assignee && (
        <div className="mt-2 flex items-center">
          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
            {task.assignee.username?.charAt(0).toUpperCase()}
          </div>
          <span className="ml-2 text-xs text-gray-600">{task.assignee.username}</span>
        </div>
      )}
    </div>
  );
}

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type NotificationType = 'MENTION' | 'ASSIGNMENT' | 'COMMENT' | 'DUE_REMINDER';

export interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string | null;
  teamId?: string | null;
  team?: { id: string; name: string } | null;
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  teamId: string;
  createdBy: string;
  createdAt: string;
  taskLists: TaskList[];
  _count?: { taskLists: number };
}

export interface TaskList {
  id: string;
  name: string;
  order: number;
  projectId: string;
  createdAt: string;
  tasks: Task[];
}

export interface TaskTag {
  id: string;
  name: string;
  color: string;
  taskId: string;
}

export interface Attachment {
  id: string;
  filename: string;
  path: string;
  mimetype: string;
  size: number;
  taskId: string;
  uploadedBy: string;
  uploadedByUser: { id: string; username: string };
  createdAt: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  taskId: string;
  order: number;
  createdAt: string;
}

export interface Comment {
  id: string;
  content: string;
  taskId: string;
  authorId: string;
  author: { id: string; username: string; avatar?: string | null };
  mentions?: string | null;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  taskId: string;
  userId: string;
  user: { id: string; username: string; avatar?: string | null };
  field: string;
  oldValue?: string | null;
  newValue?: string | null;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  order: number;
  taskListId: string;
  taskList?: TaskList;
  projectId: string;
  project?: Project;
  assigneeId?: string | null;
  assignee?: { id: string; username: string; avatar?: string | null; email?: string } | null;
  createdBy: string;
  creator?: { id: string; username: string; avatar?: string | null };
  createdAt: string;
  updatedAt: string;
  tags: TaskTag[];
  attachments: Attachment[];
  subtasks: Subtask[];
  comments: Comment[];
  activityLogs: ActivityLog[];
  _count?: { comments: number; attachments: number; subtasks: number };
}

export interface Notification {
  id: string;
  type: NotificationType;
  content: string;
  userId: string;
  taskId?: string | null;
  task?: { id: string; title: string } | null;
  read: boolean;
  createdAt: string;
}

export interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  overdueTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  reviewTasks: number;
}

export interface WorkloadItem {
  userId: string;
  username: string;
  avatar?: string | null;
  taskCount: number;
  highPriority: number;
  overdue: number;
  tasks: Task[];
}

export interface CompletionRate {
  userId: string;
  username: string;
  avatar?: string | null;
  totalTasks: number;
  completedTasks: number;
  rate: number;
}

export interface GanttData {
  project: {
    id: string;
    name: string;
    startDate?: string | null;
    endDate?: string | null;
  };
  tasks: {
    id: string;
    title: string;
    startDate: string;
    endDate?: string | null;
    progress: number;
    status: TaskStatus;
    priority: TaskPriority;
    assignee?: { id: string; username: string; avatar?: string | null } | null;
    taskList: { id: string; name: string };
    subtasks: Subtask[];
  }[];
}

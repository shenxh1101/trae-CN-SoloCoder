export interface TaskList {
  id: string;
  title: string;
  color: string;
  createdAt: number;
  updatedAt: number;
}

export type Priority = 'high' | 'medium' | 'low';

export type RepeatRule = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';

export interface RepeatConfig {
  rule: RepeatRule;
  weekdays?: number[];
  interval?: number;
}

export interface SubTask {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  order: number;
}

export interface Task {
  id: string;
  listId: string;
  title: string;
  description: string;
  dueDate: number | null;
  priority: Priority;
  completed: boolean;
  completedAt: number | null;
  order: number;
  repeatConfig: RepeatConfig;
  createdAt: number;
  updatedAt: number;
  location?: LocationReminder;
}

export interface LocationReminder {
  latitude: number;
  longitude: number;
  radius: number;
  address: string;
  triggered: boolean;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: number;
}

export interface TaskTag {
  taskId: string;
  tagId: string;
}

export interface FocusSession {
  id: string;
  taskId: string;
  startTime: number;
  endTime: number;
  duration: number;
  completed: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface BackupData {
  lists: TaskList[];
  tasks: Task[];
  subTasks: SubTask[];
  tags: Tag[];
  taskTags: TaskTag[];
  focusSessions: FocusSession[];
  version: string;
  timestamp: number;
}

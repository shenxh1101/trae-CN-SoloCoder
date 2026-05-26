import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  listRepository,
  taskRepository,
  subTaskRepository,
  tagRepository,
  taskTagRepository,
  focusSessionRepository,
  initializeDatabase,
} from '../database/database';
import { TaskList, Task, SubTask, Tag, FocusSession, BackupData } from '../types/models';
import { generateId } from '../utils/helpers';
import { WidgetService } from '../services/WidgetService';

interface DataContextType {
  lists: TaskList[];
  tasks: Task[];
  subTasks: Record<string, SubTask[]>;
  tags: Tag[];
  taskTags: Record<string, string[]>;
  isLoading: boolean;
  refreshLists: () => void;
  refreshTasks: () => void;
  refreshTags: () => void;
  addList: (title: string, color: string) => TaskList;
  updateList: (list: TaskList) => void;
  deleteList: (id: string) => void;
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Task;
  updateTask: (task: Task) => void;
  deleteTask: (id: string) => void;
  addSubTask: (subTask: Omit<SubTask, 'id'>) => SubTask;
  updateSubTask: (subTask: SubTask) => void;
  deleteSubTask: (id: string) => void;
  addTag: (name: string, color: string) => Tag;
  updateTag: (tag: Tag) => void;
  deleteTag: (id: string) => void;
  addTagToTask: (taskId: string, tagId: string) => void;
  removeTagFromTask: (taskId: string, tagId: string) => void;
  getTagsForTask: (taskId: string) => Tag[];
  addFocusSession: (session: Omit<FocusSession, 'id'>) => FocusSession;
  updateFocusSession: (session: FocusSession) => void;
  getFocusSessionsByDateRange: (start: number, end: number) => FocusSession[];
  getFocusDailyStats: (start: number, end: number) => { date: string; totalDuration: number }[];
  updateOrder: (taskId: string, order: number) => void;
  exportData: () => BackupData;
  importData: (data: BackupData) => void;
}

const DataContext = createContext<DataContextType | null>(null);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lists, setLists] = useState<TaskList[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subTasks, setSubTasks] = useState<Record<string, SubTask[]>>({});
  const [tags, setTags] = useState<Tag[]>([]);
  const [taskTags, setTaskTags] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  const updateWidgetIfNeeded = useCallback(() => {
    WidgetService.updateWidgetData().catch(err => {
      console.error('Failed to update widget:', err);
    });
  }, []);

  useEffect(() => {
    const init = () => {
      initializeDatabase();
      refreshLists();
      refreshTasks();
      refreshTags();
      setIsLoading(false);
    };
    init();
  }, []);

  const refreshLists = useCallback(() => {
    const data = listRepository.getAll();
    setLists(data);
  }, []);

  const refreshTasks = useCallback(() => {
    const data = taskRepository.getAll();
    setTasks(data);
  }, []);

  const refreshTags = useCallback(() => {
    const data = tagRepository.getAll();
    setTags(data);
    const tagsMap: Record<string, string[]> = {};
    for (const tag of data) {
      const taskIds = taskTagRepository.getTaskIdsForTag(tag.id);
      for (const taskId of taskIds) {
        if (!tagsMap[taskId]) tagsMap[taskId] = [];
        tagsMap[taskId].push(tag.id);
      }
    }
    setTaskTags(tagsMap);
  }, []);

  const addList = useCallback((title: string, color: string) => {
    const now = Date.now();
    const list: TaskList = {
      id: generateId(),
      title,
      color,
      createdAt: now,
      updatedAt: now,
    };
    listRepository.insert(list);
    refreshLists();
    return list;
  }, [refreshLists]);

  const updateList = useCallback((list: TaskList) => {
    const updated: TaskList = { ...list, updatedAt: Date.now() };
    listRepository.update(updated);
    refreshLists();
  }, [refreshLists]);

  const deleteList = useCallback((id: string) => {
    listRepository.delete(id);
    refreshLists();
    refreshTasks();
  }, [refreshLists, refreshTasks]);

  const addTask = useCallback((taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = Date.now();
    const task: Task = {
      ...taskData,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    taskRepository.insert(task);
    refreshTasks();
    updateWidgetIfNeeded();
    return task;
  }, [refreshTasks, updateWidgetIfNeeded]);

  const updateTask = useCallback((task: Task) => {
    const updated: Task = { ...task, updatedAt: Date.now() };
    taskRepository.update(updated);
    refreshTasks();
    updateWidgetIfNeeded();
  }, [refreshTasks, updateWidgetIfNeeded]);

  const updateOrder = useCallback((taskId: string, order: number) => {
    taskRepository.updateOrder(taskId, order);
    refreshTasks();
  }, [refreshTasks]);

  const deleteTask = useCallback((id: string) => {
    subTaskRepository.deleteByTaskId(id);
    taskRepository.delete(id);
    refreshTasks();
    updateWidgetIfNeeded();
  }, [refreshTasks, updateWidgetIfNeeded]);

  const addSubTask = useCallback((subTaskData: Omit<SubTask, 'id'>) => {
    const subTask: SubTask = { ...subTaskData, id: generateId() };
    subTaskRepository.insert(subTask);
    return subTask;
  }, []);

  const updateSubTask = useCallback((subTask: SubTask) => {
    subTaskRepository.update(subTask);
    updateWidgetIfNeeded();
  }, [updateWidgetIfNeeded]);

  const deleteSubTask = useCallback((id: string) => {
    subTaskRepository.delete(id);
    updateWidgetIfNeeded();
  }, [updateWidgetIfNeeded]);

  const addTag = useCallback((name: string, color: string) => {
    const tag: Tag = {
      id: generateId(),
      name,
      color,
      createdAt: Date.now(),
    };
    tagRepository.insert(tag);
    refreshTags();
    return tag;
  }, [refreshTags]);

  const updateTag = useCallback((tag: Tag) => {
    tagRepository.update(tag);
    refreshTags();
  }, [refreshTags]);

  const deleteTag = useCallback((id: string) => {
    tagRepository.delete(id);
    refreshTags();
  }, [refreshTags]);

  const addTagToTask = useCallback((taskId: string, tagId: string) => {
    taskTagRepository.insert({ taskId, tagId });
    refreshTags();
  }, [refreshTags]);

  const removeTagFromTask = useCallback((taskId: string, tagId: string) => {
    taskTagRepository.delete(taskId, tagId);
    refreshTags();
  }, [refreshTags]);

  const getTagsForTask = useCallback((taskId: string): Tag[] => {
    const tagIds = taskTagRepository.getTagIdsForTask(taskId);
    const allTags = tagRepository.getAll();
    return allTags.filter(tag => tagIds.includes(tag.id));
  }, []);

  const addFocusSession = useCallback((sessionData: Omit<FocusSession, 'id'>) => {
    const session: FocusSession = { ...sessionData, id: generateId() };
    focusSessionRepository.insert(session);
    return session;
  }, []);

  const updateFocusSession = useCallback((session: FocusSession) => {
    focusSessionRepository.update(session);
  }, []);

  const getFocusSessionsByDateRange = useCallback((start: number, end: number): FocusSession[] => {
    return focusSessionRepository.getByDateRange(start, end);
  }, []);

  const getFocusDailyStats = useCallback((start: number, end: number) => {
    const sessions = focusSessionRepository.getByDateRange(start, end);
    const dailyMap: Record<string, number> = {};
    
    for (const session of sessions) {
      if (session.completed) {
        const date = new Date(session.startTime);
        const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        dailyMap[dateKey] = (dailyMap[dateKey] || 0) + Math.floor(session.duration / 60);
      }
    }
    
    const result: { date: string; totalDuration: number }[] = [];
    const currentDate = new Date(start);
    const endDate = new Date(end);
    
    while (currentDate <= endDate) {
      const dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
      result.push({
        date: dateKey,
        totalDuration: dailyMap[dateKey] || 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return result;
  }, []);

  const exportData = useCallback((): BackupData => {
    const allLists = listRepository.getAll();
    const allTasks = taskRepository.getAll();
    const allTags = tagRepository.getAll();

    const allSubTasks: SubTask[] = [];
    for (const task of allTasks) {
      const st = subTaskRepository.getByTaskId(task.id);
      allSubTasks.push(...st);
    }

    const taskTagPairs: { taskId: string; tagId: string }[] = [];
    for (const tag of allTags) {
      const taskIds = taskTagRepository.getTaskIdsForTag(tag.id);
      for (const taskId of taskIds) {
        taskTagPairs.push({ taskId, tagId: tag.id });
      }
    }

    const allFocusSessions = focusSessionRepository.getAll();

    return {
      lists: allLists,
      tasks: allTasks,
      subTasks: allSubTasks,
      tags: allTags,
      taskTags: taskTagPairs.map(tt => ({ taskId: tt.taskId, tagId: tt.tagId })),
      focusSessions: allFocusSessions,
      version: '1.0.0',
      timestamp: Date.now(),
    };
  }, []);

  const importData = useCallback((data: BackupData): void => {
    for (const list of data.lists) {
      listRepository.insert(list);
    }
    for (const task of data.tasks) {
      taskRepository.insert(task);
    }
    for (const subTask of data.subTasks) {
      subTaskRepository.insert(subTask);
    }
    for (const tag of data.tags) {
      tagRepository.insert(tag);
    }
    for (const tt of data.taskTags) {
      taskTagRepository.insert({ taskId: tt.taskId, tagId: tt.tagId });
    }
    for (const session of data.focusSessions) {
      focusSessionRepository.insert(session);
    }
    refreshLists();
    refreshTasks();
    refreshTags();
  }, [refreshLists, refreshTasks, refreshTags]);

  return (
    <DataContext.Provider
      value={{
        lists,
        tasks,
        subTasks,
        tags,
        taskTags,
        isLoading,
        refreshLists,
        refreshTasks,
        refreshTags,
        addList,
        updateList,
        deleteList,
        addTask,
        updateTask,
        deleteTask,
        addSubTask,
        updateSubTask,
        deleteSubTask,
        addTag,
        updateTag,
        deleteTag,
        addTagToTask,
        removeTagFromTask,
        getTagsForTask,
        addFocusSession,
        updateFocusSession,
        getFocusSessionsByDateRange,
        getFocusDailyStats,
        updateOrder,
        exportData,
        importData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};

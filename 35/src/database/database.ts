import {
  openDatabaseSync,
  SQLiteDatabase,
  SQLiteRunResult,
  SQLiteBindParams,
} from 'expo-sqlite/next';
import {
  TaskList,
  Task,
  SubTask,
  Tag,
  TaskTag,
  FocusSession,
  User,
  RepeatConfig,
  LocationReminder,
} from '../types/models';

const DB_NAME = 'todo_app.db';

let db: SQLiteDatabase | null = null;

export const getDatabase = (): SQLiteDatabase => {
  if (db) return db;
  db = openDatabaseSync(DB_NAME, { enableChangeListener: true });
  return db;
};

const mapRepeatConfig = (row: any): RepeatConfig => {
  return {
    rule: row.repeatRule || 'none',
    weekdays: row.repeatWeekdays ? JSON.parse(row.repeatWeekdays) : undefined,
    interval: row.repeatInterval || undefined,
  };
};

const mapLocation = (row: any): LocationReminder | undefined => {
  if (row.locationLat === null || row.locationLat === undefined) return undefined;
  return {
    latitude: row.locationLat,
    longitude: row.locationLng,
    radius: row.locationRadius,
    address: row.locationAddress,
    triggered: !!row.locationTriggered,
  };
};

const mapTaskRow = (row: any): Task => {
  return {
    id: row.id,
    listId: row.listId,
    title: row.title,
    description: row.description || '',
    dueDate: row.dueDate,
    priority: row.priority as any,
    completed: !!row.completed,
    completedAt: row.completedAt,
    order: row.orderNum,
    repeatConfig: mapRepeatConfig(row),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    location: mapLocation(row),
  };
};

const mapSubTaskRow = (row: any): SubTask => ({
  id: row.id,
  taskId: row.taskId,
  title: row.title,
  completed: !!row.completed,
  order: row.orderNum,
});

const mapTagRow = (row: any): Tag => ({
  id: row.id,
  name: row.name,
  color: row.color,
  createdAt: row.createdAt,
});

const mapFocusSessionRow = (row: any): FocusSession => ({
  id: row.id,
  taskId: row.taskId,
  startTime: row.startTime,
  endTime: row.endTime,
  duration: row.duration,
  completed: !!row.completed,
});

export const initializeDatabase = (): void => {
  const database = getDatabase();

  const CREATE_TABLES_SQL = `
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS task_lists (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      color TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      listId TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      dueDate INTEGER,
      priority TEXT NOT NULL DEFAULT 'medium',
      completed INTEGER NOT NULL DEFAULT 0,
      completedAt INTEGER,
      orderNum INTEGER NOT NULL DEFAULT 0,
      repeatRule TEXT NOT NULL DEFAULT 'none',
      repeatWeekdays TEXT,
      repeatInterval INTEGER,
      locationLat REAL,
      locationLng REAL,
      locationRadius REAL,
      locationAddress TEXT,
      locationTriggered INTEGER DEFAULT 0,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      FOREIGN KEY (listId) REFERENCES task_lists(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sub_tasks (
      id TEXT PRIMARY KEY,
      taskId TEXT NOT NULL,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      orderNum INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      createdAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS task_tags (
      taskId TEXT NOT NULL,
      tagId TEXT NOT NULL,
      PRIMARY KEY (taskId, tagId),
      FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (tagId) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS focus_sessions (
      id TEXT PRIMARY KEY,
      taskId TEXT NOT NULL,
      startTime INTEGER NOT NULL,
      endTime INTEGER NOT NULL,
      duration INTEGER NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_listId ON tasks(listId);
    CREATE INDEX IF NOT EXISTS idx_tasks_dueDate ON tasks(dueDate);
    CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
    CREATE INDEX IF NOT EXISTS idx_focus_sessions_taskId ON focus_sessions(taskId);
    CREATE INDEX IF NOT EXISTS idx_focus_sessions_startTime ON focus_sessions(startTime);
  `;

  database.execSync(CREATE_TABLES_SQL);
  console.log('[Database] Initialized successfully');
};

export const listRepository = {
  getAll: (): TaskList[] => {
    const database = getDatabase();
    return database.getAllSync<TaskList>('SELECT * FROM task_lists ORDER BY createdAt DESC');
  },
  getById: (id: string): TaskList | undefined => {
    const database = getDatabase();
    const result = database.getFirstSync<TaskList>('SELECT * FROM task_lists WHERE id = ?', [id]);
    return result || undefined;
  },
  insert: (list: Omit<TaskList, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): TaskList => {
    const database = getDatabase();
    const now = Date.now();
    const newList: TaskList = {
      id: list.id || require('../utils/helpers').generateId(),
      title: list.title,
      color: list.color,
      createdAt: now,
      updatedAt: now,
    };
    database.runSync(
      'INSERT INTO task_lists (id, title, color, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
      [newList.id, newList.title, newList.color, newList.createdAt, newList.updatedAt]
    );
    console.log('[Database] Inserted list:', newList.id);
    return newList;
  },
  update: (list: TaskList): void => {
    const database = getDatabase();
    database.runSync(
      'UPDATE task_lists SET title = ?, color = ?, updatedAt = ? WHERE id = ?',
      [list.title, list.color, Date.now(), list.id]
    );
    console.log('[Database] Updated list:', list.id);
  },
  delete: (id: string): void => {
    const database = getDatabase();
    database.runSync('DELETE FROM task_lists WHERE id = ?', [id]);
    console.log('[Database] Deleted list:', id);
  },
};

export const taskRepository = {
  getAll: (): Task[] => {
    const database = getDatabase();
    const rows = database.getAllSync<any>('SELECT * FROM tasks ORDER BY orderNum ASC, createdAt DESC');
    return rows.map(mapTaskRow);
  },
  getByListId: (listId: string): Task[] => {
    const database = getDatabase();
    const rows = database.getAllSync<any>(
      'SELECT * FROM tasks WHERE listId = ? ORDER BY orderNum ASC, createdAt DESC',
      [listId]
    );
    return rows.map(mapTaskRow);
  },
  getById: (id: string): Task | undefined => {
    const database = getDatabase();
    const row = database.getFirstSync<any>('SELECT * FROM tasks WHERE id = ?', [id]);
    return row ? mapTaskRow(row) : undefined;
  },
  getByDueDate: (start: number, end: number): Task[] => {
    const database = getDatabase();
    const rows = database.getAllSync<any>(
      'SELECT * FROM tasks WHERE dueDate >= ? AND dueDate < ? ORDER BY dueDate ASC',
      [start, end]
    );
    return rows.map(mapTaskRow);
  },
  getByDateRange: (start: number, end: number): Task[] => {
    const database = getDatabase();
    const rows = database.getAllSync<any>(
      'SELECT * FROM tasks WHERE createdAt >= ? AND createdAt < ? ORDER BY createdAt DESC',
      [start, end]
    );
    return rows.map(mapTaskRow);
  },
  insert: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Task => {
    const database = getDatabase();
    const now = Date.now();
    const newTask: Task = {
      id: task.id || require('../utils/helpers').generateId(),
      listId: task.listId,
      title: task.title,
      description: task.description || '',
      dueDate: task.dueDate || null,
      priority: task.priority,
      completed: task.completed || false,
      completedAt: task.completedAt || null,
      order: task.order || 0,
      repeatConfig: task.repeatConfig || { rule: 'none' },
      createdAt: now,
      updatedAt: now,
      location: task.location,
    };

    database.runSync(
      `INSERT INTO tasks (
        id, listId, title, description, dueDate, priority, completed, completedAt,
        orderNum, repeatRule, repeatWeekdays, repeatInterval,
        locationLat, locationLng, locationRadius, locationAddress, locationTriggered,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newTask.id,
        newTask.listId,
        newTask.title,
        newTask.description,
        newTask.dueDate,
        newTask.priority,
        newTask.completed ? 1 : 0,
        newTask.completedAt,
        newTask.order,
        newTask.repeatConfig.rule,
        newTask.repeatConfig.weekdays ? JSON.stringify(newTask.repeatConfig.weekdays) : null,
        newTask.repeatConfig.interval || null,
        newTask.location?.latitude || null,
        newTask.location?.longitude || null,
        newTask.location?.radius || null,
        newTask.location?.address || null,
        newTask.location?.triggered ? 1 : 0,
        newTask.createdAt,
        newTask.updatedAt,
      ]
    );

    console.log('[Database] Inserted task:', newTask.id, newTask.title);
    return newTask;
  },
  update: (task: Task): void => {
    const database = getDatabase();
    database.runSync(
      `UPDATE tasks SET
        listId = ?, title = ?, description = ?, dueDate = ?, priority = ?,
        completed = ?, completedAt = ?, orderNum = ?, repeatRule = ?, repeatWeekdays = ?,
        repeatInterval = ?, locationLat = ?, locationLng = ?, locationRadius = ?,
        locationAddress = ?, locationTriggered = ?, updatedAt = ?
      WHERE id = ?`,
      [
        task.listId,
        task.title,
        task.description,
        task.dueDate,
        task.priority,
        task.completed ? 1 : 0,
        task.completedAt,
        task.order,
        task.repeatConfig.rule,
        task.repeatConfig.weekdays ? JSON.stringify(task.repeatConfig.weekdays) : null,
        task.repeatConfig.interval || null,
        task.location?.latitude || null,
        task.location?.longitude || null,
        task.location?.radius || null,
        task.location?.address || null,
        task.location?.triggered ? 1 : 0,
        Date.now(),
        task.id,
      ]
    );
    console.log('[Database] Updated task:', task.id);
  },
  updateOrder: (taskId: string, order: number): void => {
    const database = getDatabase();
    database.runSync('UPDATE tasks SET orderNum = ?, updatedAt = ? WHERE id = ?', [order, Date.now(), taskId]);
    console.log('[Database] Updated task order:', taskId, order);
  },
  delete: (id: string): void => {
    const database = getDatabase();
    database.runSync('DELETE FROM tasks WHERE id = ?', [id]);
    console.log('[Database] Deleted task:', id);
  },
};

export const subTaskRepository = {
  getByTaskId: (taskId: string): SubTask[] => {
    const database = getDatabase();
    const rows = database.getAllSync<any>(
      'SELECT * FROM sub_tasks WHERE taskId = ? ORDER BY orderNum ASC',
      [taskId]
    );
    return rows.map(mapSubTaskRow);
  },
  insert: (subTask: Omit<SubTask, 'id'> & { id?: string }): SubTask => {
    const database = getDatabase();
    const newSubTask: SubTask = {
      id: subTask.id || require('../utils/helpers').generateId(),
      taskId: subTask.taskId,
      title: subTask.title,
      completed: subTask.completed || false,
      order: subTask.order,
    };
    database.runSync(
      'INSERT INTO sub_tasks (id, taskId, title, completed, orderNum) VALUES (?, ?, ?, ?, ?)',
      [newSubTask.id, newSubTask.taskId, newSubTask.title, newSubTask.completed ? 1 : 0, newSubTask.order]
    );
    console.log('[Database] Inserted subtask:', newSubTask.id);
    return newSubTask;
  },
  update: (subTask: SubTask): void => {
    const database = getDatabase();
    database.runSync(
      'UPDATE sub_tasks SET title = ?, completed = ?, orderNum = ? WHERE id = ?',
      [subTask.title, subTask.completed ? 1 : 0, subTask.order, subTask.id]
    );
    console.log('[Database] Updated subtask:', subTask.id);
  },
  delete: (id: string): void => {
    const database = getDatabase();
    database.runSync('DELETE FROM sub_tasks WHERE id = ?', [id]);
    console.log('[Database] Deleted subtask:', id);
  },
  deleteByTaskId: (taskId: string): void => {
    const database = getDatabase();
    database.runSync('DELETE FROM sub_tasks WHERE taskId = ?', [taskId]);
    console.log('[Database] Deleted subtasks by taskId:', taskId);
  },
};

export const tagRepository = {
  getAll: (): Tag[] => {
    const database = getDatabase();
    const rows = database.getAllSync<any>('SELECT * FROM tags ORDER BY createdAt DESC');
    return rows.map(mapTagRow);
  },
  insert: (tag: Omit<Tag, 'id' | 'createdAt'> & { id?: string }): Tag => {
    const database = getDatabase();
    const now = Date.now();
    const newTag: Tag = {
      id: tag.id || require('../utils/helpers').generateId(),
      name: tag.name,
      color: tag.color,
      createdAt: now,
    };
    database.runSync(
      'INSERT INTO tags (id, name, color, createdAt) VALUES (?, ?, ?, ?)',
      [newTag.id, newTag.name, newTag.color, newTag.createdAt]
    );
    console.log('[Database] Inserted tag:', newTag.id, newTag.name);
    return newTag;
  },
  update: (tag: Tag): void => {
    const database = getDatabase();
    database.runSync('UPDATE tags SET name = ?, color = ? WHERE id = ?', [tag.name, tag.color, tag.id]);
    console.log('[Database] Updated tag:', tag.id);
  },
  delete: (id: string): void => {
    const database = getDatabase();
    database.runSync('DELETE FROM tags WHERE id = ?', [id]);
    console.log('[Database] Deleted tag:', id);
  },
};

export const taskTagRepository = {
  getTagIdsForTask: (taskId: string): string[] => {
    const database = getDatabase();
    const rows = database.getAllSync<any>('SELECT tagId FROM task_tags WHERE taskId = ?', [taskId]);
    return rows.map((row: any) => row.tagId);
  },
  getTaskIdsForTag: (tagId: string): string[] => {
    const database = getDatabase();
    const rows = database.getAllSync<any>('SELECT taskId FROM task_tags WHERE tagId = ?', [tagId]);
    return rows.map((row: any) => row.taskId);
  },
  insert: (taskTag: TaskTag): void => {
    const database = getDatabase();
    database.runSync('INSERT OR IGNORE INTO task_tags (taskId, tagId) VALUES (?, ?)', [taskTag.taskId, taskTag.tagId]);
    console.log('[Database] Inserted task-tag:', taskTag.taskId, taskTag.tagId);
  },
  delete: (taskId: string, tagId: string): void => {
    const database = getDatabase();
    database.runSync('DELETE FROM task_tags WHERE taskId = ? AND tagId = ?', [taskId, tagId]);
    console.log('[Database] Deleted task-tag:', taskId, tagId);
  },
  deleteByTaskId: (taskId: string): void => {
    const database = getDatabase();
    database.runSync('DELETE FROM task_tags WHERE taskId = ?', [taskId]);
    console.log('[Database] Deleted task-tags by taskId:', taskId);
  },
};

export const focusSessionRepository = {
  getAll: (): FocusSession[] => {
    const database = getDatabase();
    const rows = database.getAllSync<any>('SELECT * FROM focus_sessions ORDER BY startTime DESC');
    return rows.map(mapFocusSessionRow);
  },
  getByTaskId: (taskId: string): FocusSession[] => {
    const database = getDatabase();
    const rows = database.getAllSync<any>(
      'SELECT * FROM focus_sessions WHERE taskId = ? ORDER BY startTime DESC',
      [taskId]
    );
    return rows.map(mapFocusSessionRow);
  },
  getByDateRange: (start: number, end: number): FocusSession[] => {
    const database = getDatabase();
    const rows = database.getAllSync<any>(
      'SELECT * FROM focus_sessions WHERE startTime >= ? AND startTime < ? ORDER BY startTime DESC',
      [start, end]
    );
    return rows.map(mapFocusSessionRow);
  },
  insert: (session: Omit<FocusSession, 'id'> & { id?: string }): FocusSession => {
    const database = getDatabase();
    const newSession: FocusSession = {
      id: session.id || require('../utils/helpers').generateId(),
      taskId: session.taskId,
      startTime: session.startTime,
      endTime: session.endTime,
      duration: session.duration,
      completed: session.completed || false,
    };
    database.runSync(
      'INSERT INTO focus_sessions (id, taskId, startTime, endTime, duration, completed) VALUES (?, ?, ?, ?, ?, ?)',
      [
        newSession.id,
        newSession.taskId,
        newSession.startTime,
        newSession.endTime,
        newSession.duration,
        newSession.completed ? 1 : 0,
      ]
    );
    console.log('[Database] Inserted focus session:', newSession.id);
    return newSession;
  },
  update: (session: FocusSession): void => {
    const database = getDatabase();
    database.runSync(
      'UPDATE focus_sessions SET taskId = ?, startTime = ?, endTime = ?, duration = ?, completed = ? WHERE id = ?',
      [session.taskId, session.startTime, session.endTime, session.duration, session.completed ? 1 : 0, session.id]
    );
    console.log('[Database] Updated focus session:', session.id);
  },
  delete: (id: string): void => {
    const database = getDatabase();
    database.runSync('DELETE FROM focus_sessions WHERE id = ?', [id]);
    console.log('[Database] Deleted focus session:', id);
  },
};

export const transactionSync = (fn: () => void): void => {
  const database = getDatabase();
  database.withTransactionSync(fn);
};

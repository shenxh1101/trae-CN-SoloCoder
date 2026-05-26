import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Vibration,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  Chip,
  TextInput,
  useTheme,
  Dialog,
  Portal,
  Menu,
} from 'react-native-paper';
import { useData } from '../context/DataContext';
import { useAppTheme } from '../context/ThemeContext';
import { Task, FocusSession } from '../types/models';
import { formatDuration, getPriorityColor, getPriorityText } from '../utils/helpers';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';

interface Props {
  route?: any;
  navigation: any;
}

const FocusScreen: React.FC<Props> = ({ route, navigation }) => {
  const { tasks, addFocusSession, updateFocusSession, updateTask } = useData();
  const { theme } = useAppTheme();
  const paperTheme = useTheme();

  const taskId = route?.params?.taskId;
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [duration, setDuration] = useState(25);
  const [remainingTime, setRemainingTime] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionStart, setSessionStart] = useState<number | null>(null);
  const [currentSession, setCurrentSession] = useState<FocusSession | null>(null);
  const [showTaskPicker, setShowTaskPicker] = useState(taskId ? false : true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [completedDialogVisible, setCompletedDialogVisible] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pauseStartRef = useRef<number | null>(null);
  const totalPausedRef = useRef(0);

  const activeTasks = tasks.filter(t => !t.completed && t.listId);

  useEffect(() => {
    if (taskId) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        setSelectedTask(task);
        setShowTaskPicker(false);
      }
    }
  }, [taskId, tasks]);

  useEffect(() => {
    if (isRunning && !isPaused) {
      startTimeRef.current = startTimeRef.current || Date.now();

      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - (startTimeRef.current || 0) - totalPausedRef.current) / 1000);
        const remaining = duration * 60 - elapsed;

        if (remaining <= 0) {
          handleComplete();
        } else {
          setRemainingTime(remaining);
        }
      }, 1000);
    } else if (isPaused) {
      if (!pauseStartRef.current) {
        pauseStartRef.current = Date.now();
      }
    } else if (!isRunning && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isPaused]);

  useEffect(() => {
    if (isPaused && pauseStartRef.current) {
      totalPausedRef.current += Date.now() - pauseStartRef.current;
      pauseStartRef.current = null;
    }
  }, [isPaused]);

  const handleStart = () => {
    if (!selectedTask) {
      setShowTaskPicker(true);
      return;
    }

    const session: Omit<FocusSession, 'id'> = {
      taskId: selectedTask.id,
      startTime: Date.now(),
      endTime: Date.now() + duration * 60 * 1000,
      duration: 0,
      completed: false,
    };

    const created = addFocusSession(session);
    setCurrentSession(created);
    setSessionStart(Date.now());
    setIsRunning(true);
    setIsPaused(false);
    startTimeRef.current = Date.now();
    totalPausedRef.current = 0;
    pauseStartRef.current = null;
  };

  const handlePause = () => {
    setIsPaused(true);
    pauseStartRef.current = Date.now();
  };

  const handleResume = () => {
    setIsPaused(false);
    if (pauseStartRef.current) {
      totalPausedRef.current += Date.now() - pauseStartRef.current;
      pauseStartRef.current = null;
    }
  };

  const handleComplete = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const actualDuration = Math.floor((Date.now() - (startTimeRef.current || 0) - totalPausedRef.current) / 1000);

    if (currentSession) {
      const updated: FocusSession = {
        ...currentSession,
        endTime: Date.now(),
        duration: actualDuration,
        completed: true,
      };
      updateFocusSession(updated);
    }

    if (selectedTask) {
      updateTask({
        ...selectedTask,
        completed: true,
        completedAt: Date.now(),
      });
    }

    setIsRunning(false);
    setIsPaused(false);
    setCompletedDialogVisible(true);

    try {
      Vibration.vibrate([0, 500, 200, 500]);
    } catch {}
  };

  const handleCancel = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (currentSession) {
      const actualDuration = Math.floor((Date.now() - (startTimeRef.current || 0) - totalPausedRef.current) / 1000);
      updateFocusSession({
        ...currentSession,
        endTime: Date.now(),
        duration: actualDuration,
        completed: false,
      });
    }

    setIsRunning(false);
    setIsPaused(false);
    setRemainingTime(duration * 60);
    setCurrentSession(null);
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsPaused(false);
    setRemainingTime(duration * 60);
    setCurrentSession(null);
    startTimeRef.current = null;
    totalPausedRef.current = 0;
    pauseStartRef.current = null;
  };

  const progress = duration > 0 ? (1 - remainingTime / (duration * 60)) : 0;
  const circleSize = 280;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {selectedTask && !isRunning && (
        <Card style={[styles.taskCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={[styles.taskTitle, { color: theme.colors.text }]}>
              {selectedTask.title}
            </Title>
            {selectedTask.dueDate && (
              <Paragraph style={[styles.dueDate, { color: paperTheme.colors.onSurfaceVariant }]}>
                截止: {new Date(selectedTask.dueDate).toLocaleString()}
              </Paragraph>
            )}
            <View style={styles.taskTags}>
              <Chip
                style={[
                  styles.priorityChip,
                  { backgroundColor: getPriorityColor(selectedTask.priority, false) + '20' },
                ]}
                textStyle={{ color: getPriorityColor(selectedTask.priority, false) }}
              >
                {getPriorityText(selectedTask.priority)}
              </Chip>
            </View>
          </Card.Content>
        </Card>
      )}

      <View style={styles.timerContainer}>
        <View style={[styles.timerCircle, {
          width: circleSize,
          height: circleSize,
          borderColor: theme.colors.primary,
        }]}>
          <View style={[styles.progressCircle, {
            width: circleSize - 20,
            height: circleSize - 20,
          }]}>
            <Title style={[styles.timerText, { color: theme.colors.text }]}>
              {formatDuration(remainingTime)}
            </Title>
          </View>
        </View>

        <View style={styles.controls}>
          {!isRunning ? (
            <>
              <Menu
                visible={menuVisible}
                onDismiss={() => setMenuVisible(false)}
                anchor={
                  <Button
                    mode="outlined"
                    style={styles.durationButton}
                    onPress={() => setMenuVisible(true)}
                  >
                    {duration}分钟
                  </Button>
                }
              >
                <Menu.Item onPress={() => { setDuration(15); setRemainingTime(15 * 60); setMenuVisible(false); }} title="15分钟" />
                <Menu.Item onPress={() => { setDuration(25); setRemainingTime(25 * 60); setMenuVisible(false); }} title="25分钟" />
                <Menu.Item onPress={() => { setDuration(45); setRemainingTime(45 * 60); setMenuVisible(false); }} title="45分钟" />
                <Menu.Item onPress={() => { setDuration(60); setRemainingTime(60 * 60); setMenuVisible(false); }} title="60分钟" />
              </Menu>
              <Button
                mode="contained"
                style={[styles.startButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleStart}
              >
                开始专注
              </Button>
              {!selectedTask && (
                <Button
                  mode="text"
                  onPress={() => setShowTaskPicker(true)}
                >
                  选择任务
                </Button>
              )}
            </>
          ) : (
            <View style={styles.runningControls}>
              {isPaused ? (
                <Button mode="contained" onPress={handleResume}>
                  继续
                </Button>
              ) : (
                <Button mode="outlined" onPress={handlePause}>
                  暂停
                </Button>
              )}
              <Button
                mode="contained"
                style={[styles.completeButton, { backgroundColor: paperTheme.colors.error }]}
                onPress={handleComplete}
              >
                完成
              </Button>
              <Button mode="text" onPress={handleCancel}>
                取消
              </Button>
            </View>
          )}
        </View>
      </View>

      <Portal>
        <Dialog
          visible={showTaskPicker}
          onDismiss={() => setShowTaskPicker(false)}
          style={{ backgroundColor: theme.colors.surface }}
        >
          <Dialog.Title style={{ color: theme.colors.text }}>选择任务</Dialog.Title>
          <Dialog.Content>
            {activeTasks.length === 0 ? (
              <Paragraph>暂无进行中的任务</Paragraph>
            ) : (
              activeTasks.slice(0, 10).map(task => (
                <TouchableOpacity
                  key={task.id}
                  style={[styles.taskOption, { borderColor: theme.colors.primary + '30' }]}
                  onPress={() => {
                    setSelectedTask(task);
                    setShowTaskPicker(false);
                  }}
                >
                  <Paragraph style={{ color: theme.colors.text }}>{task.title}</Paragraph>
                </TouchableOpacity>
              ))
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowTaskPicker(false)}>取消</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={completedDialogVisible}
          onDismiss={() => {
            setCompletedDialogVisible(false);
            handleReset();
          }}
          style={{ backgroundColor: theme.colors.surface }}
        >
          <Dialog.Title style={{ color: theme.colors.text }}>🎉 专注完成！</Dialog.Title>
          <Dialog.Content>
            <Paragraph style={{ color: theme.colors.text }}>
              恭喜你完成了 {duration} 分钟的专注！任务 "{selectedTask?.title}" 已标记为完成。
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => {
              setCompletedDialogVisible(false);
              handleReset();
            }}>确定</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  taskCard: {
    marginBottom: 24,
    borderRadius: 12,
    elevation: 2,
  },
  taskTitle: {
    fontSize: 18,
    marginBottom: 4,
  },
  dueDate: {
    fontSize: 14,
    marginBottom: 8,
  },
  taskTags: {
    flexDirection: 'row',
  },
  priorityChip: {
    alignSelf: 'flex-start',
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  timerCircle: {
    borderWidth: 4,
    borderRadius: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  progressCircle: {
    borderRadius: 130,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  controls: {
    alignItems: 'center',
  },
  durationButton: {
    marginBottom: 16,
  },
  startButton: {
    paddingHorizontal: 32,
    marginBottom: 16,
  },
  runningControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completeButton: {
    marginHorizontal: 16,
  },
  taskOption: {
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 8,
  },
});

export default FocusScreen;

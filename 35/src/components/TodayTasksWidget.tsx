import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';

interface TodayTasksWidgetProps {
  tasks: {
    id: string;
    title: string;
    completed: boolean;
    dueDate: number | null;
    priority: string;
  }[];
}

export const TodayTasksWidget: React.FC<TodayTasksWidgetProps> = ({ tasks }) => {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>今日待办</Text>
      {tasks.length === 0 ? (
        <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
          暂无任务
        </Text>
      ) : (
        tasks.slice(0, 5).map(task => (
          <View key={task.id} style={styles.taskRow}>
            <View
              style={[
                styles.checkbox,
                {
                  backgroundColor: task.completed ? theme.colors.primary : 'transparent',
                  borderColor: theme.colors.primary,
                },
              ]}
            />
            <Text
              style={[
                styles.taskTitle,
                { color: theme.colors.text },
                task.completed && styles.completed,
              ]}
              numberOfLines={1}
            >
              {task.title}
            </Text>
          </View>
        ))
      )}
      {tasks.length > 5 && (
        <Text style={[styles.more, { color: theme.colors.onSurfaceVariant }]}>
          还有 {tasks.length - 5} 个任务...
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    minHeight: 150,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  empty: {
    fontSize: 12,
    textAlign: 'center',
    paddingTop: 20,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 8,
  },
  taskTitle: {
    fontSize: 12,
    flex: 1,
  },
  completed: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  more: {
    fontSize: 10,
    marginTop: 8,
    textAlign: 'right',
  },
});

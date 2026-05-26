import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Title, Paragraph } from 'react-native-paper';
import { useAppTheme } from '../context/ThemeContext';
import { Task } from '../types/models';
import { formatRelativeDate, getPriorityColor, isOverdue } from '../utils/helpers';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Props {
  task: Task;
  onPress: () => void;
  onComplete: () => void;
}

export const TaskItem: React.FC<Props> = ({ task, onPress, onComplete }) => {
  const { theme } = useAppTheme();

  return (
    <Card
      style={[styles.card, { backgroundColor: theme.colors.surface }]}
      onPress={onPress}
    >
      <Card.Content style={styles.content}>
        <TouchableOpacity onPress={onComplete} style={styles.checkbox}>
          <MaterialCommunityIcons
            name={task.completed ? 'check-circle' : 'circle-outline'}
            size={24}
            color={task.completed ? theme.colors.primary : theme.colors.onSurfaceVariant}
          />
        </TouchableOpacity>
        <View style={styles.textContainer}>
          <Title
            style={[
              styles.title,
              { color: theme.colors.text },
              task.completed && styles.completed,
            ]}
            numberOfLines={2}
          >
            {task.title}
          </Title>
          {task.dueDate && (
            <View style={styles.dateRow}>
              <MaterialCommunityIcons
                name={isOverdue(task.dueDate) && !task.completed ? 'alert' : 'clock-outline'}
                size={14}
                color={isOverdue(task.dueDate) && !task.completed ? theme.colors.error : theme.colors.onSurfaceVariant}
              />
              <Paragraph
                style={[
                  styles.date,
                  {
                    color: isOverdue(task.dueDate) && !task.completed
                      ? theme.colors.error
                      : theme.colors.onSurfaceVariant,
                  },
                ]}
              >
                {formatRelativeDate(task.dueDate)}
              </Paragraph>
            </View>
          )}
        </View>
        <View
          style={[
            styles.priorityIndicator,
            { backgroundColor: getPriorityColor(task.priority, false) },
          ]}
        />
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 8,
    borderRadius: 12,
    elevation: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    padding: 4,
  },
  textContainer: {
    flex: 1,
    marginLeft: 8,
  },
  title: {
    fontSize: 16,
    marginBottom: 4,
  },
  completed: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  date: {
    fontSize: 12,
    marginLeft: 4,
  },
  priorityIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
});

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Title } from 'react-native-paper';
import { useAppTheme } from '../context/ThemeContext';
import { TaskList } from '../types/models';

interface Props {
  list: TaskList;
  taskCount: number;
  completedCount: number;
  onPress: () => void;
}

export const ListItem: React.FC<Props> = ({ list, taskCount, completedCount, onPress }) => {
  const { theme } = useAppTheme();
  const progress = taskCount > 0 ? (completedCount / taskCount) : 0;

  return (
    <Card
      style={[styles.card, { backgroundColor: theme.colors.surface }]}
      onPress={onPress}
    >
      <Card.Content style={styles.content}>
        <View style={[styles.colorBar, { backgroundColor: list.color }]} />
        <View style={styles.textContainer}>
          <Title style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
            {list.title}
          </Title>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: theme.colors.surfaceVariant }]}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: list.color, width: `${progress * 100}%` },
                ]}
              />
            </View>
            <Title style={[styles.count, { color: theme.colors.onSurfaceVariant }]}>
              {completedCount}/{taskCount}
            </Title>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorBar: {
    width: 6,
    height: 50,
    borderRadius: 3,
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    marginBottom: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    marginRight: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  count: {
    fontSize: 14,
  },
});

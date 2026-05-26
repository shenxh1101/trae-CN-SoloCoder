import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Title, Paragraph, Chip } from 'react-native-paper';
import { useAppTheme } from '../context/ThemeContext';
import { Tag } from '../types/models';

interface Props {
  tag: Tag;
  taskCount: number;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const TagItem: React.FC<Props> = ({ tag, taskCount, onPress, onEdit, onDelete }) => {
  const { theme } = useAppTheme();

  return (
    <Card
      style={[styles.card, { backgroundColor: theme.colors.surface }]}
      onPress={onPress}
    >
      <Card.Content style={styles.content}>
        <View style={[styles.colorDot, { backgroundColor: tag.color }]} />
        <View style={styles.textContainer}>
          <Title style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>
            {tag.name}
          </Title>
          <Paragraph style={{ color: theme.colors.onSurfaceVariant }}>
            {taskCount} 个任务
          </Paragraph>
        </View>
        <TouchableOpacity onPress={onEdit} style={styles.actionButton}>
          <Paragraph style={{ color: theme.colors.primary }}>编辑</Paragraph>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={styles.actionButton}>
          <Paragraph style={{ color: theme.colors.error }}>删除</Paragraph>
        </TouchableOpacity>
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
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    marginBottom: 2,
  },
  actionButton: {
    paddingHorizontal: 8,
  },
});

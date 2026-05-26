import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Title, Paragraph } from 'react-native-paper';
import { useAppTheme } from '../context/ThemeContext';
import { FocusSession } from '../types/models';
import { formatDurationInHours, formatDate } from '../utils/helpers';

interface Props {
  session: FocusSession;
  taskTitle: string;
}

export const FocusSessionItem: React.FC<Props> = ({ session, taskTitle }) => {
  const { theme } = useAppTheme();

  return (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <Title style={[styles.taskTitle, { color: theme.colors.text }]} numberOfLines={1}>
          {taskTitle}
        </Title>
        <View style={styles.infoRow}>
          <Paragraph style={{ color: theme.colors.onSurfaceVariant }}>
            {formatDate(session.startTime, 'yyyy-MM-dd HH:mm')}
          </Paragraph>
          <Paragraph style={[styles.duration, { color: theme.colors.primary }]}>
            {formatDurationInHours(Math.round(session.duration / 60))}
          </Paragraph>
        </View>
        {!session.completed && (
          <Paragraph style={[styles.incomplete, { color: theme.colors.error }]}>
            未完成
          </Paragraph>
        )}
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
  taskTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  duration: {
    fontWeight: 'bold',
  },
  incomplete: {
    fontSize: 12,
    marginTop: 4,
  },
});

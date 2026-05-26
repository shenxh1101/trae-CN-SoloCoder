import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  useTheme,
} from 'react-native-paper';
import { useData } from '../context/DataContext';
import { useAppTheme } from '../context/ThemeContext';
import { getStartOfWeek, getEndOfWeek, formatDurationInHours } from '../utils/helpers';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BarChart } from 'react-native-chart-kit';

interface DailyStat {
  label: string;
  value: number;
}

interface Props {
  navigation: any;
}

const StatsScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useAppTheme();
  const paperTheme = useTheme();
  const { tasks, getFocusDailyStats } = useData();

  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [totalFocusTime, setTotalFocusTime] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);

  const loadStats = () => {
    const startOfWeek = getStartOfWeek().getTime();
    const endOfWeek = getEndOfWeek().getTime();

    const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const stats: DailyStat[] = days.map(day => ({ label: day, value: 0 }));

    const dailyData = getFocusDailyStats(startOfWeek, endOfWeek);

    dailyData.forEach((item: { date: string; totalDuration: number }) => {
      const date = new Date(item.date + 'T00:00:00');
      const dayOfWeek = (date.getDay() + 6) % 7;
      stats[dayOfWeek].value = item.totalDuration;
    });

    setDailyStats(stats);

    const totalMinutes = dailyData.reduce((sum: number, item: { totalDuration: number }) => sum + item.totalDuration, 0);
    setTotalFocusTime(totalMinutes);

    let completed = 0;
    let overdue = 0;
    const now = Date.now();
    for (const task of tasks) {
      if (task.completed && task.completedAt && task.completedAt >= startOfWeek && task.completedAt < endOfWeek) {
        completed++;
      }
      if (!task.completed && task.dueDate && task.dueDate < now) {
        overdue++;
      }
    }
    setCompletedCount(completed);
    setOverdueCount(overdue);
  };

  useEffect(() => {
    loadStats();
  }, []);

  const chartConfig = {
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `${theme.colors.primary}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
    labelColor: (opacity = 1) => `${theme.colors.text}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: theme.colors.primary,
    },
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={[styles.cardTitle, { color: theme.colors.text }]}>本周专注统计</Title>
            {dailyStats.some(s => s.value > 0) ? (
              <BarChart
                data={{
                  labels: dailyStats.map(s => s.label),
                  datasets: [{ data: dailyStats.map(s => s.value) }],
                }}
                width={Dimensions.get('window').width - 64}
                height={220}
                chartConfig={chartConfig}
                verticalLabelRotation={0}
                showValuesOnTopOfBars
                fromZero
                style={styles.chart}
                yAxisLabel=""
                yAxisSuffix="分钟"
              />
            ) : (
              <View style={styles.emptyChart}>
                <MaterialCommunityIcons
                  name="chart-bar"
                  size={60}
                  color={paperTheme.colors.onSurfaceVariant}
                />
                <Paragraph style={[styles.emptyText, { color: paperTheme.colors.onSurfaceVariant }]}>
                  本周还没有专注记录
                </Paragraph>
              </View>
            )}
          </Card.Content>
        </Card>

        <View style={styles.statsGrid}>
          <Card style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
            <Card.Content style={styles.statContent}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={32}
                color={theme.colors.primary}
              />
              <Title style={[styles.statValue, { color: theme.colors.text }]}>
                {formatDurationInHours(totalFocusTime)}
              </Title>
              <Paragraph style={[styles.statLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                本周专注时长
              </Paragraph>
            </Card.Content>
          </Card>

          <Card style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
            <Card.Content style={styles.statContent}>
              <MaterialCommunityIcons
                name="check-circle-outline"
                size={32}
                color={paperTheme.colors.primary}
              />
              <Title style={[styles.statValue, { color: theme.colors.text }]}>
                {completedCount}
              </Title>
              <Paragraph style={[styles.statLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                已完成任务
              </Paragraph>
            </Card.Content>
          </Card>

          <Card style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
            <Card.Content style={styles.statContent}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={32}
                color={paperTheme.colors.error}
              />
              <Title style={[styles.statValue, { color: theme.colors.text }]}>
                {overdueCount}
              </Title>
              <Paragraph style={[styles.statLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                逾期任务
              </Paragraph>
            </Card.Content>
          </Card>

          <Card style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
            <Card.Content style={styles.statContent}>
              <MaterialCommunityIcons
                name="format-list-bulleted"
                size={32}
                color={theme.colors.secondary}
              />
              <Title style={[styles.statValue, { color: theme.colors.text }]}>
                {tasks.length}
              </Title>
              <Paragraph style={[styles.statLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                总任务数
              </Paragraph>
            </Card.Content>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  emptyChart: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  statContent: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
});

export default StatsScreen;

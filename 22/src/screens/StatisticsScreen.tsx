import React, {useMemo, useState} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import {useTheme} from '@theme';
import {useCountdownEvents, useCategoryStats} from '@hooks';
import {filterActiveEvents} from '@utils/sortUtils';
import PieChart from '@components/PieChart';

type ChartType = 'donut' | 'pie';

const StatisticsScreen: React.FC = () => {
  const theme = useTheme();
  const {events, categories} = useCountdownEvents('date');
  const categoryStats = useCategoryStats();
  const [chartType, setChartType] = useState<ChartType>('donut');

  const stats = useMemo(() => {
    const activeEvents = filterActiveEvents(events);
    const totalEvents = activeEvents.length;
    const upcomingEvents = activeEvents.filter(e => e.targetDate > Date.now()).length;
    const repeatingEvents = activeEvents.filter(e => e.repeatInterval !== 'none').length;
    const pinnedEvents = activeEvents.filter(e => e.isPinned).length;

    const daysToNextEvent =
      activeEvents.length > 0
        ? Math.ceil(
            (Math.min(...activeEvents.map(e => e.targetDate)) - Date.now()) / 86400000,
          )
        : 0;

    return {
      totalEvents,
      upcomingEvents,
      repeatingEvents,
      pinnedEvents,
      daysToNextEvent,
      archivedEvents: events.filter(e => e.isArchived).length,
      pastEvents: events.filter(e => e.targetDate < Date.now() && e.repeatInterval === 'none').length,
    };
  }, [events]);

  const renderStatCard = (
    icon: string,
    label: string,
    value: number | string,
    color: string,
  ) => (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: theme.colors.surface,
          borderLeftColor: color,
        },
      ]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, {color}]}>{value}</Text>
      <Text style={[styles.statLabel, {color: theme.colors.textSecondary}]}>{label}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, {color: theme.colors.text}]}>统计</Text>
          <Text style={[styles.subtitle, {color: theme.colors.textSecondary}]}>
            查看你的倒计时数据分析
          </Text>
        </View>

        <View style={styles.statsGrid}>
          {renderStatCard('📊', '总倒计时', stats.totalEvents, theme.colors.primary)}
          {renderStatCard('⏰', '即将到来', stats.upcomingEvents, theme.colors.success)}
          {renderStatCard('🔄', '重复事件', stats.repeatingEvents, theme.colors.secondary)}
          {renderStatCard('📌', '置顶事件', stats.pinnedEvents, theme.colors.accent)}
        </View>

        <View style={[styles.section, {backgroundColor: theme.colors.surface}]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>分类分布</Text>
            <View style={styles.chartTypeToggle}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  chartType === 'donut' && [
                    styles.activeToggle,
                    {backgroundColor: theme.colors.primary},
                  ],
                ]}
                onPress={() => setChartType('donut')}>
                <Text
                  style={{
                    color: chartType === 'donut' ? '#FFFFFF' : theme.colors.text,
                  }}>
                  环形图
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  chartType === 'pie' && [
                    styles.activeToggle,
                    {backgroundColor: theme.colors.primary},
                  ],
                ]}
                onPress={() => setChartType('pie')}>
                <Text
                  style={{
                    color: chartType === 'pie' ? '#FFFFFF' : theme.colors.text,
                  }}>
                  饼图
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {categoryStats.length > 0 ? (
            <PieChart data={categoryStats} type={chartType} showLegend />
          ) : (
            <View style={styles.emptyChart}>
              <Text style={{color: theme.colors.textSecondary}}>暂无分类数据</Text>
            </View>
          )}
        </View>

        <View style={[styles.section, {backgroundColor: theme.colors.surface}]}>
          <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>更多统计</Text>

          <View style={styles.moreStats}>
            <View style={styles.moreStatItem}>
              <Text style={[styles.moreStatValue, {color: theme.colors.primary}]}>
                {stats.daysToNextEvent > 0 ? `${stats.daysToNextEvent}天` : '今天'}
              </Text>
              <Text style={[styles.moreStatLabel, {color: theme.colors.textSecondary}]}>
                距离最近事件
              </Text>
            </View>

            <View style={[styles.divider, {backgroundColor: theme.colors.border}]} />

            <View style={styles.moreStatItem}>
              <Text style={[styles.moreStatValue, {color: theme.colors.warning}]}>
                {stats.archivedEvents}
              </Text>
              <Text style={[styles.moreStatLabel, {color: theme.colors.textSecondary}]}>
                已归档事件
              </Text>
            </View>

            <View style={[styles.divider, {backgroundColor: theme.colors.border}]} />

            <View style={styles.moreStatItem}>
              <Text style={[styles.moreStatValue, {color: theme.colors.error}]}>
                {stats.pastEvents}
              </Text>
              <Text style={[styles.moreStatLabel, {color: theme.colors.textSecondary}]}>
                已过期事件
              </Text>
            </View>

            <View style={[styles.divider, {backgroundColor: theme.colors.border}]} />

            <View style={styles.moreStatItem}>
              <Text style={[styles.moreStatValue, {color: theme.colors.success}]}>
                {categories.length}
              </Text>
              <Text style={[styles.moreStatLabel, {color: theme.colors.textSecondary}]}>
                分类数量
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.section, {backgroundColor: theme.colors.surface}]}>
          <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>分类详情</Text>
          {categories.map(category => {
            const count = events.filter(e => e.categoryId === category.id).length;
            if (count === 0) return null;

            const percentage =
              stats.totalEvents > 0 ? ((count / stats.totalEvents) * 100).toFixed(1) : '0';

            return (
              <View key={category.id} style={styles.categoryDetailItem}>
                <View style={styles.categoryDetailLeft}>
                  <View
                    style={[
                      styles.categoryColorDot,
                      {backgroundColor: category.color},
                    ]}
                  />
                  <Text style={[styles.categoryName, {color: theme.colors.text}]}>
                    {category.name}
                  </Text>
                </View>
                <View style={styles.categoryDetailRight}>
                  <Text style={[styles.categoryCount, {color: theme.colors.text}]}>
                    {count}
                  </Text>
                  <Text style={[styles.categoryPercent, {color: theme.colors.textSecondary}]}>
                    {percentage}%
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 20,
  },
  header: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 8,
  },
  statCard: {
    width: '45%',
    flex: 1,
    minWidth: '45%',
    padding: 20,
    borderRadius: 16,
    margin: 8,
    borderLeftWidth: 4,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  section: {
    margin: 16,
    marginTop: 8,
    borderRadius: 16,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  chartTypeToggle: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    borderRadius: 8,
    padding: 2,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  activeToggle: {},
  emptyChart: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreStats: {
    marginTop: 8,
  },
  moreStatItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  moreStatValue: {
    fontSize: 20,
    fontWeight: '600',
  },
  moreStatLabel: {
    fontSize: 14,
  },
  divider: {
    height: 1,
  },
  categoryDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  categoryDetailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 14,
  },
  categoryDetailRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryCount: {
    fontSize: 16,
    fontWeight: '600',
  },
  categoryPercent: {
    fontSize: 12,
    width: 50,
    textAlign: 'right',
  },
});

export default StatisticsScreen;

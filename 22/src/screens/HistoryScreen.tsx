import React, {useState, useMemo} from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '@types';
import {useTheme} from '@theme';
import {useCountdownEvents, useAppDispatch} from '@hooks';
import {formatDate, getContrastColor} from '@utils/dateUtils';
import {unarchiveEvent, deleteEvent} from '@store/eventsSlice';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'History'>;

type HistoryTab = 'archived' | 'past';

const HistoryScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  const [activeTab, setActiveTab] = useState<HistoryTab>('archived');

  const {archivedEvents, pastEvents, categories} = useCountdownEvents('date');

  const displayEvents = useMemo(() => {
    return activeTab === 'archived' ? archivedEvents : pastEvents;
  }, [activeTab, archivedEvents, pastEvents]);

  const handleUnarchive = (eventId: string) => {
    dispatch(unarchiveEvent(eventId));
    Alert.alert('已恢复', '事件已恢复到倒计时列表');
  };

  const handleDelete = (eventId: string, eventName: string) => {
    Alert.alert(
      '删除确认',
      `确定要删除"${eventName}"吗？`,
      [
        {text: '取消', style: 'cancel'},
        {
          text: '删除',
          style: 'destructive',
          onPress: () => dispatch(deleteEvent(eventId)),
        },
      ],
    );
  };

  const navigateToDetail = (eventId: string) => {
    navigation.navigate('EventDetail', {eventId});
  };

  const renderEventItem = ({item}: any) => {
    const category = categories.find(c => c.id === item.categoryId);
    const timeSince = Math.floor((Date.now() - item.targetDate) / 86400000);

    return (
      <TouchableOpacity
        style={[
          styles.eventItem,
          {
            backgroundColor: item.backgroundColor,
            borderLeftColor: category?.color || theme.colors.primary,
          },
        ]}
        onPress={() => navigateToDetail(item.id)}
        activeOpacity={0.8}>
        <View style={styles.eventContent}>
          <View style={styles.eventHeader}>
            {category && (
              <View
                style={[
                  styles.categoryBadge,
                  {backgroundColor: category.color},
                ]}>
                <Text style={styles.categoryText}>{category.name}</Text>
              </View>
            )}
            <Text style={[styles.timeAgo, {color: getContrastColor(item.backgroundColor)}]}>
              {timeSince}天前
            </Text>
          </View>

          <Text
            style={[styles.eventName, {color: getContrastColor(item.backgroundColor)}]}
            numberOfLines={1}>
            {item.name}
          </Text>

          <Text
            style={[
              styles.eventDate,
              {color: getContrastColor(item.backgroundColor), opacity: 0.7},
            ]}>
            {formatDate(item.targetDate)}
          </Text>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                {backgroundColor: 'rgba(255,255,255,0.2)'},
              ]}
              onPress={(e: any) => {
                e.stopPropagation();
                handleUnarchive(item.id);
              }}>
              <Text style={{color: getContrastColor(item.backgroundColor)}}>恢复</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionButton,
                {backgroundColor: 'rgba(239,68,68,0.3)'},
              ]}
              onPress={(e: any) => {
                e.stopPropagation();
                handleDelete(item.id, item.name);
              }}>
              <Text style={{color: '#FFFFFF'}}>删除</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyIcon, {color: theme.colors.textSecondary}]}>📭</Text>
      <Text style={[styles.emptyText, {color: theme.colors.text}]}>
        {activeTab === 'archived' ? '暂无归档事件' : '暂无已过期事件'}
      </Text>
      <Text style={[styles.emptySubtext, {color: theme.colors.textSecondary}]}>
        {activeTab === 'archived'
          ? '归档的事件将显示在这里'
          : '已过期且不重复的事件将显示在这里'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <View style={styles.header}>
        <Text style={[styles.title, {color: theme.colors.text}]}>历史记录</Text>
        <Text style={[styles.subtitle, {color: theme.colors.textSecondary}]}>
          查看归档和已过期的倒计时
        </Text>
      </View>

      <View style={[styles.tabContainer, {backgroundColor: theme.colors.surface}]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'archived' && [styles.activeTab, {backgroundColor: theme.colors.primary}],
          ]}
          onPress={() => setActiveTab('archived')}>
          <Text
            style={{
              color: activeTab === 'archived' ? '#FFFFFF' : theme.colors.text,
            }}>
            已归档 ({archivedEvents.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'past' && [styles.activeTab, {backgroundColor: theme.colors.primary}],
          ]}
          onPress={() => setActiveTab('past')}>
          <Text
            style={{
              color: activeTab === 'past' ? '#FFFFFF' : theme.colors.text,
            }}>
            已过期 ({pastEvents.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={displayEvents}
        keyExtractor={item => item.id}
        renderItem={renderEventItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  tabContainer: {
    flexDirection: 'row',
    margin: 16,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {},
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  eventItem: {
    borderRadius: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    overflow: 'hidden',
  },
  eventContent: {
    padding: 16,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  timeAgo: {
    fontSize: 12,
    fontWeight: '500',
  },
  eventName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 13,
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default HistoryScreen;

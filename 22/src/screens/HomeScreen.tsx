import React, {useState, useMemo, useCallback} from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Text,
  SafeAreaView,
  RefreshControl,
  ScrollView,
  Vibration,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList, SortOption} from '@types';
import {useTheme} from '@theme';
import {useCountdownEvents, useSearch, useAppSelector} from '@hooks';
import {searchEvents, filterByCategory} from '@utils/sortUtils';
import EventCard from '@components/EventCard';
import SortSelector from '@components/SortSelector';
import SearchBar from '@components/SearchBar';
import widgetManager from '@services/widgetManager';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const HomeScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const {activeEvents, categories} = useCountdownEvents(sortBy);
  const {settings} = useAppSelector(state => state.events);
  const {searchQuery, setSearchQuery, debouncedQuery, isSearching, startSearch, endSearch} =
    useSearch();

  const filteredEvents = useMemo(() => {
    let events = activeEvents;

    if (selectedCategory) {
      events = filterByCategory(events, selectedCategory);
    }

    if (debouncedQuery) {
      events = searchEvents(events, debouncedQuery, categories);
    }

    return events;
  }, [activeEvents, selectedCategory, debouncedQuery, categories]);

  const onRefresh = useCallback(async () => {
    Vibration.vibrate(50);
    setRefreshing(true);

    try {
      if (widgetManager.isSupported()) {
        await widgetManager.forceUpdateAllWidgets();
      }

      if (settings.notificationEnabled) {
        await widgetManager.updateAndroidWidgets();
      }
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setTimeout(() => setRefreshing(false), 1500);
    }
  }, [activeEvents, settings.notificationEnabled]);

  const navigateToCreate = () => {
    navigation.navigate('CreateEvent', {});
  };

  const navigateToDetail = (eventId: string) => {
    navigation.navigate('EventDetail', {eventId});
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyTitle, {color: theme.colors.text}]}>
        还没有倒计时事件
      </Text>
      <Text style={[styles.emptySubtitle, {color: theme.colors.textSecondary}]}>
        点击下方按钮创建你的第一个倒计时
      </Text>
      <TouchableOpacity
        style={[styles.createEmptyButton, {backgroundColor: theme.colors.primary}]}
        onPress={navigateToCreate}>
        <Text style={styles.createButtonText}>创建倒计时</Text>
      </TouchableOpacity>
    </View>
  );

  const nearestEvent = useMemo(() => {
    const now = Date.now();
    const upcoming = activeEvents.filter(e => e.targetDate > now);
    if (upcoming.length === 0) return null;
    return upcoming.sort((a, b) => a.targetDate - b.targetDate)[0];
  }, [activeEvents]);

  const renderQuickActions = () => (
    <View style={styles.quickActions}>
      <TouchableOpacity
        style={[styles.quickActionButton, {backgroundColor: theme.colors.surface}]}
        onPress={() => navigation.navigate('WidgetSettings')}>
        <Text style={styles.quickActionIcon}>📱</Text>
        <Text style={[styles.quickActionLabel, {color: theme.colors.text}]}>小组件</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.quickActionButton, {backgroundColor: theme.colors.surface}]}
        onPress={() => navigation.navigate('CategoryManagement')}>
        <Text style={styles.quickActionIcon}>🏷️</Text>
        <Text style={[styles.quickActionLabel, {color: theme.colors.text}]}>分类</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.quickActionButton, {backgroundColor: theme.colors.surface}]}
        onPress={() => navigation.navigate('WallpaperSettings')}>
        <Text style={styles.quickActionIcon}>🖼️</Text>
        <Text style={[styles.quickActionLabel, {color: theme.colors.text}]}>壁纸</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.quickActionButton, {backgroundColor: theme.colors.surface}]}
        onPress={() => navigation.navigate('Statistics')}>
        <Text style={styles.quickActionIcon}>📊</Text>
        <Text style={[styles.quickActionLabel, {color: theme.colors.text}]}>统计</Text>
      </TouchableOpacity>
    </View>
  );

  const renderNearestEventCard = () => {
    if (!nearestEvent) return null;

    const category = categories.find(c => c.id === nearestEvent.categoryId);
    const timeRemaining = useMemo(
      () => {
        const diff = nearestEvent.targetDate - Date.now();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        return {days, hours};
      },
      [nearestEvent],
    );

    return (
      <TouchableOpacity
        style={[
          styles.nearestCard,
          {
            backgroundColor: nearestEvent.backgroundColor,
            shadowColor: nearestEvent.backgroundColor,
          },
        ]}
        onPress={() => navigateToDetail(nearestEvent.id)}>
        <View style={styles.nearestCardHeader}>
          <View style={styles.nearestBadge}>
            <Text style={styles.nearestBadgeText}>🔥 即将到来</Text>
          </View>
          <Text style={styles.nearestCategory}>{category?.name || '其他'}</Text>
        </View>
        <Text style={styles.nearestEventName} numberOfLines={2}>
          {nearestEvent.name}
        </Text>
        <View style={styles.nearestTime}>
          <Text style={styles.nearestDays}>{timeRemaining.days}</Text>
          <Text style={styles.nearestDaysLabel}>天</Text>
          <Text style={styles.nearestHours}>
            {timeRemaining.hours.toString().padStart(2, '0')} 小时
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View>
      <View style={[styles.header, {backgroundColor: theme.colors.background}]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.greeting, {color: theme.colors.text}]}>
              你好 👋
            </Text>
            <Text style={[styles.headerTitle, {color: theme.colors.text}]}>
              倒计时
            </Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={[styles.iconButton, {backgroundColor: theme.colors.surface}]}
              onPress={() => navigation.navigate('CategoryManagement')}>
              <Text style={{fontSize: 18}}>🏷️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconButton, {backgroundColor: theme.colors.surface}]}
              onPress={startSearch}>
              <Text style={{fontSize: 18}}>🔍</Text>
            </TouchableOpacity>
          </View>
        </View>

        {isSearching && (
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            onCancel={endSearch}
          />
        )}
      </View>

      {renderNearestEventCard()}
      {renderQuickActions()}

      <SortSelector currentSort={sortBy} onSortChange={setSortBy} />

      <View style={styles.categoryFilter}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[
              styles.categoryChip,
              {
                backgroundColor:
                  selectedCategory === null ? theme.colors.primary : theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={() => {
              Vibration.vibrate(10);
              setSelectedCategory(null);
            }}>
            <Text
              style={{
                color: selectedCategory === null ? '#FFFFFF' : theme.colors.text,
              }}>
              全部
            </Text>
          </TouchableOpacity>
          {categories.map(category => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryChip,
                {
                  backgroundColor:
                    selectedCategory === category.id ? category.color : theme.colors.surface,
                  borderColor: category.color,
                },
              ]}
              onPress={() => {
                Vibration.vibrate(10);
                setSelectedCategory(selectedCategory === category.id ? null : category.id);
              }}>
              <Text
                style={{
                  color: selectedCategory === category.id ? '#FFFFFF' : theme.colors.text,
                }}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.eventCountRow}>
        <Text style={[styles.eventCountText, {color: theme.colors.textSecondary}]}>
          共 {filteredEvents.length} 个倒计时
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <FlatList
        data={filteredEvents}
        keyExtractor={item => item.id}
        renderItem={({item}) => {
          const category = categories.find(c => c.id === item.categoryId);
          return (
            <EventCard
              event={item}
              category={category}
              onPress={() => navigateToDetail(item.id)}
              style={styles.eventCard}
            />
          );
        }}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      />

      <TouchableOpacity
        style={[styles.fab, {backgroundColor: theme.colors.primary}]}
        onPress={navigateToCreate}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  greeting: {
    fontSize: 14,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nearestCard: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    padding: 20,
    borderRadius: 20,
    elevation: 8,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  nearestCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  nearestBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  nearestBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  nearestCategory: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '500',
  },
  nearestEventName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  nearestTime: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  nearestDays: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '900',
    lineHeight: 48,
  },
  nearestDaysLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
    marginRight: 8,
  },
  nearestHours: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  quickActionButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    minWidth: 70,
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  categoryFilter: {
    paddingVertical: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  eventCountRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  eventCountText: {
    fontSize: 13,
    fontWeight: '500',
  },
  eventCard: {
    marginHorizontal: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  createEmptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabIcon: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '300',
    marginTop: -4,
  },
});

export default HomeScreen;

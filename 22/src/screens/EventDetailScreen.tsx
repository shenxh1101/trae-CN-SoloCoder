import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Share,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '@types';
import {useTheme} from '@theme';
import {useEvent, useAppDispatch, useAppSelector} from '@hooks';
import {formatDateTime, getContrastColor} from '@utils/dateUtils';
import {archiveEvent, unarchiveEvent, togglePin, deleteEvent} from '@store/eventsSlice';
import CountdownDisplay from '@components/CountdownDisplay';
import LinearGradient from 'react-native-linear-gradient';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'EventDetail'>;
type RouteProp = {
  params: {
    eventId: string;
  };
};

const EventDetailScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();
  const dispatch = useAppDispatch();
  const {settings} = useAppSelector(state => state.events);

  const {event, category, timeRemaining} = useEvent(route.params.eventId);

  if (!event) {
    return (
      <View style={[styles.container, {backgroundColor: theme.colors.background}]}>
        <Text style={{color: theme.colors.text}}>事件不存在</Text>
      </View>
    );
  }

  const bgColor = event.backgroundColor || theme.colors.primary;
  const textColor = getContrastColor(bgColor);

  const handleEdit = () => {
    navigation.navigate('CreateEvent', {eventId: event.id});
  };

  const handleShare = () => {
    navigation.navigate('ShareEvent', {eventId: event.id});
  };

  const handleToggleArchive = () => {
    if (event.isArchived) {
      dispatch(unarchiveEvent(event.id));
    } else {
      dispatch(archiveEvent(event.id));
      Alert.alert('已归档', '该事件已移动到历史记录');
      navigation.goBack();
    }
  };

  const handleTogglePin = () => {
    dispatch(togglePin(event.id));
  };

  const handleDelete = () => {
    Alert.alert(
      '删除确认',
      `确定要删除"${event.name}"吗？`,
      [
        {text: '取消', style: 'cancel'},
        {
          text: '删除',
          style: 'destructive',
          onPress: () => {
            dispatch(deleteEvent(event.id));
            navigation.goBack();
          },
        },
      ],
    );
  };

  const handleAddWidget = () => {
    navigation.navigate('WidgetSettings');
  };

  return (
    <ScrollView style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <LinearGradient
        colors={[bgColor, adjustColor(bgColor, -40)]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.headerSection}>
        <SafeAreaView>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, {backgroundColor: 'rgba(255,255,255,0.2)'}]}
              onPress={handleTogglePin}>
              <Text>{event.isPinned ? '📌' : '📍'}</Text>
            </TouchableOpacity>
            <View style={styles.actionButtonsRight}>
              <TouchableOpacity
                style={[styles.actionButton, {backgroundColor: 'rgba(255,255,255,0.2)'}]}
                onPress={handleShare}>
                <Text>📤</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, {backgroundColor: 'rgba(255,255,255,0.2)'}]}
                onPress={handleEdit}>
                <Text>✏️</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.headerContent}>
            {category && (
              <View style={[styles.categoryBadge, {backgroundColor: category.color}]}>
                <Text style={styles.categoryText}>{category.name}</Text>
              </View>
            )}

            <Text style={[styles.eventName, {color: textColor}]}>{event.name}</Text>

            <Text style={[styles.targetDate, {color: textColor, opacity: 0.8}]}>
              {formatDateTime(event.targetDate)}
            </Text>

            {event.repeatInterval !== 'none' && (
              <View style={[styles.repeatBadge, {backgroundColor: 'rgba(255,255,255,0.2)'}]}>
                <Text style={{color: textColor}}>
                  🔄{' '}
                  {event.repeatInterval === 'daily' && '每天'}
                  {event.repeatInterval === 'weekly' && '每周'}
                  {event.repeatInterval === 'monthly' && '每月'}
                  {event.repeatInterval === 'yearly' && '每年'}
                  {' 重复'}
                </Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.countdownSection}>
        <CountdownDisplay
          timeRemaining={timeRemaining}
          showSeconds={settings.showSeconds}
          size="xlarge"
          backgroundColor={bgColor}
          showGradient
        />
      </View>

      {event.notes && (
        <View style={[styles.section, {backgroundColor: theme.colors.surface}]}>
          <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>备注</Text>
          <Text style={[styles.notes, {color: theme.colors.textSecondary}]}>
            {event.notes}
          </Text>
        </View>
      )}

      <View style={[styles.section, {backgroundColor: theme.colors.surface}]}>
        <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>统计信息</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, {color: theme.colors.primary}]}>
              {Math.abs(timeRemaining.days)}
            </Text>
            <Text style={[styles.statLabel, {color: theme.colors.textSecondary}]}>天</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, {color: theme.colors.secondary}]}>
              {Math.abs(timeRemaining.days * 24 + timeRemaining.hours)}
            </Text>
            <Text style={[styles.statLabel, {color: theme.colors.textSecondary}]}>小时</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, {color: theme.colors.accent}]}>
              {Math.abs(timeRemaining.totalSeconds / 60).toFixed(0)}
            </Text>
            <Text style={[styles.statLabel, {color: theme.colors.textSecondary}]}>分钟</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, {color: theme.colors.success}]}>
              {Math.abs(timeRemaining.totalSeconds).toLocaleString()}
            </Text>
            <Text style={[styles.statLabel, {color: theme.colors.textSecondary}]}>秒</Text>
          </View>
        </View>
      </View>

      <View style={[styles.section, {backgroundColor: theme.colors.surface}]}>
        <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>操作</Text>

        <TouchableOpacity
          style={[styles.actionItem, {borderBottomColor: theme.colors.border}]}
          onPress={handleAddWidget}>
          <Text style={styles.actionIcon}>📱</Text>
          <Text style={[styles.actionText, {color: theme.colors.text}]}>添加到桌面小组件</Text>
          <Text style={{color: theme.colors.textSecondary}}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionItem, {borderBottomColor: theme.colors.border}]}
          onPress={handleToggleArchive}>
          <Text style={styles.actionIcon}>{event.isArchived ? '📂' : '🗄️'}</Text>
          <Text style={[styles.actionText, {color: theme.colors.text}]}>
            {event.isArchived ? '取消归档' : '归档到历史'}
          </Text>
          <Text style={{color: theme.colors.textSecondary}}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionItem, {borderBottomColor: theme.colors.border}]}
          onPress={handleEdit}>
          <Text style={styles.actionIcon}>✏️</Text>
          <Text style={[styles.actionText, {color: theme.colors.text}]}>编辑事件</Text>
          <Text style={{color: theme.colors.textSecondary}}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem} onPress={handleDelete}>
          <Text style={styles.actionIcon}>🗑️</Text>
          <Text style={[styles.actionText, {color: '#EF4444'}]}>删除事件</Text>
          <Text style={{color: theme.colors.textSecondary}}>›</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const adjustColor = (color: string, amount: number): string => {
  const hex = color.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSection: {
    minHeight: 280,
    paddingBottom: 40,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  actionButtonsRight: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  eventName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  targetDate: {
    fontSize: 16,
    marginBottom: 12,
  },
  repeatBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  countdownSection: {
    padding: 16,
    marginTop: -20,
  },
  section: {
    margin: 16,
    marginTop: 0,
    borderRadius: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  notes: {
    fontSize: 16,
    lineHeight: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statItem: {
    flex: 1,
    minWidth: '40%',
    alignItems: 'center',
    padding: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  actionIcon: {
    fontSize: 20,
    marginRight: 16,
    width: 24,
    textAlign: 'center',
  },
  actionText: {
    flex: 1,
    fontSize: 16,
  },
});

export default EventDetailScreen;

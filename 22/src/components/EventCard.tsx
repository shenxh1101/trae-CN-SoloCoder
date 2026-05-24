import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ViewStyle} from 'react-native';
import {CountdownEvent, Category} from '@types';
import {useTheme} from '@theme';
import {useCountdown} from '@hooks';
import {formatDate, getContrastColor, formatCountdownDisplay} from '@utils/dateUtils';
import {useAppDispatch} from '@hooks';
import {togglePin} from '@store/eventsSlice';

interface EventCardProps {
  event: CountdownEvent;
  category?: Category;
  onPress: () => void;
  style?: ViewStyle;
  compact?: boolean;
}

const EventCard: React.FC<EventCardProps> = ({
  event,
  category,
  onPress,
  style,
  compact = false,
}) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const timeRemaining = useCountdown(event.targetDate);

  const bgColor = event.backgroundColor || theme.colors.surface;
  const textColor = getContrastColor(bgColor);

  const handleTogglePin = (e: any) => {
    e.stopPropagation();
    dispatch(togglePin(event.id));
  };

  if (compact) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={[
          styles.compactContainer,
          {
            backgroundColor: bgColor,
            borderLeftColor: category?.color || theme.colors.primary,
          },
          style,
        ]}
        activeOpacity={0.8}>
        <View style={styles.compactContent}>
          <Text style={[styles.compactName, {color: textColor}]} numberOfLines={1}>
            {event.name}
          </Text>
          <Text style={[styles.compactCountdown, {color: textColor, opacity: 0.9}]}>
            {formatCountdownDisplay(timeRemaining, false)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.container,
        {
          backgroundColor: bgColor,
        },
        style,
      ]}
      activeOpacity={0.8}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          {category && (
            <View
              style={[
                styles.categoryBadge,
                {backgroundColor: category.color},
              ]}>
              <Text style={styles.categoryText}>{category.name}</Text>
            </View>
          )}
          {event.isPinned && (
            <TouchableOpacity onPress={handleTogglePin} hitSlop={8}>
              <Text style={[styles.pinIcon, {color: textColor}]}>📌</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={handleTogglePin} hitSlop={8}>
          <Text style={{color: textColor, opacity: event.isPinned ? 1 : 0.3}}>📌</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.name, {color: textColor}]} numberOfLines={2}>
        {event.name}
      </Text>

      <View style={styles.countdownSection}>
        <Text style={[styles.countdownText, {color: textColor}]}>
          {timeRemaining.isPast ? '已过去' : '剩余'}
        </Text>
        <Text style={[styles.countdownValue, {color: textColor}]}>
          {Math.abs(timeRemaining.days)}天 {String(timeRemaining.hours).padStart(2, '0')}:
          {String(timeRemaining.minutes).padStart(2, '0')}:
          {String(timeRemaining.seconds).padStart(2, '0')}
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.dateText, {color: textColor, opacity: 0.7}]}>
          {formatDate(event.targetDate)}
        </Text>
        {event.repeatInterval !== 'none' && (
          <View style={[styles.repeatBadge, {backgroundColor: textColor, opacity: 0.2}]}>
            <Text style={[styles.repeatText, {color: textColor}]}>
              {event.repeatInterval === 'daily' && '每天'}
              {event.repeatInterval === 'weekly' && '每周'}
              {event.repeatInterval === 'monthly' && '每月'}
              {event.repeatInterval === 'yearly' && '每年'}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  compactContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  compactContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  compactCountdown: {
    fontSize: 14,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  pinIcon: {
    fontSize: 18,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  countdownSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  countdownText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  countdownValue: {
    fontSize: 28,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 13,
  },
  repeatBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  repeatText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default EventCard;

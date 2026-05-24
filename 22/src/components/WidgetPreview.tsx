import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {WidgetSize, WidgetTheme, CountdownEvent, Category, TimeRemaining} from '@types';
import {useTheme} from '@theme';
import {getContrastColor, padZero, formatCountdownDisplay} from '@utils/dateUtils';

interface WidgetPreviewProps {
  event: CountdownEvent;
  category?: Category;
  size: WidgetSize;
  theme: WidgetTheme;
  timeRemaining: TimeRemaining;
}

const WidgetPreview: React.FC<WidgetPreviewProps> = ({
  event,
  category,
  size,
  theme,
  timeRemaining,
}) => {
  const appTheme = useTheme();

  const getSizeConfig = () => {
    switch (size) {
      case 'small':
        return {width: 150, height: 150, padding: 12, nameSize: 14, daysSize: 32};
      case 'medium':
        return {width: 320, height: 150, padding: 16, nameSize: 16, daysSize: 36};
      case 'large':
        return {width: 320, height: 320, padding: 20, nameSize: 20, daysSize: 48};
    }
  };

  const getThemeConfig = () => {
    const bgColor = event.backgroundColor || '#6366F1';
    const textColor = getContrastColor(bgColor);

    switch (theme) {
      case 'light':
        return {
          bg: '#FFFFFF',
          text: '#1E293B',
          subText: '#64748B',
          accent: bgColor,
        };
      case 'dark':
        return {
          bg: '#1E293B',
          text: '#F1F5F9',
          subText: '#94A3B8',
          accent: bgColor,
        };
      case 'colorful':
        return {
          bg: bgColor,
          text: textColor,
          subText: textColor,
          accent: textColor,
        };
      case 'minimal':
        return {
          bg: 'transparent',
          text: '#1E293B',
          subText: '#64748B',
          accent: '#6366F1',
        };
    }
  };

  const sizeConfig = getSizeConfig();
  const themeConfig = getThemeConfig();

  const renderSmallWidget = () => (
    <View
      style={[
        styles.widget,
        {
          width: sizeConfig.width,
          height: sizeConfig.height,
          backgroundColor: themeConfig.bg,
          padding: sizeConfig.padding,
        },
      ]}>
      {category && (
        <View
          style={[
            styles.smallCategory,
            {backgroundColor: category.color},
          ]}
        />
      )}
      <View style={styles.smallContent}>
        <Text
          style={[
            styles.smallDays,
            {fontSize: sizeConfig.daysSize, color: themeConfig.text},
          ]}>
          {Math.abs(timeRemaining.days)}
        </Text>
        <Text style={[styles.smallDaysLabel, {color: themeConfig.subText}]}>
          天
        </Text>
      </View>
      <Text
        style={[
          styles.smallName,
          {fontSize: sizeConfig.nameSize, color: themeConfig.text},
        ]}
        numberOfLines={2}>
        {event.name}
      </Text>
    </View>
  );

  const renderMediumWidget = () => (
    <View
      style={[
        styles.widget,
        {
          width: sizeConfig.width,
          height: sizeConfig.height,
          backgroundColor: themeConfig.bg,
          padding: sizeConfig.padding,
        },
      ]}>
      <View style={styles.mediumContainer}>
        <View style={styles.mediumLeft}>
          {category && (
            <Text
              style={[
                styles.mediumCategory,
                {color: category.color},
              ]}>
              {category.name}
            </Text>
          )}
          <Text
            style={[
              styles.mediumName,
              {fontSize: sizeConfig.nameSize, color: themeConfig.text},
            ]}
            numberOfLines={2}>
            {event.name}
          </Text>
          <Text style={[styles.mediumStatus, {color: themeConfig.subText}]}>
            {formatCountdownDisplay(timeRemaining, false)}
          </Text>
        </View>
        <View style={styles.mediumRight}>
          <Text
            style={[
              styles.mediumDays,
              {fontSize: sizeConfig.daysSize, color: themeConfig.accent},
            ]}>
            {Math.abs(timeRemaining.days)}
          </Text>
          <Text style={[styles.mediumDaysLabel, {color: themeConfig.subText}]}>
            天
          </Text>
        </View>
      </View>
    </View>
  );

  const renderLargeWidget = () => (
    <View
      style={[
        styles.widget,
        {
          width: sizeConfig.width,
          height: sizeConfig.height,
          backgroundColor: themeConfig.bg,
          padding: sizeConfig.padding,
        },
      ]}>
      {category && (
        <View
          style={[
            styles.largeCategory,
            {backgroundColor: category.color},
          ]}>
          <Text style={styles.largeCategoryText}>{category.name}</Text>
        </View>
      )}
      <Text
        style={[
          styles.largeName,
          {fontSize: sizeConfig.nameSize, color: themeConfig.text},
        ]}
        numberOfLines={2}>
        {event.name}
      </Text>
      <View style={styles.largeCountdown}>
        <Text style={[styles.largeStatus, {color: themeConfig.subText}]}>
          {timeRemaining.isPast ? '已过去' : '还有'}
        </Text>
        <View style={styles.largeNumbers}>
          <Text
            style={[
              styles.largeNumber,
              {color: themeConfig.text},
            ]}>
            {padZero(timeRemaining.hours)}
          </Text>
          <Text style={[styles.largeSeparator, {color: themeConfig.subText}]}>:</Text>
          <Text
            style={[
              styles.largeNumber,
              {color: themeConfig.text},
            ]}>
            {padZero(timeRemaining.minutes)}
          </Text>
          <Text style={[styles.largeSeparator, {color: themeConfig.subText}]}>:</Text>
          <Text
            style={[
              styles.largeNumber,
              {color: themeConfig.text},
            ]}>
            {padZero(timeRemaining.seconds)}
          </Text>
        </View>
        <View style={styles.largeLabels}>
          <Text style={[styles.largeLabel, {color: themeConfig.subText}]}>时</Text>
          <Text style={[styles.largeLabel, {color: themeConfig.subText}]}>分</Text>
          <Text style={[styles.largeLabel, {color: themeConfig.subText}]}>秒</Text>
        </View>
      </View>
      <View style={styles.largeDaysRow}>
        <Text
          style={[
            styles.largeDays,
            {fontSize: sizeConfig.daysSize, color: themeConfig.accent},
          ]}>
          {Math.abs(timeRemaining.days)}
        </Text>
        <Text style={[styles.largeDaysLabel, {color: themeConfig.subText}]}>
          天
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.previewContainer}>
      {size === 'small' && renderSmallWidget()}
      {size === 'medium' && renderMediumWidget()}
      {size === 'large' && renderLargeWidget()}
    </View>
  );
};

const styles = StyleSheet.create({
  previewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  widget: {
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  smallCategory: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  smallContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallDays: {
    fontWeight: 'bold',
  },
  smallDaysLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  smallName: {
    textAlign: 'center',
    fontWeight: '500',
  },
  mediumContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  mediumLeft: {
    flex: 1,
    justifyContent: 'center',
  },
  mediumCategory: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  mediumName: {
    fontWeight: '600',
    marginBottom: 8,
  },
  mediumStatus: {
    fontSize: 14,
  },
  mediumRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediumDays: {
    fontWeight: 'bold',
  },
  mediumDaysLabel: {
    fontSize: 12,
  },
  largeCategory: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  largeCategoryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  largeName: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  largeCountdown: {
    alignItems: 'center',
    marginBottom: 16,
  },
  largeStatus: {
    fontSize: 14,
    marginBottom: 8,
  },
  largeNumbers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  largeNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  largeSeparator: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  largeLabels: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 4,
  },
  largeLabel: {
    fontSize: 12,
    width: 24,
    textAlign: 'center',
  },
  largeDaysRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  largeDays: {
    fontWeight: 'bold',
  },
  largeDaysLabel: {
    fontSize: 16,
    marginLeft: 4,
  },
});

export default WidgetPreview;

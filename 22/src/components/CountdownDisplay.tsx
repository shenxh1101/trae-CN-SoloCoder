import React, {useMemo} from 'react';
import {View, StyleSheet, Text, ViewStyle} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {TimeRemaining} from '@types';
import {useTheme} from '@theme';
import {getContrastColor, padZero} from '@utils/dateUtils';
import CountdownNumber from './CountdownNumber';

interface CountdownDisplayProps {
  timeRemaining: TimeRemaining;
  showSeconds?: boolean;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  backgroundColor?: string;
  showGradient?: boolean;
  style?: ViewStyle;
}

const CountdownDisplay: React.FC<CountdownDisplayProps> = ({
  timeRemaining,
  showSeconds = true,
  size = 'large',
  backgroundColor,
  showGradient = false,
  style,
}) => {
  const theme = useTheme();

  const values = useMemo(() => {
    const {days, hours, minutes, seconds} = timeRemaining;
    return {
      days: padZero(days),
      hours: padZero(hours),
      minutes: padZero(minutes),
      seconds: padZero(seconds),
    };
  }, [timeRemaining]);

  const bgColor = backgroundColor || theme.colors.background;
  const textColor = backgroundColor ? getContrastColor(backgroundColor) : theme.colors.text;

  const renderContent = () => (
    <View style={[styles.container, style]}>
      {timeRemaining.isPast && (
        <Text style={[styles.statusText, {color: textColor}]}>已过去</Text>
      )}

      <View style={styles.numbersRow}>
        <CountdownNumber
          value={values.days}
          label="天"
          size={size}
          backgroundColor={showGradient ? undefined : backgroundColor}
          textColor={showGradient ? textColor : undefined}
        />

        <Text style={[styles.separator, {color: textColor, fontSize: size === 'xlarge' ? 48 : size === 'large' ? 36 : 24}]}>:</Text>

        <CountdownNumber
          value={values.hours}
          label="时"
          size={size}
          backgroundColor={showGradient ? undefined : backgroundColor}
          textColor={showGradient ? textColor : undefined}
        />

        <Text style={[styles.separator, {color: textColor, fontSize: size === 'xlarge' ? 48 : size === 'large' ? 36 : 24}]}>:</Text>

        <CountdownNumber
          value={values.minutes}
          label="分"
          size={size}
          backgroundColor={showGradient ? undefined : backgroundColor}
          textColor={showGradient ? textColor : undefined}
        />

        {showSeconds && (
          <>
            <Text style={[styles.separator, {color: textColor, fontSize: size === 'xlarge' ? 48 : size === 'large' ? 36 : 24}]}>:</Text>
            <CountdownNumber
              value={values.seconds}
              label="秒"
              size={size}
              backgroundColor={showGradient ? undefined : backgroundColor}
              textColor={showGradient ? textColor : undefined}
            />
          </>
        )}
      </View>
    </View>
  );

  if (showGradient && backgroundColor) {
    return (
      <LinearGradient
        colors={[backgroundColor, adjustColor(backgroundColor, -30)]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={[styles.gradientContainer, style]}>
        {renderContent()}
      </LinearGradient>
    );
  }

  return renderContent();
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientContainer: {
    borderRadius: 20,
    padding: 20,
  },
  numbersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  separator: {
    fontWeight: 'bold',
    marginBottom: 20,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
});

export default CountdownDisplay;

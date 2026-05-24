import React, {useMemo} from 'react';
import {View, Text, StyleSheet, ViewStyle} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {useTheme} from '@theme';
import {getContrastColor} from '@utils/dateUtils';

interface CountdownNumberProps {
  value: string;
  label: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  backgroundColor?: string;
  textColor?: string;
  style?: ViewStyle;
}

const CountdownNumber: React.FC<CountdownNumberProps> = ({
  value,
  label,
  size = 'large',
  backgroundColor,
  textColor,
  style,
}) => {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const previousValue = useSharedValue(value);

  const sizeConfig = useMemo(() => {
    switch (size) {
      case 'small':
        return {
          numberFontSize: 24,
          labelFontSize: 10,
          padding: 8,
          borderRadius: 8,
          minWidth: 50,
        };
      case 'medium':
        return {
          numberFontSize: 36,
          labelFontSize: 12,
          padding: 12,
          borderRadius: 12,
          minWidth: 70,
        };
      case 'large':
        return {
          numberFontSize: 48,
          labelFontSize: 14,
          padding: 16,
          borderRadius: 16,
          minWidth: 90,
        };
      case 'xlarge':
        return {
          numberFontSize: 72,
          labelFontSize: 16,
          padding: 20,
          borderRadius: 20,
          minWidth: 120,
        };
    }
  }, [size]);

  if (previousValue.value !== value) {
    scale.value = withSpring(1.1, {damping: 10, stiffness: 100}, () => {
      scale.value = withSpring(1);
    });
    previousValue.value = value;
  }

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));

  const bgColor = backgroundColor || theme.colors.surface;
  const txtColor = textColor || (backgroundColor ? getContrastColor(backgroundColor) : theme.colors.text);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: bgColor,
          padding: sizeConfig.padding,
          borderRadius: sizeConfig.borderRadius,
          minWidth: sizeConfig.minWidth,
        },
        animatedStyle,
        style,
      ]}>
      <Text
        style={[
          styles.number,
          {
            fontSize: sizeConfig.numberFontSize,
            color: txtColor,
          },
        ]}>
        {value}
      </Text>
      <Text
        style={[
          styles.label,
          {
            fontSize: sizeConfig.labelFontSize,
            color: txtColor,
            opacity: 0.7,
          },
        ]}>
        {label}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  label: {
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default CountdownNumber;

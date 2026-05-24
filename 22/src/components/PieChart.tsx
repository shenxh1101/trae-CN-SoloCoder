import React from 'react';
import {View, Text, StyleSheet, Dimensions} from 'react-native';
import Svg, {Circle, G, Text as SvgText} from 'react-native-svg';
import {Category} from '@types';
import {useTheme} from '@theme';

interface CategoryStat {
  category: Category;
  count: number;
  percentage: number;
  color: string;
}

interface PieChartProps {
  data: CategoryStat[];
  type?: 'pie' | 'donut';
  size?: number;
  showLegend?: boolean;
}

const PieChart: React.FC<PieChartProps> = ({
  data,
  type = 'donut',
  size = 280,
  showLegend = true,
}) => {
  const theme = useTheme();

  if (data.length === 0) {
    return (
      <View style={[styles.container, {height: size}]}>
        <Text style={{color: theme.colors.textSecondary, textAlign: 'center'}}>
          暂无数据
        </Text>
      </View>
    );
  }

  const total = data.reduce((sum, item) => sum + item.count, 0);
  const center = size / 2;
  const radius = size / 2 - 20;
  const strokeWidth = type === 'donut' ? 40 : radius;
  const innerRadius = type === 'donut' ? radius - strokeWidth : 0;

  let currentAngle = -90;

  const calculateArc = (percentage: number) => {
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;

    if (percentage >= 100) {
      return {
        path: null,
        isFullCircle: true,
      };
    }

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = ((startAngle + angle) * Math.PI) / 180;

    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);

    const largeArcFlag = angle > 180 ? 1 : 0;

    const outerArc = `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
    const innerArc =
      type === 'donut'
        ? `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${center + innerRadius * Math.cos(startRad)} ${center + innerRadius * Math.sin(startRad)}`
        : '';

    const path =
      type === 'donut'
        ? `M ${center + innerRadius * Math.cos(startRad)} ${center + innerRadius * Math.sin(startRad)} L ${x1} ${y1} ${outerArc} L ${center + innerRadius * Math.cos(endRad)} ${center + innerRadius * Math.sin(endRad)} ${innerArc} Z`
        : `M ${center} ${center} L ${x1} ${y1} ${outerArc} Z`;

    return {
      path,
      isFullCircle: false,
    };
  };

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <G>
          {type === 'donut' && (
            <Circle
              cx={center}
              cy={center}
              r={innerRadius + strokeWidth / 2}
              fill="none"
              stroke={theme.colors.border}
              strokeWidth={strokeWidth - 2}
            />
          )}
          {data.map((item, index) => {
            const {path, isFullCircle} = calculateArc(item.percentage);

            if (isFullCircle) {
              return (
                <Circle
                  key={index}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill={type === 'donut' ? 'none' : item.color}
                  stroke={type === 'donut' ? item.color : undefined}
                  strokeWidth={type === 'donut' ? strokeWidth : undefined}
                />
              );
            }

            return (
              <Circle
                key={index}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${(item.percentage / 100) * 2 * Math.PI * radius} ${2 * Math.PI * radius}`}
                strokeDashoffset={
                  -((currentAngle - (item.percentage / 100) * 360 + 90) / 360) * 2 * Math.PI * radius
                }
                onPress={() => {}}
              />
            );
          })}
        </G>
        {type === 'donut' && (
          <>
            <SvgText
              x={center}
              y={center - 10}
              textAnchor="middle"
              fontSize={28}
              fontWeight="bold"
              fill={theme.colors.text}>
              {total}
            </SvgText>
            <SvgText
              x={center}
              y={center + 16}
              textAnchor="middle"
              fontSize={14}
              fill={theme.colors.textSecondary}>
              个事件
            </SvgText>
          </>
        )}
      </Svg>

      {showLegend && (
        <View style={styles.legendContainer}>
          {data.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View
                style={[
                  styles.legendColor,
                  {backgroundColor: item.color},
                ]}
              />
              <View style={styles.legendTextContainer}>
                <Text style={[styles.legendName, {color: theme.colors.text}]}>
                  {item.category.name}
                </Text>
                <Text style={[styles.legendValue, {color: theme.colors.textSecondary}]}>
                  {item.count}个 ({item.percentage.toFixed(1)}%)
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 16,
  },
  legendContainer: {
    marginTop: 24,
    width: '100%',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  legendTextContainer: {
    flex: 1,
  },
  legendName: {
    fontSize: 14,
    fontWeight: '500',
  },
  legendValue: {
    fontSize: 12,
    marginTop: 2,
  },
});

export default PieChart;

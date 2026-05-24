import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ScrollView} from 'react-native';
import {SortOption} from '@types';
import {useTheme} from '@theme';

interface SortSelectorProps {
  currentSort: SortOption;
  onSortChange: (sort: SortOption) => void;
}

const sortOptions: {value: SortOption; label: string; icon: string}[] = [
  {value: 'date', label: '按日期', icon: '📅'},
  {value: 'name', label: '按名称', icon: '📝'},
  {value: 'category', label: '按分类', icon: '🏷️'},
  {value: 'remaining', label: '按剩余时间', icon: '⏱️'},
];

const SortSelector: React.FC<SortSelectorProps> = ({currentSort, onSortChange}) => {
  const theme = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}>
      {sortOptions.map(option => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.option,
            {
              backgroundColor:
                currentSort === option.value ? theme.colors.primary : theme.colors.surface,
              borderColor:
                currentSort === option.value ? theme.colors.primary : theme.colors.border,
            },
          ]}
          onPress={() => onSortChange(option.value)}>
          <Text style={styles.icon}>{option.icon}</Text>
          <Text
            style={{
              color: currentSort === option.value ? '#FFFFFF' : theme.colors.text,
            }}>
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  icon: {
    marginRight: 6,
    fontSize: 16,
  },
});

export default SortSelector;

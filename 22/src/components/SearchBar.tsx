import React from 'react';
import {View, TextInput, StyleSheet, TouchableOpacity, Text} from 'react-native';
import {useTheme} from '@theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onCancel?: () => void;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  onCancel,
  placeholder = '搜索事件...',
}) => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.searchContainer,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={[styles.input, {color: theme.colors.text}]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
          autoCorrect={false}
          returnKeyType="search"
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={() => onChangeText('')} hitSlop={8}>
            <Text style={{color: theme.colors.textSecondary}}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      {onCancel && (
        <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
          <Text style={{color: theme.colors.primary}}>取消</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchIcon: {
    fontSize: 16,
    opacity: 0.6,
  },
  input: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  cancelButton: {
    paddingVertical: 8,
  },
});

export default SearchBar;

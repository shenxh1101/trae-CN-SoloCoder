import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {CountdownEvent, RepeatInterval} from '@types';
import {useTheme, presetColors} from '@theme';
import {useAppDispatch, useAppSelector} from '@hooks';
import {addEvent, updateEvent, deleteEvent} from '@store/eventsSlice';

interface EventFormProps {
  eventId?: string;
  onSave?: () => void;
  onCancel?: () => void;
}

const EventForm: React.FC<EventFormProps> = ({eventId, onSave, onCancel}) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const {events, categories} = useAppSelector(state => state.events);

  const existingEvent = eventId ? events.find(e => e.id === eventId) : undefined;

  const [name, setName] = useState('');
  const [targetDate, setTargetDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState('#6366F1');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '7');
  const [repeatInterval, setRepeatInterval] = useState<RepeatInterval>('none');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (existingEvent) {
      setName(existingEvent.name);
      setTargetDate(new Date(existingEvent.targetDate));
      setBackgroundColor(existingEvent.backgroundColor);
      setCategoryId(existingEvent.categoryId);
      setRepeatInterval(existingEvent.repeatInterval);
      setNotes(existingEvent.notes || '');
    }
  }, [existingEvent]);

  const handleDateChange = useCallback((event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const current = targetDate;
      selectedDate.setHours(current.getHours(), current.getMinutes(), 0, 0);
      setTargetDate(selectedDate);
    }
  }, [targetDate]);

  const handleTimeChange = useCallback((event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      const current = targetDate;
      current.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
      setTargetDate(new Date(current));
    }
  }, [targetDate]);

  const handleSave = useCallback(() => {
    if (!name.trim()) {
      Alert.alert('错误', '请输入事件名称');
      return;
    }

    if (targetDate.getTime() <= Date.now() && repeatInterval === 'none') {
      Alert.alert('错误', '目标时间必须在未来');
      return;
    }

    const eventData = {
      name: name.trim(),
      targetDate: targetDate.getTime(),
      backgroundColor,
      categoryId,
      repeatInterval,
      notes: notes.trim(),
      isArchived: false,
      isPinned: existingEvent?.isPinned || false,
    };

    if (existingEvent) {
      dispatch(updateEvent({id: existingEvent.id, updates: eventData}));
    } else {
      dispatch(addEvent(eventData));
    }

    onSave?.();
  }, [name, targetDate, backgroundColor, categoryId, repeatInterval, notes, existingEvent, dispatch, onSave]);

  const handleDelete = useCallback(() => {
    if (!existingEvent) return;

    Alert.alert(
      '删除确认',
      `确定要删除"${existingEvent.name}"吗？`,
      [
        {text: '取消', style: 'cancel'},
        {
          text: '删除',
          style: 'destructive',
          onPress: () => {
            dispatch(deleteEvent(existingEvent.id));
            onSave?.();
          },
        },
      ],
    );
  }, [existingEvent, dispatch, onSave]);

  const repeatOptions: {value: RepeatInterval; label: string}[] = [
    {value: 'none', label: '不重复'},
    {value: 'daily', label: '每天'},
    {value: 'weekly', label: '每周'},
    {value: 'monthly', label: '每月'},
    {value: 'yearly', label: '每年'},
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={[styles.label, {color: theme.colors.text}]}>事件名称 *</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.surface,
              color: theme.colors.text,
              borderColor: theme.colors.border,
            },
          ]}
          value={name}
          onChangeText={setName}
          placeholder="输入事件名称"
          placeholderTextColor={theme.colors.textSecondary}
          maxLength={50}
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, {color: theme.colors.text}]}>目标日期 *</Text>
        <TouchableOpacity
          style={[
            styles.dateButton,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
          onPress={() => setShowDatePicker(true)}>
          <Text style={{color: theme.colors.text}}>
            {targetDate.toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={targetDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
            minimumDate={repeatInterval === 'none' ? new Date() : undefined}
          />
        )}
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, {color: theme.colors.text}]}>目标时间 *</Text>
        <TouchableOpacity
          style={[
            styles.dateButton,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
          onPress={() => setShowTimePicker(true)}>
          <Text style={{color: theme.colors.text}}>
            {targetDate.toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </TouchableOpacity>
        {showTimePicker && (
          <DateTimePicker
            value={targetDate}
            mode="time"
            display="default"
            onChange={handleTimeChange}
            is24Hour
          />
        )}
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, {color: theme.colors.text}]}>背景颜色</Text>
        <View style={styles.colorGrid}>
          {presetColors.map(color => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorOption,
                {
                  backgroundColor: color,
                  borderWidth: backgroundColor === color ? 3 : 2,
                  borderColor: backgroundColor === color ? theme.colors.text : 'transparent',
                },
              ]}
              onPress={() => setBackgroundColor(color)}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, {color: theme.colors.text}]}>分类</Text>
        <View style={styles.categoryList}>
          {categories.map(category => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryOption,
                {
                  backgroundColor: categoryId === category.id ? category.color : theme.colors.surface,
                  borderColor: category.color,
                },
              ]}
              onPress={() => setCategoryId(category.id)}>
              <Text
                style={{
                  color: categoryId === category.id ? '#FFFFFF' : theme.colors.text,
                }}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, {color: theme.colors.text}]}>重复</Text>
        <View style={styles.repeatList}>
          {repeatOptions.map(option => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.repeatOption,
                {
                  backgroundColor:
                    repeatInterval === option.value ? theme.colors.primary : theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={() => setRepeatInterval(option.value)}>
              <Text
                style={{
                  color: repeatInterval === option.value ? '#FFFFFF' : theme.colors.text,
                }}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, {color: theme.colors.text}]}>备注</Text>
        <TextInput
          style={[
            styles.textArea,
            {
              backgroundColor: theme.colors.surface,
              color: theme.colors.text,
              borderColor: theme.colors.border,
            },
          ]}
          value={notes}
          onChangeText={setNotes}
          placeholder="添加备注信息（可选）"
          placeholderTextColor={theme.colors.textSecondary}
          multiline
          numberOfLines={4}
          maxLength={200}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.buttonSection}>
        <TouchableOpacity
          style={[styles.saveButton, {backgroundColor: theme.colors.primary}]}
          onPress={handleSave}>
          <Text style={styles.buttonText}>
            {existingEvent ? '保存修改' : '创建事件'}
          </Text>
        </TouchableOpacity>

        {existingEvent && (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteText}>删除事件</Text>
          </TouchableOpacity>
        )}

        {onCancel && (
          <TouchableOpacity
            style={[styles.cancelButton, {borderColor: theme.colors.border}]}
            onPress={onCancel}>
            <Text style={{color: theme.colors.textSecondary}}>取消</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  textArea: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    minHeight: 100,
  },
  dateButton: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  categoryList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  repeatList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  repeatOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  buttonSection: {
    gap: 12,
    marginTop: 8,
  },
  saveButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
});

export default EventForm;

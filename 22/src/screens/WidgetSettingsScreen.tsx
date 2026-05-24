import React, {useState} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  FlatList,
} from 'react-native';
import {WidgetSize, WidgetTheme, CountdownEvent, WidgetConfig} from '@types';
import {useTheme} from '@theme';
import {useAppDispatch, useAppSelector} from '@hooks';
import {useCountdown} from '@hooks';
import {addWidget, deleteWidget} from '@store/widgetSlice';
import WidgetPreview from '@components/WidgetPreview';

const WidgetSettingsScreen: React.FC = () => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const {widgets} = useAppSelector(state => state.widgets);
  const {events, categories} = useAppSelector(state => state.events);
  const activeEvents = events.filter((e: any) => !e.isArchived);

  const [selectedEvent, setSelectedEvent] = useState<CountdownEvent | null>(
    activeEvents[0] || null,
  );
  const [selectedSize, setSelectedSize] = useState<WidgetSize>('medium');
  const [selectedTheme, setSelectedTheme] = useState<WidgetTheme>('colorful');
  const [showAddForm, setShowAddForm] = useState(false);

  const timeRemaining = useCountdown(selectedEvent?.targetDate || 0, !!selectedEvent);

  const sizeOptions: Array<{value: WidgetSize; label: string}> = [
    {value: 'small', label: '小号'},
    {value: 'medium', label: '中号'},
    {value: 'large', label: '大号'},
  ];

  const themeOptions: Array<{value: WidgetTheme; label: string}> = [
    {value: 'light', label: '浅色'},
    {value: 'dark', label: '深色'},
    {value: 'colorful', label: '彩色'},
    {value: 'minimal', label: '简约'},
  ];

  const handleAddWidget = () => {
    if (!selectedEvent) {
      Alert.alert('请选择事件', '请先选择一个倒计时事件');
      return;
    }

    dispatch(
      addWidget({
        eventId: selectedEvent.id,
        size: selectedSize,
        theme: selectedTheme,
      }),
    );

    setShowAddForm(false);
    Alert.alert('添加成功', '小组件已添加，请在手机桌面添加小组件');
  };

  const handleDeleteWidget = (widgetId: string) => {
    Alert.alert('删除确认', '确定要删除这个小组件配置吗？', [
      {text: '取消', style: 'cancel'},
      {
        text: '删除',
        style: 'destructive',
        onPress: () => dispatch(deleteWidget(widgetId)),
      },
    ]);
  };

  const renderWidgetItem = ({item}: {item: WidgetConfig}) => {
    const event = activeEvents.find((e: CountdownEvent) => e.id === item.eventId);
    const category = event ? categories.find((c: any) => c.id === event.categoryId) : undefined;
    const widgetTimeRemaining = useCountdown(event?.targetDate || 0, !!event);

    if (!event) return null;

    return (
      <View style={styles.widgetItem}>
        <WidgetPreview
          event={event}
          category={category}
          size={item.size}
          theme={item.theme}
          timeRemaining={widgetTimeRemaining}
        />
        <View style={styles.widgetItemActions}>
          <TouchableOpacity
            style={[styles.deleteButton, {backgroundColor: '#EF4444'}]}
            onPress={() => handleDeleteWidget(item.id)}>
            <Text style={styles.deleteButtonText}>删除</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, {color: theme.colors.text}]}>小组件设置</Text>
          <Text style={[styles.subtitle, {color: theme.colors.textSecondary}]}>
            配置桌面倒计时小组件
          </Text>
        </View>

        {!showAddForm && (
          <TouchableOpacity
            style={[styles.addButton, {backgroundColor: theme.colors.primary}]}
            onPress={() => setShowAddForm(true)}>
            <Text style={styles.addButtonText}>+ 添加小组件</Text>
          </TouchableOpacity>
        )}

        {showAddForm && (
          <View style={[styles.section, {backgroundColor: theme.colors.surface}]}>
            <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>
              创建新小组件
            </Text>

            <Text style={[styles.label, {color: theme.colors.text}]}>选择事件</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.eventList}>
              {activeEvents.map((event: CountdownEvent) => (
                <TouchableOpacity
                  key={event.id}
                  style={[
                    styles.eventChip,
                    {
                      backgroundColor:
                        selectedEvent?.id === event.id
                          ? event.backgroundColor
                          : theme.colors.background,
                      borderColor:
                        selectedEvent?.id === event.id
                          ? event.backgroundColor
                          : theme.colors.border,
                    },
                  ]}
                  onPress={() => setSelectedEvent(event)}>
                  <Text
                    style={{
                      color:
                        selectedEvent?.id === event.id
                          ? '#FFFFFF'
                          : theme.colors.text,
                    }}
                    numberOfLines={1}>
                    {event.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.label, {color: theme.colors.text}]}>小组件尺寸</Text>
            <View style={styles.optionsRow}>
              {sizeOptions.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    {
                      backgroundColor:
                        selectedSize === option.value
                          ? theme.colors.primary
                          : 'transparent',
                      borderColor:
                        selectedSize === option.value
                          ? theme.colors.primary
                          : theme.colors.border,
                    },
                  ]}
                  onPress={() => setSelectedSize(option.value)}>
                  <Text
                    style={{
                      color:
                        selectedSize === option.value ? '#FFFFFF' : theme.colors.text,
                    }}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, {color: theme.colors.text}]}>显示主题</Text>
            <View style={styles.optionsRow}>
              {themeOptions.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    {
                      backgroundColor:
                        selectedTheme === option.value
                          ? theme.colors.primary
                          : 'transparent',
                      borderColor:
                        selectedTheme === option.value
                          ? theme.colors.primary
                          : theme.colors.border,
                    },
                  ]}
                  onPress={() => setSelectedTheme(option.value)}>
                  <Text
                    style={{
                      color:
                        selectedTheme === option.value ? '#FFFFFF' : theme.colors.text,
                    }}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {selectedEvent && (
              <View style={styles.previewSection}>
                <Text style={[styles.label, {color: theme.colors.text}]}>预览</Text>
                <View style={styles.previewContainer}>
                  <WidgetPreview
                    event={selectedEvent}
                    category={categories.find(c => c.id === selectedEvent.categoryId)}
                    size={selectedSize}
                    theme={selectedTheme}
                    timeRemaining={timeRemaining}
                  />
                </View>
              </View>
            )}

            <View style={styles.formButtons}>
              <TouchableOpacity
                style={[styles.cancelButton, {borderColor: theme.colors.border}]}
                onPress={() => setShowAddForm(false)}>
                <Text style={{color: theme.colors.textSecondary}}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, {backgroundColor: theme.colors.primary}]}
                onPress={handleAddWidget}>
                <Text style={styles.saveButtonText}>添加小组件</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {widgets.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>
              已配置的小组件 ({widgets.length})
            </Text>
            <FlatList
              data={widgets}
              keyExtractor={item => item.id}
              renderItem={renderWidgetItem}
              scrollEnabled={false}
            />
          </View>
        )}

        <View style={[styles.infoSection, {backgroundColor: theme.colors.surface}]}>
          <Text style={[styles.infoTitle, {color: theme.colors.text}]}>💡 使用提示</Text>
          <Text style={[styles.infoText, {color: theme.colors.textSecondary}]}>
            1. 在此处添加并配置小组件样式{'\n'}
            2. 返回手机桌面，长按空白处{'\n'}
            3. 选择"倒计时"小组件并添加到桌面{'\n'}
            4. 长按已添加的小组件可选择不同配置
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  addButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
    marginTop: 16,
  },
  eventList: {
    flexDirection: 'row',
  },
  eventChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    minWidth: 100,
    maxWidth: 150,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  previewSection: {
    alignItems: 'center',
  },
  previewContainer: {
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  saveButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  widgetItem: {
    alignItems: 'center',
    marginBottom: 24,
  },
  widgetItemActions: {
    flexDirection: 'row',
    marginTop: 12,
  },
  deleteButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  infoSection: {
    borderRadius: 16,
    padding: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 24,
  },
});

export default WidgetSettingsScreen;

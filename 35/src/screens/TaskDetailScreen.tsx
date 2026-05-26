import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Checkbox,
  Button,
  TextInput,
  Menu,
  Divider,
  Chip,
  IconButton,
  useTheme,
  Dialog,
  Portal,
  FAB,
} from 'react-native-paper';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useData } from '../context/DataContext';
import { useAppTheme } from '../context/ThemeContext';
import { Task, SubTask, Priority, RepeatConfig, RepeatRule } from '../types/models';
import {
  formatDate,
  getPriorityColor,
  getPriorityText,
  getRepeatRuleText,
} from '../utils/helpers';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NotificationService } from '../services/NotificationService';
import { LocationService } from '../services/LocationService';
import { LocationReminder } from '../types/models';

interface Props {
  route: any;
  navigation: any;
}

const TaskDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { taskId } = route.params || {};
  const {
    tasks,
    updateTask,
    addSubTask,
    updateSubTask,
    deleteSubTask,
    tags,
    taskTags,
    addTagToTask,
    removeTagFromTask,
    addTag,
  } = useData();
  const { theme } = useAppTheme();
  const paperTheme = useTheme();

  const task = tasks.find(t => t.id === taskId);
  const [subTasks, setSubTasks] = useState<SubTask[]>([]);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [priorityMenuVisible, setPriorityMenuVisible] = useState(false);
  const [repeatMenuVisible, setRepeatMenuVisible] = useState(false);
  const [tagDialogVisible, setTagDialogVisible] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6200ee');
  const [newSubTaskTitle, setNewSubTaskTitle] = useState('');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [radius, setRadius] = useState(200);

  useEffect(() => {
    if (task) {
      loadSubTasks();
    }
  }, [task?.id]);

  const loadSubTasks = () => {
    if (!task) return;
    const { subTaskRepository } = require('../database/database');
    const st = subTaskRepository.getByTaskId(task.id);
    setSubTasks(st);
  };

  const handleSetLocation = async () => {
    if (!task) return;
    setLocationError(null);
    setIsGettingLocation(true);

    try {
      const hasPermission = await LocationService.requestPermissions();
      if (!hasPermission) {
        setLocationError('位置权限被拒绝，请在设置中开启');
        return;
      }

      const location = await LocationService.getCurrentPosition();
      if (!location) {
        setLocationError('获取位置失败，请稍后重试');
        return;
      }

      const locationReminder: LocationReminder = {
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
        radius: radius,
        triggered: false,
      };

      updateTask({ ...task, location: locationReminder });
    } catch (err) {
      setLocationError('获取位置时发生错误');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleClearLocation = () => {
    if (!task) return;
    updateTask({ ...task, location: undefined });
  };

  if (!task) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Paragraph>任务不存在</Paragraph>
      </View>
    );
  }

  const handleUpdateTitle = (title: string) => {
    updateTask({ ...task, title });
  };

  const handleUpdateDescription = (description: string) => {
    updateTask({ ...task, description });
  };

  const handleDatePicked = async (date: Date) => {
    updateTask({ ...task, dueDate: date.getTime() });
    setDatePickerVisible(false);
    if (task.dueDate) {
      await NotificationService.cancelNotification(task.id);
    }
    await NotificationService.scheduleTaskReminder({ ...task, dueDate: date.getTime() });
  };

  const handleClearDueDate = () => {
    updateTask({ ...task, dueDate: null });
  };

  const handleSetPriority = (priority: Priority) => {
    updateTask({ ...task, priority });
    setPriorityMenuVisible(false);
  };

  const handleSetRepeatRule = (rule: RepeatRule) => {
    updateTask({
      ...task,
      repeatConfig: { ...task.repeatConfig, rule },
    });
    setRepeatMenuVisible(false);
  };

  const handleToggleSubTask = (subTask: SubTask) => {
    const updated = { ...subTask, completed: !subTask.completed };
    updateSubTask(updated);
    setSubTasks(prev => prev.map(st => st.id === subTask.id ? updated : st));
  };

  const handleAddSubTask = () => {
    if (!newSubTaskTitle.trim()) return;
    const newSubTask: Omit<SubTask, 'id'> = {
      taskId: task.id,
      title: newSubTaskTitle.trim(),
      completed: false,
      order: subTasks.length,
    };
    const created = addSubTask(newSubTask);
    setSubTasks(prev => [...prev, created]);
    setNewSubTaskTitle('');
  };

  const handleDeleteSubTask = (id: string) => {
    deleteSubTask(id);
    setSubTasks(prev => prev.filter(st => st.id !== id));
  };

  const handleAddTagToTask = (tagId: string) => {
    addTagToTask(task.id, tagId);
  };

  const handleRemoveTagFromTask = (tagId: string) => {
    removeTagFromTask(task.id, tagId);
  };

  const handleCreateTag = () => {
    if (!newTagName.trim()) return;
    const tag = addTag(newTagName.trim(), newTagColor);
    addTagToTask(task.id, tag.id);
    setNewTagName('');
    setTagDialogVisible(false);
  };

  const taskTagIds = taskTags[task.id] || [];
  const taskTagsList = tags.filter(t => taskTagIds.includes(t.id));

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <TextInput
              value={task.title}
              onChangeText={handleUpdateTitle}
              style={styles.titleInput}
              placeholder="任务标题"
              theme={{ colors: { primary: theme.colors.primary } }}
            />
          </Card.Content>
        </Card>

        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <View style={styles.row}>
              <MaterialCommunityIcons name="clock-outline" size={20} color={paperTheme.colors.onSurfaceVariant} />
              <Title style={[styles.sectionTitle, { color: theme.colors.text, marginLeft: 8 }]}>截止时间</Title>
            </View>
            <View style={styles.dueDateContainer}>
              <Button
                mode={task.dueDate ? 'contained' : 'outlined'}
                onPress={() => setDatePickerVisible(true)}
                style={styles.dateButton}
              >
                {task.dueDate ? formatDate(task.dueDate, 'yyyy-MM-dd') : '选择日期'}
              </Button>
              {task.dueDate && (
                <Button
                  mode="text"
                  onPress={() => setTimePickerVisible(true)}
                  style={styles.dateButton}
                >
                  {formatDate(task.dueDate, 'HH:mm')}
                </Button>
              )}
              {task.dueDate && (
                <IconButton
                  icon="close"
                  size={20}
                  onPress={handleClearDueDate}
                  iconColor={paperTheme.colors.error}
                />
              )}
            </View>
          </Card.Content>
        </Card>

        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <View style={styles.row}>
              <MaterialCommunityIcons name="flag" size={20} color={paperTheme.colors.onSurfaceVariant} />
              <Title style={[styles.sectionTitle, { color: theme.colors.text, marginLeft: 8 }]}>优先级</Title>
            </View>
            <Menu
              visible={priorityMenuVisible}
              onDismiss={() => setPriorityMenuVisible(false)}
              anchor={
                <Chip
                  style={[
                    styles.priorityChip,
                    { backgroundColor: getPriorityColor(task.priority, false) + '20' },
                  ]}
                  textStyle={{ color: getPriorityColor(task.priority, false) }}
                  onPress={() => setPriorityMenuVisible(true)}
                >
                  {getPriorityText(task.priority)}优先级
                </Chip>
              }
            >
              <Menu.Item
                onPress={() => handleSetPriority('high')}
                title="高优先级"
                leadingIcon="flag"
              />
              <Menu.Item
                onPress={() => handleSetPriority('medium')}
                title="中优先级"
                leadingIcon="flag-outline"
              />
              <Menu.Item
                onPress={() => handleSetPriority('low')}
                title="低优先级"
                leadingIcon="flag-outline-variant"
              />
            </Menu>
          </Card.Content>
        </Card>

        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <View style={styles.row}>
              <MaterialCommunityIcons name="repeat" size={20} color={paperTheme.colors.onSurfaceVariant} />
              <Title style={[styles.sectionTitle, { color: theme.colors.text, marginLeft: 8 }]}>重复规则</Title>
            </View>
            <Menu
              visible={repeatMenuVisible}
              onDismiss={() => setRepeatMenuVisible(false)}
              anchor={
                <Chip
                  style={styles.repeatChip}
                  onPress={() => setRepeatMenuVisible(true)}
                >
                  {getRepeatRuleText(task.repeatConfig.rule, task.repeatConfig.weekdays)}
                </Chip>
              }
            >
              <Menu.Item onPress={() => handleSetRepeatRule('none')} title="不重复" />
              <Menu.Item onPress={() => handleSetRepeatRule('daily')} title="每天" />
              <Menu.Item onPress={() => handleSetRepeatRule('weekly')} title="每周" />
              <Menu.Item onPress={() => handleSetRepeatRule('monthly')} title="每月" />
              <Menu.Item onPress={() => handleSetRepeatRule('custom')} title="自定义工作日" />
            </Menu>
          </Card.Content>
        </Card>

        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <View style={styles.row}>
              <MaterialCommunityIcons name="map-marker-outline" size={20} color={paperTheme.colors.onSurfaceVariant} />
              <Title style={[styles.sectionTitle, { color: theme.colors.text, marginLeft: 8 }]}>位置提醒</Title>
            </View>

            {task.location ? (
              <View>
                <View style={styles.locationRow}>
                  <MaterialCommunityIcons
                    name="map-marker"
                    size={20}
                    color={theme.colors.primary}
                  />
                  <Paragraph style={[styles.locationText, { color: theme.colors.text, flex: 1, marginLeft: 8 }]}>
                    {task.location.address}
                  </Paragraph>
                </View>
                <Paragraph style={[styles.locationRadius, { color: paperTheme.colors.onSurfaceVariant, marginLeft: 28 }]}>
                  半径: {task.location.radius}米
                </Paragraph>
                <Button
                  mode="outlined"
                  onPress={handleClearLocation}
                  style={styles.clearLocationButton}
                  icon="close"
                >
                  清除位置
                </Button>
              </View>
            ) : (
              <View>
                <View style={styles.radiusRow}>
                  <Paragraph style={{ color: paperTheme.colors.onSurfaceVariant, marginRight: 8 }}>
                    触发半径:
                  </Paragraph>
                  <TextInput
                    value={String(radius)}
                    onChangeText={(v) => setRadius(Math.max(50, Math.min(2000, parseInt(v) || 200)))}
                    keyboardType="numeric"
                    style={styles.radiusInput}
                    theme={{ colors: { primary: theme.colors.primary } }}
                  />
                  <Paragraph style={{ color: paperTheme.colors.onSurfaceVariant, marginLeft: 8 }}>米</Paragraph>
                </View>
                {locationError ? (
                  <Paragraph style={[styles.locationError, { color: paperTheme.colors.error }]}>
                    {locationError}
                  </Paragraph>
                ) : null}
                <Button
                  mode="contained"
                  onPress={handleSetLocation}
                  loading={isGettingLocation}
                  disabled={isGettingLocation}
                  style={[styles.setLocationButton, { backgroundColor: theme.colors.primary }]}
                  icon="map-marker-plus"
                >
                  {isGettingLocation ? '获取位置中...' : '设置当前位置'}
                </Button>
              </View>
            )}
          </Card.Content>
        </Card>

        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <View style={styles.row}>
              <MaterialCommunityIcons name="tag-outline" size={20} color={paperTheme.colors.onSurfaceVariant} />
              <Title style={[styles.sectionTitle, { color: theme.colors.text, marginLeft: 8 }]}>标签</Title>
            </View>
            <View style={styles.tagContainer}>
              {taskTagsList.map(tag => (
                <Chip
                  key={tag.id}
                  style={[styles.tagChip, { backgroundColor: tag.color + '20' }]}
                  textStyle={{ color: tag.color }}
                  onClose={() => handleRemoveTagFromTask(tag.id)}
                >
                  {tag.name}
                </Chip>
              ))}
              <Chip
                icon="plus"
                style={styles.addTagChip}
                onPress={() => setTagDialogVisible(true)}
              >
                添加标签
              </Chip>
            </View>
          </Card.Content>
        </Card>

        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <View style={styles.row}>
              <MaterialCommunityIcons name="format-list-bulleted" size={20} color={paperTheme.colors.onSurfaceVariant} />
              <Title style={[styles.sectionTitle, { color: theme.colors.text, marginLeft: 8 }]}>子任务</Title>
            </View>
            {subTasks.map(subTask => (
              <View key={subTask.id} style={styles.subTaskRow}>
                <Checkbox
                  status={subTask.completed ? 'checked' : 'unchecked'}
                  onPress={() => handleToggleSubTask(subTask)}
                  color={theme.colors.primary}
                />
                <Paragraph
                  style={[
                    styles.subTaskTitle,
                    { color: theme.colors.text },
                    subTask.completed && styles.completedText,
                  ]}
                >
                  {subTask.title}
                </Paragraph>
                <IconButton
                  icon="delete-outline"
                  size={18}
                  onPress={() => handleDeleteSubTask(subTask.id)}
                  iconColor={paperTheme.colors.error}
                />
              </View>
            ))}
            <View style={styles.addSubTaskRow}>
              <TextInput
                value={newSubTaskTitle}
                onChangeText={setNewSubTaskTitle}
                placeholder="添加子任务"
                style={styles.subTaskInput}
                theme={{ colors: { primary: theme.colors.primary } }}
              />
              <IconButton
                icon="plus"
                size={20}
                onPress={handleAddSubTask}
                iconColor={theme.colors.primary}
              />
            </View>
          </Card.Content>
        </Card>

        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <View style={styles.row}>
              <MaterialCommunityIcons name="note-text-outline" size={20} color={paperTheme.colors.onSurfaceVariant} />
              <Title style={[styles.sectionTitle, { color: theme.colors.text, marginLeft: 8 }]}>备注</Title>
            </View>
            <TextInput
              value={task.description}
              onChangeText={handleUpdateDescription}
              placeholder="添加备注..."
              multiline
              style={styles.descriptionInput}
              theme={{ colors: { primary: theme.colors.primary } }}
            />
          </Card.Content>
        </Card>
      </ScrollView>

      <FAB
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        icon="timer-outline"
        color="#fff"
        onPress={() => navigation.navigate('Focus', { taskId: task.id })}
      />

      <DateTimePickerModal
        isVisible={datePickerVisible}
        mode="date"
        onConfirm={handleDatePicked}
        onCancel={() => setDatePickerVisible(false)}
      />
      <DateTimePickerModal
        isVisible={timePickerVisible}
        mode="time"
        onConfirm={(date) => {
          const newDate = task.dueDate ? new Date(task.dueDate) : new Date();
          newDate.setHours(date.getHours(), date.getMinutes(), 0, 0);
          handleDatePicked(newDate);
        }}
        onCancel={() => setTimePickerVisible(false)}
      />

      <Portal>
        <Dialog
          visible={tagDialogVisible}
          onDismiss={() => setTagDialogVisible(false)}
          style={{ backgroundColor: theme.colors.surface }}
        >
          <Dialog.Title style={{ color: theme.colors.text }}>添加标签</Dialog.Title>
          <Dialog.Content>
            <ScrollView horizontal style={styles.existingTags}>
              {tags.map(tag => (
                <Chip
                  key={tag.id}
                  style={[styles.tagChip, { backgroundColor: tag.color + '20', marginRight: 8 }]}
                  textStyle={{ color: tag.color }}
                  onPress={() => handleAddTagToTask(tag.id)}
                >
                  {tag.name}
                </Chip>
              ))}
            </ScrollView>
            <Divider style={styles.divider} />
            <TextInput
              label="新建标签"
              value={newTagName}
              onChangeText={setNewTagName}
              style={styles.input}
              theme={{ colors: { primary: theme.colors.primary } }}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setTagDialogVisible(false)}>取消</Button>
            <Button mode="contained" onPress={handleCreateTag}>创建</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
  },
  titleInput: {
    fontSize: 20,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateButton: {
    marginRight: 8,
  },
  priorityChip: {
    alignSelf: 'flex-start',
  },
  repeatChip: {
    alignSelf: 'flex-start',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    flex: 1,
    flexWrap: 'wrap',
  },
  locationRadius: {
    fontSize: 13,
    marginBottom: 12,
  },
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  radiusInput: {
    width: 100,
  },
  setLocationButton: {
    marginTop: 8,
  },
  clearLocationButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  locationError: {
    marginBottom: 8,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tagChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  addTagChip: {
    marginBottom: 8,
  },
  subTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  subTaskTitle: {
    flex: 1,
    marginLeft: 8,
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  addSubTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  subTaskInput: {
    flex: 1,
  },
  descriptionInput: {
    minHeight: 100,
  },
  existingTags: {
    maxHeight: 100,
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
  },
  input: {
    marginBottom: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    borderRadius: 28,
  },
});

export default TaskDetailScreen;

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import {
  FAB,
  Card,
  Title,
  Paragraph,
  Checkbox,
  Menu,
  Divider,
  Chip,
  IconButton,
  useTheme,
  Button,
  Dialog,
  Portal,
  TextInput,
} from 'react-native-paper';
import { useData } from '../context/DataContext';
import { useAppTheme } from '../context/ThemeContext';
import { Task, Priority, RepeatConfig } from '../types/models';
import {
  formatRelativeDate,
  getPriorityColor,
  getPriorityText,
  isOverdue,
  formatDate,
  getRepeatRuleText,
} from '../utils/helpers';
import DraggableFlatList, {
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Props {
  route: any;
  navigation: any;
}

const TasksScreen: React.FC<Props> = ({ route, navigation }) => {
  const { listId, title } = route.params || {};
  const { tasks, updateTask, deleteTask, addTask, updateOrder, tags, taskTags } = useData();
  const { theme } = useAppTheme();
  const paperTheme = useTheme();
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'manual' | 'dueDate' | 'priority'>('manual');
  const [menuVisible, setMenuVisible] = useState(false);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const listTasks = tasks.filter(t => t.listId === listId);

  const filteredTasks = listTasks.filter(task => {
    if (filter === 'active' && task.completed) return false;
    if (filter === 'completed' && !task.completed) return false;
    if (filterTag && !taskTags[task.id]?.includes(filterTag)) return false;
    return true;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === 'dueDate') {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate - b.dueDate;
    }
    if (sortBy === 'priority') {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return a.order - b.order;
  });

  const handleToggleComplete = (task: Task) => {
    updateTask({
      ...task,
      completed: !task.completed,
      completedAt: !task.completed ? Date.now() : null,
    });
  };

  const handleDeleteTask = (taskId: string) => {
    deleteTask(taskId);
  };

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    addTask({
      title: newTaskTitle.trim(),
      listId,
      description: '',
      dueDate: null,
      priority: 'medium' as Priority,
      completed: false,
      completedAt: null,
      order: sortedTasks.length,
      repeatConfig: { rule: 'none' } as RepeatConfig,
    });
    setNewTaskTitle('');
    setDialogVisible(false);
  };

  const handleDragEnd = useCallback(
    ({ data }: { data: Task[] }) => {
      for (let i = 0; i < data.length; i++) {
        updateOrder(data[i].id, i);
      }
    },
    [updateOrder]
  );

  const getTaskTags = (taskId: string) => {
    const tagIds = taskTags[taskId] || [];
    return tags.filter(t => tagIds.includes(t.id));
  };

  const renderTaskItem = ({ item, drag, isActive }: RenderItemParams<Task>) => (
    <TouchableOpacity
      onLongPress={drag}
      onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
      disabled={isActive}
    >
      <Card
        style={[
          styles.taskCard,
          { backgroundColor: isActive ? theme.colors.primary + '20' : theme.colors.surface },
          item.completed && styles.completedCard,
        ]}
      >
        <View style={styles.taskContent}>
          <Checkbox
            status={item.completed ? 'checked' : 'unchecked'}
            onPress={() => handleToggleComplete(item)}
            color={theme.colors.primary}
          />
          <View style={styles.taskInfo}>
            <Title
              style={[
                styles.taskTitle,
                { color: theme.colors.text },
                item.completed && styles.completedText,
              ]}
              numberOfLines={2}
            >
              {item.title}
            </Title>
            <View style={styles.taskMeta}>
              {item.dueDate && (
                <View
                  style={[
                    styles.metaItem,
                    isOverdue(item.dueDate) && !item.completed && styles.overdue,
                  ]}
                >
                  <MaterialCommunityIcons
                    name={isOverdue(item.dueDate) && !item.completed ? 'alert' : 'clock-outline'}
                    size={14}
                    color={isOverdue(item.dueDate) && !item.completed ? paperTheme.colors.error : paperTheme.colors.onSurfaceVariant}
                  />
                  <Paragraph
                    style={[
                      styles.metaText,
                      { color: isOverdue(item.dueDate) && !item.completed ? paperTheme.colors.error : paperTheme.colors.onSurfaceVariant },
                    ]}
                  >
                    {formatRelativeDate(item.dueDate)}
                  </Paragraph>
                </View>
              )}
              <View
                style={[
                  styles.priorityBadge,
                  { backgroundColor: getPriorityColor(item.priority, false) + '20' },
                ]}
              >
                <MaterialCommunityIcons
                  name="flag"
                  size={12}
                  color={getPriorityColor(item.priority, false)}
                />
                <Paragraph
                  style={[
                    styles.priorityText,
                    { color: getPriorityColor(item.priority, false) },
                  ]}
                >
                  {getPriorityText(item.priority)}
                </Paragraph>
              </View>
              {item.repeatConfig.rule !== 'none' && (
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons
                    name="repeat"
                    size={14}
                    color={paperTheme.colors.onSurfaceVariant}
                  />
                  <Paragraph
                    style={[styles.metaText, { color: paperTheme.colors.onSurfaceVariant }]}
                  >
                    {getRepeatRuleText(item.repeatConfig.rule, item.repeatConfig.weekdays)}
                  </Paragraph>
                </View>
              )}
            </View>
            {getTaskTags(item.id).length > 0 && (
              <View style={styles.tagContainer}>
                {getTaskTags(item.id).slice(0, 3).map(tag => (
                  <Chip
                    key={tag.id}
                    style={[styles.tagChip, { backgroundColor: tag.color + '20' }]}
                    textStyle={{ color: tag.color, fontSize: 10 }}
                  >
                    {tag.name}
                  </Chip>
                ))}
              </View>
            )}
          </View>
          <IconButton
            icon="delete-outline"
            size={20}
            onPress={() => handleDeleteTask(item.id)}
            iconColor={paperTheme.colors.error}
          />
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.filterButtons}>
          <Button
            mode={filter === 'all' ? 'contained' : 'text'}
            onPress={() => setFilter('all')}
            style={styles.filterButton}
          >
            全部
          </Button>
          <Button
            mode={filter === 'active' ? 'contained' : 'text'}
            onPress={() => setFilter('active')}
            style={styles.filterButton}
          >
            进行中
          </Button>
          <Button
            mode={filter === 'completed' ? 'contained' : 'text'}
            onPress={() => setFilter('completed')}
            style={styles.filterButton}
          >
            已完成
          </Button>
        </View>
        <View style={styles.headerRow}>
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <Button
                mode="text"
                icon="sort"
                onPress={() => setMenuVisible(true)}
              >
                排序
              </Button>
            }
          >
            <Menu.Item
              onPress={() => { setSortBy('manual'); setMenuVisible(false); }}
              title="手动排序"
              leadingIcon="drag"
            />
            <Menu.Item
              onPress={() => { setSortBy('dueDate'); setMenuVisible(false); }}
              title="按截止日期"
              leadingIcon="calendar"
            />
            <Menu.Item
              onPress={() => { setSortBy('priority'); setMenuVisible(false); }}
              title="按优先级"
              leadingIcon="flag"
            />
          </Menu>
          {tags.length > 0 && (
            <Menu
              visible={!!filterTag}
              onDismiss={() => setFilterTag(null)}
              anchor={
                <Button
                  mode="text"
                  icon="tag"
                  onPress={() => setFilterTag(filterTag ? null : tags[0].id)}
                >
                  {filterTag ? tags.find(t => t.id === filterTag)?.name : '标签'}
                </Button>
              }
            >
              {tags.map(tag => (
                <Menu.Item
                  key={tag.id}
                  onPress={() => setFilterTag(filterTag === tag.id ? null : tag.id)}
                  title={tag.name}
                  leadingIcon="tag"
                />
              ))}
            </Menu>
          )}
        </View>
      </View>

      {sortBy === 'manual' ? (
        <DraggableFlatList
          data={sortedTasks}
          renderItem={renderTaskItem}
          keyExtractor={(item) => item.id}
          onDragEnd={handleDragEnd}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <FlatList
          data={sortedTasks}
          renderItem={({ item, index }) => renderTaskItem({ item, drag: () => {}, isActive: false, getIndex: () => index })}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}

      <FAB
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        icon="plus"
        color="#fff"
        onPress={() => setDialogVisible(true)}
      />

      <Portal>
        <Dialog
          visible={dialogVisible}
          onDismiss={() => setDialogVisible(false)}
          style={{ backgroundColor: theme.colors.surface }}
        >
          <Dialog.Title style={{ color: theme.colors.text }}>新建任务</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="任务标题"
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
              style={styles.input}
              theme={{ colors: { primary: theme.colors.primary } }}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>取消</Button>
            <Button mode="contained" onPress={handleAddTask}>创建</Button>
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
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterButtons: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  filterButton: {
    marginRight: 8,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  taskCard: {
    marginBottom: 8,
    borderRadius: 12,
    elevation: 1,
  },
  completedCard: {
    opacity: 0.7,
  },
  taskContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  taskInfo: {
    flex: 1,
    marginLeft: 8,
  },
  taskTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  metaText: {
    fontSize: 12,
    marginLeft: 4,
  },
  overdue: {
    backgroundColor: 'transparent',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 12,
  },
  priorityText: {
    fontSize: 12,
    marginLeft: 4,
  },
  tagContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  tagChip: {
    height: 24,
    marginRight: 6,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    borderRadius: 28,
  },
  input: {
    marginBottom: 16,
  },
});

export default TasksScreen;

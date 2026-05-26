import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {
  FAB,
  Card,
  Title,
  Paragraph,
  Dialog,
  Portal,
  TextInput,
  Button,
  ActivityIndicator,
  Chip,
  useTheme,
} from 'react-native-paper';
import { useData } from '../context/DataContext';
import { useAppTheme } from '../context/ThemeContext';
import { TaskList } from '../types/models';
import { ListColors } from '../theme/themes';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Props {
  navigation: any;
}

const ListsScreen: React.FC<Props> = ({ navigation }) => {
  const { lists, isLoading, addList, refreshLists, deleteList } = useData();
  const { theme } = useAppTheme();
  const paperTheme = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editDialogVisible, setEditDialogVisible] = useState(false);
  const [editingList, setEditingList] = useState<TaskList | null>(null);
  const [newListTitle, setNewListTitle] = useState('');
  const [selectedColor, setSelectedColor] = useState(ListColors[0]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshLists();
    setRefreshing(false);
  };

  const handleAddList = async () => {
    if (!newListTitle.trim()) return;
    await addList(newListTitle.trim(), selectedColor);
    setNewListTitle('');
    setSelectedColor(ListColors[0]);
    setDialogVisible(false);
  };

  const handleEditList = async () => {
    if (!editingList || !newListTitle.trim()) return;
    await useData().updateList({ ...editingList, title: newListTitle.trim(), color: selectedColor });
    setEditDialogVisible(false);
    setEditingList(null);
  };

  const handleDeleteList = async (id: string) => {
    await deleteList(id);
  };

  const handleLongPress = (list: TaskList) => {
    setEditingList(list);
    setNewListTitle(list.title);
    setSelectedColor(list.color);
    setEditDialogVisible(true);
  };

  const renderListCard = ({ item }: { item: TaskList }) => {
    const taskCount = useData().tasks.filter(t => t.listId === item.id).length;
    const completedCount = useData().tasks.filter(t => t.listId === item.id && t.completed).length;

    return (
      <Card
        style={[styles.card, { backgroundColor: theme.colors.surface }]}
        onPress={() => navigation.navigate('Tasks', { listId: item.id, title: item.title })}
        onLongPress={() => handleLongPress(item)}
      >
        <View style={styles.cardHeader}>
          <View
            style={[styles.colorIndicator, { backgroundColor: item.color }]}
          />
          <View style={styles.cardContent}>
            <Title style={[styles.cardTitle, { color: theme.colors.text }]}>
              {item.title}
            </Title>
            <Paragraph style={[styles.cardSubtitle, { color: paperTheme.colors.onSurfaceVariant }]}>
              {completedCount}/{taskCount} 任务已完成
            </Paragraph>
          </View>
          <TouchableOpacity
            onPress={() => handleDeleteList(item.id)}
            style={styles.deleteButton}
          >
            <MaterialCommunityIcons
              name="delete-outline"
              size={24}
              color={paperTheme.colors.error}
            />
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={lists}
        renderItem={renderListCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="format-list-bulleted"
              size={80}
              color={paperTheme.colors.onSurfaceVariant}
            />
            <Paragraph style={[styles.emptyText, { color: paperTheme.colors.onSurfaceVariant }]}>
              还没有清单，点击右下角按钮创建一个
            </Paragraph>
          </View>
        }
      />

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
          <Dialog.Title style={{ color: theme.colors.text }}>新建清单</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="清单标题"
              value={newListTitle}
              onChangeText={setNewListTitle}
              style={styles.input}
              theme={{ colors: { primary: theme.colors.primary } }}
            />
            <View style={styles.colorPicker}>
              {ListColors.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => setSelectedColor(color)}
                />
              ))}
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>取消</Button>
            <Button mode="contained" onPress={handleAddList}>创建</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Portal>
        <Dialog
          visible={editDialogVisible}
          onDismiss={() => setEditDialogVisible(false)}
          style={{ backgroundColor: theme.colors.surface }}
        >
          <Dialog.Title style={{ color: theme.colors.text }}>编辑清单</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="清单标题"
              value={newListTitle}
              onChangeText={setNewListTitle}
              style={styles.input}
              theme={{ colors: { primary: theme.colors.primary } }}
            />
            <View style={styles.colorPicker}>
              {ListColors.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => setSelectedColor(color)}
                />
              ))}
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditDialogVisible(false)}>取消</Button>
            <Button mode="contained" onPress={handleEditList}>保存</Button>
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    marginBottom: 12,
    elevation: 2,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  colorIndicator: {
    width: 6,
    height: 40,
    borderRadius: 3,
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
  },
  deleteButton: {
    padding: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    borderRadius: 28,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
  },
  input: {
    marginBottom: 16,
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    margin: 6,
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
});

export default ListsScreen;

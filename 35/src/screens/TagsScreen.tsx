import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  TextInput,
  Button,
  FAB,
  Dialog,
  Portal,
  useTheme,
  IconButton,
  Chip,
} from 'react-native-paper';
import { useData } from '../context/DataContext';
import { useAppTheme } from '../context/ThemeContext';
import { Tag } from '../types/models';
import { ListColors } from '../theme/themes';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Props {
  navigation: any;
}

const TagsScreen: React.FC<Props> = ({ navigation }) => {
  const { tags, addTag, updateTag, deleteTag, taskTags, tasks } = useData();
  const { theme } = useAppTheme();
  const paperTheme = useTheme();

  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [tagName, setTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(ListColors[0]);

  const handleAddTag = () => {
    setEditingTag(null);
    setTagName('');
    setSelectedColor(ListColors[0]);
    setDialogVisible(true);
  };

  const handleEditTag = (tag: Tag) => {
    setEditingTag(tag);
    setTagName(tag.name);
    setSelectedColor(tag.color);
    setDialogVisible(true);
  };

  const handleSaveTag = async () => {
    if (!tagName.trim()) return;

    if (editingTag) {
      await updateTag({ ...editingTag, name: tagName.trim(), color: selectedColor });
    } else {
      await addTag(tagName.trim(), selectedColor);
    }

    setDialogVisible(false);
  };

  const handleDeleteTag = async (tag: Tag) => {
    await deleteTag(tag.id);
  };

  const getTaskCountForTag = (tagId: string) => {
    return tasks.filter(t => taskTags[t.id]?.includes(tagId)).length;
  };

  const renderTagItem = ({ item }: { item: Tag }) => (
    <Card style={[styles.tagCard, { backgroundColor: theme.colors.surface }]}>
      <Card.Content style={styles.tagContent}>
        <View style={[styles.colorDot, { backgroundColor: item.color }]} />
        <View style={styles.tagInfo}>
          <Title style={[styles.tagName, { color: theme.colors.text }]}>
            {item.name}
          </Title>
          <Paragraph style={{ color: paperTheme.colors.onSurfaceVariant }}>
            {getTaskCountForTag(item.id)} 个任务
          </Paragraph>
        </View>
        <View style={styles.tagActions}>
          <IconButton
            icon="pencil"
            size={20}
            onPress={() => handleEditTag(item)}
            iconColor={theme.colors.primary}
          />
          <IconButton
            icon="delete"
            size={20}
            onPress={() => handleDeleteTag(item)}
            iconColor={paperTheme.colors.error}
          />
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={tags}
        renderItem={renderTagItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="tag-outline"
              size={80}
              color={paperTheme.colors.onSurfaceVariant}
            />
            <Paragraph style={[styles.emptyText, { color: paperTheme.colors.onSurfaceVariant }]}>
              还没有标签，点击右下角按钮创建
            </Paragraph>
          </View>
        }
      />

      <FAB
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        icon="plus"
        color="#fff"
        onPress={handleAddTag}
      />

      <Portal>
        <Dialog
          visible={dialogVisible}
          onDismiss={() => setDialogVisible(false)}
          style={{ backgroundColor: theme.colors.surface }}
        >
          <Dialog.Title style={{ color: theme.colors.text }}>
            {editingTag ? '编辑标签' : '新建标签'}
          </Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="标签名称"
              value={tagName}
              onChangeText={setTagName}
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
            <Button mode="contained" onPress={handleSaveTag}>保存</Button>
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
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  tagCard: {
    marginBottom: 8,
    borderRadius: 12,
    elevation: 2,
  },
  tagContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 16,
  },
  tagInfo: {
    flex: 1,
  },
  tagName: {
    fontSize: 16,
    marginBottom: 2,
  },
  tagActions: {
    flexDirection: 'row',
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

export default TagsScreen;

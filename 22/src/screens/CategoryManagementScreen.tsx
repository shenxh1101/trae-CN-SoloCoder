import React, {useState} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  FlatList,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList, Category} from '@types';
import {useTheme, presetColors} from '@theme';
import {useAppDispatch, useAppSelector} from '@hooks';
import {addCategory, updateCategory, deleteCategory} from '@store/eventsSlice';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'CategoryManagement'>;

const CategoryManagementScreen: React.FC = () => {
  const theme = useTheme();
  useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  const {categories, events} = useAppSelector(state => state.events);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(presetColors[0]);

  const getEventCountForCategory = (categoryId: string) => {
    return events.filter(e => e.categoryId === categoryId && !e.isArchived).length;
  };

  const resetForm = () => {
    setName('');
    setSelectedColor(presetColors[0]);
    setEditingCategory(null);
    setShowAddForm(false);
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('请输入分类名称', '分类名称不能为空');
      return;
    }

    if (editingCategory) {
      dispatch(
        updateCategory({
          id: editingCategory.id,
          updates: {
            name: name.trim(),
            color: selectedColor,
          },
        }),
      );
      Alert.alert('更新成功', '分类已更新');
    } else {
      dispatch(
        addCategory({
          name: name.trim(),
          color: selectedColor,
        }),
      );
      Alert.alert('添加成功', '新分类已添加');
    }

    resetForm();
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setName(category.name);
    setSelectedColor(category.color);
    setShowAddForm(true);
  };

  const handleDelete = (category: Category) => {
    const eventCount = getEventCountForCategory(category.id);
    if (eventCount > 0) {
      Alert.alert(
        '无法删除',
        `该分类下有 ${eventCount} 个倒计时事件，请先删除或移动这些事件。`,
      );
      return;
    }

    Alert.alert('删除确认', `确定要删除分类「${category.name}」吗？`, [
      {text: '取消', style: 'cancel'},
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          dispatch(deleteCategory(category.id));
          Alert.alert('删除成功', '分类已删除');
        },
      },
    ]);
  };

  const renderCategoryItem = ({item}: {item: Category}) => {
    const eventCount = getEventCountForCategory(item.id);

    return (
      <View
        style={[
          styles.categoryItem,
          {backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border},
        ]}>
        <View style={styles.categoryLeft}>
          <View
            style={[
              styles.categoryColorDot,
              {backgroundColor: item.color},
            ]}
          />
          <View>
            <Text style={[styles.categoryName, {color: theme.colors.text}]}>
              {item.name}
            </Text>
            <Text style={[styles.categoryCount, {color: theme.colors.textSecondary}]}>
              {eventCount} 个事件
            </Text>
          </View>
        </View>
        <View style={styles.categoryActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEdit(item)}>
            <Text style={[styles.actionText, {color: theme.colors.primary}]}>编辑</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDelete(item)}>
            <Text style={[styles.actionText, {color: '#EF4444'}]}>删除</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, {color: theme.colors.text}]}>分类管理</Text>
          <Text style={[styles.subtitle, {color: theme.colors.textSecondary}]}>
            管理你的倒计时分类
          </Text>
        </View>

        {!showAddForm && (
          <TouchableOpacity
            style={[styles.addButton, {backgroundColor: theme.colors.primary}]}
            onPress={() => setShowAddForm(true)}>
            <Text style={styles.addButtonText}>+ 添加新分类</Text>
          </TouchableOpacity>
        )}

        {showAddForm && (
          <View style={[styles.formSection, {backgroundColor: theme.colors.surface}]}>
            <Text style={[styles.formTitle, {color: theme.colors.text}]}>
              {editingCategory ? '编辑分类' : '添加新分类'}
            </Text>

            <Text style={[styles.label, {color: theme.colors.text}]}>分类名称</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              value={name}
              onChangeText={setName}
              placeholder="输入分类名称"
              placeholderTextColor={theme.colors.textSecondary}
              maxLength={20}
            />

            <Text style={[styles.label, {color: theme.colors.text}]}>选择颜色</Text>
            <View style={styles.colorGrid}>
              {presetColors.map(color => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    {
                      backgroundColor: color,
                      borderWidth: selectedColor === color ? 3 : 2,
                      borderColor: selectedColor === color ? '#FFFFFF' : 'transparent',
                    },
                  ]}
                  onPress={() => setSelectedColor(color)}
                />
              ))}
            </View>

            <View style={styles.formButtons}>
              <TouchableOpacity
                style={[styles.cancelButton, {borderColor: theme.colors.border}]}
                onPress={resetForm}>
                <Text style={{color: theme.colors.textSecondary}}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, {backgroundColor: theme.colors.primary}]}
                onPress={handleSave}>
                <Text style={styles.saveButtonText}>
                  {editingCategory ? '保存' : '添加'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={[styles.section, {backgroundColor: theme.colors.surface}]}>
          <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>
            全部分类 ({categories.length})
          </Text>
          <FlatList
            data={categories}
            keyExtractor={item => item.id}
            renderItem={renderCategoryItem}
            scrollEnabled={false}
          />
        </View>

        <View style={[styles.infoSection, {backgroundColor: theme.colors.surface}]}>
          <Text style={[styles.infoTitle, {color: theme.colors.text}]}>💡 使用提示</Text>
          <Text style={[styles.infoText, {color: theme.colors.textSecondary}]}>
            1. 点击右上角「+」添加新分类{'\n'}
            2. 每种分类可以设置不同的颜色标记{'\n'}
            3. 包含事件的分类无法直接删除{'\n'}
            4. 分类用于筛选和统计分析
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
  formSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  formTitle: {
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
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  section: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    padding: 16,
    paddingBottom: 8,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryColorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
  },
  categoryCount: {
    fontSize: 12,
    marginTop: 2,
  },
  categoryActions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionText: {
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

export default CategoryManagementScreen;

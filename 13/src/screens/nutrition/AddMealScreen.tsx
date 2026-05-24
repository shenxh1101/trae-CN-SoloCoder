import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  Platform,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {useNavigation, useRoute} from '@react-navigation/native';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {saveMealLog, uploadFoodImage, recognizeFood} from '@redux/slices/nutritionSlice';
import {MealLog, FoodItem} from '@types/index';
import {AppDispatch, RootState} from '@redux/store';

const AddMealScreen = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const route = useRoute();
  const mealType = route.params?.mealType || 'lunch';

  const userProfile = useSelector((state: RootState) => state.user.profile);
  const {customFoods, isLoading} = useSelector(
    (state: RootState) => state.nutrition
  );

  const [foodImage, setFoodImage] = useState<string | null>(null);
  const [foodItems, setFoodItems] = useState<Array<{food: FoodItem; quantity: number}>>([]);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFoodSearch, setShowFoodSearch] = useState(false);

  const mealTypeNames: Record<string, string> = {
    breakfast: '早餐',
    lunch: '午餐',
    dinner: '晚餐',
    snack: '加餐',
  };

  const commonFoods: FoodItem[] = [
    {
      id: '1',
      name: '白米饭',
      calories: 130,
      protein: 2.7,
      carbs: 28,
      fat: 0.3,
      serving: '100g',
      userId: '',
    },
    {
      id: '2',
      name: '鸡胸肉',
      calories: 165,
      protein: 31,
      carbs: 0,
      fat: 3.6,
      serving: '100g',
      userId: '',
    },
    {
      id: '3',
      name: '鸡蛋',
      calories: 155,
      protein: 13,
      carbs: 1.1,
      fat: 11,
      serving: '1个(50g)',
      userId: '',
    },
    {
      id: '4',
      name: '苹果',
      calories: 52,
      protein: 0.3,
      carbs: 14,
      fat: 0.2,
      serving: '1个(180g)',
      userId: '',
    },
    {
      id: '5',
      name: '香蕉',
      calories: 89,
      protein: 1.1,
      carbs: 23,
      fat: 0.3,
      serving: '1根(120g)',
      userId: '',
    },
    {
      id: '6',
      name: '牛奶',
      calories: 42,
      protein: 3.4,
      carbs: 5,
      fat: 1,
      serving: '100ml',
      userId: '',
    },
    ...customFoods,
  ];

  const filteredFoods = commonFoods.filter((food) =>
    food.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTakePhoto = async () => {
    try {
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1024,
        maxHeight: 1024,
      });

      if (result.assets && result.assets[0].uri) {
        const imageUri = result.assets[0].uri;
        setFoodImage(imageUri);
        setIsRecognizing(true);

        try {
          const uploadResult = await dispatch(
            uploadFoodImage({imageUri, userId: userProfile?.id || ''})
          ).unwrap();

          if (uploadResult.imageUrl) {
            const recognitionResult = await dispatch(
              recognizeFood({imageUrl: uploadResult.imageUrl})
            ).unwrap();

            if (recognitionResult.foods && recognitionResult.foods.length > 0) {
              setFoodItems(
                recognitionResult.foods.map((f: FoodItem) => ({
                  food: f,
                  quantity: 1,
                }))
              );
              Alert.alert(
                '识别成功',
                `识别出 ${recognitionResult.foods.length} 种食物，请确认分量`
              );
            } else {
              Alert.alert('未能识别食物', '请手动添加食物');
            }
          }
        } catch (err: any) {
          Alert.alert('识别失败', err.message || '请手动添加食物');
        } finally {
          setIsRecognizing(false);
        }
      }
    } catch (err: any) {
      Alert.alert('拍照失败', err.message);
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1024,
        maxHeight: 1024,
      });

      if (result.assets && result.assets[0].uri) {
        const imageUri = result.assets[0].uri;
        setFoodImage(imageUri);
        setIsRecognizing(true);

        try {
          const uploadResult = await dispatch(
            uploadFoodImage({imageUri, userId: userProfile?.id || ''})
          ).unwrap();

          if (uploadResult.imageUrl) {
            const recognitionResult = await dispatch(
              recognizeFood({imageUrl: uploadResult.imageUrl})
            ).unwrap();

            if (recognitionResult.foods && recognitionResult.foods.length > 0) {
              setFoodItems(
                recognitionResult.foods.map((f: FoodItem) => ({
                  food: f,
                  quantity: 1,
                }))
              );
              Alert.alert(
                '识别成功',
                `识别出 ${recognitionResult.foods.length} 种食物，请确认分量`
              );
            } else {
              Alert.alert('未能识别食物', '请手动添加食物');
            }
          }
        } catch (err: any) {
          Alert.alert('识别失败', err.message || '请手动添加食物');
        } finally {
          setIsRecognizing(false);
        }
      }
    } catch (err: any) {
      Alert.alert('选择图片失败', err.message);
    }
  };

  const addFoodItem = (food: FoodItem) => {
    const existingIndex = foodItems.findIndex(
      (item) => item.food.id === food.id
    );

    if (existingIndex >= 0) {
      const updatedItems = [...foodItems];
      updatedItems[existingIndex].quantity += 1;
      setFoodItems(updatedItems);
    } else {
      setFoodItems([...foodItems, {food, quantity: 1}]);
    }
    setShowFoodSearch(false);
    setSearchQuery('');
  };

  const updateQuantity = (index: number, delta: number) => {
    const updatedItems = [...foodItems];
    updatedItems[index].quantity = Math.max(
      0.5,
      updatedItems[index].quantity + delta
    );
    setFoodItems(updatedItems);
  };

  const removeFoodItem = (index: number) => {
    const updatedItems = foodItems.filter((_, i) => i !== index);
    setFoodItems(updatedItems);
  };

  const calculateTotalNutrition = () => {
    return foodItems.reduce(
      (total, item) => ({
        calories:
          total.calories + item.food.calories * item.quantity,
        protein:
          total.protein + item.food.protein * item.quantity,
        carbs:
          total.carbs + item.food.carbs * item.quantity,
        fat: total.fat + item.food.fat * item.quantity,
      }),
      {calories: 0, protein: 0, carbs: 0, fat: 0}
    );
  };

  const handleSave = async () => {
    if (foodItems.length === 0) {
      Alert.alert('提示', '请至少添加一种食物');
      return;
    }

    const total = calculateTotalNutrition();

    const mealLog: Omit<MealLog, 'id'> = {
      userId: userProfile?.id || '',
      mealType: mealType as any,
      date: new Date(),
      foodItems: foodItems.map((item) => ({
        ...item.food,
        quantity: item.quantity,
      })),
      totalCalories: total.calories,
      totalProtein: total.protein,
      totalCarbs: total.carbs,
      totalFat: total.fat,
      imageUrl: foodImage,
    };

    try {
      await dispatch(saveMealLog(mealLog)).unwrap();
      Alert.alert('保存成功', '饮食记录已保存');
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('保存失败', err.message || '请稍后重试');
    }
  };

  const totalNutrition = calculateTotalNutrition();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>添加{mealTypeNames[mealType]}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.imageSection}>
          {foodImage ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{uri: foodImage}} style={styles.foodImage} />
              <TouchableOpacity
                style={styles.changePhotoButton}
                onPress={() => setFoodImage(null)}>
                <Text style={styles.changePhotoText}>更换照片</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.placeholderText}>📷</Text>
              <Text style={styles.placeholderSubtitle}>
                拍照自动识别食物热量
              </Text>
              <View style={styles.imageButtons}>
                <TouchableOpacity
                  style={styles.imageButton}
                  onPress={handleTakePhoto}
                  disabled={isRecognizing}>
                  <Text style={styles.imageButtonText}>
                    {isRecognizing ? '识别中...' : '拍照'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.imageButton, styles.galleryButton]}
                  onPress={handlePickImage}
                  disabled={isRecognizing}>
                  <Text style={[styles.imageButtonText, styles.galleryButtonText]}>
                    从相册选择
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <View style={styles.foodListSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>食物列表</Text>
            <TouchableOpacity
              style={styles.addFoodButton}
              onPress={() => setShowFoodSearch(!showFoodSearch)}>
              <Text style={styles.addFoodButtonText}>+ 添加食物</Text>
            </TouchableOpacity>
          </View>

          {showFoodSearch && (
            <View style={styles.foodSearchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="搜索食物..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#999"
              />
              <ScrollView style={styles.foodSearchResults} nestedScrollEnabled>
                {filteredFoods.map((food) => (
                  <TouchableOpacity
                    key={food.id}
                    style={styles.foodSearchItem}
                    onPress={() => addFoodItem(food)}>
                    <View style={styles.foodSearchItemInfo}>
                      <Text style={styles.foodSearchItemName}>
                        {food.name}
                      </Text>
                      <Text style={styles.foodSearchItemDetail}>
                        {food.serving} | {food.calories}千卡
                      </Text>
                    </View>
                    <Text style={styles.foodSearchItemCalories}>
                      +
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {foodItems.length === 0 ? (
            <View style={styles.emptyFoodList}>
              <Text style={styles.emptyText}>还没有添加食物</Text>
              <Text style={styles.emptySubtext}>
                点击上方按钮拍照或手动添加
              </Text>
            </View>
          ) : (
            <View style={styles.foodItemsList}>
              {foodItems.map((item, index) => (
                <View key={index} style={styles.foodItem}>
                  <View style={styles.foodItemInfo}>
                    <Text style={styles.foodItemName}>
                      {item.food.name}
                    </Text>
                    <Text style={styles.foodItemDetail}>
                      {item.food.serving} | {Math.round(item.food.calories * item.quantity)}千卡
                    </Text>
                  </View>
                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => updateQuantity(index, -0.5)}>
                      <Text style={styles.quantityButtonText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.quantityText}>
                      {item.quantity}
                    </Text>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => updateQuantity(index, 0.5)}>
                      <Text style={styles.quantityButtonText}>+</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeFoodItem(index)}>
                      <Text style={styles.removeButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {foodItems.length > 0 && (
          <View style={styles.nutritionSummary}>
            <Text style={styles.summaryTitle}>营养合计</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {Math.round(totalNutrition.calories)}
                </Text>
                <Text style={styles.summaryLabel}>千卡</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {Math.round(totalNutrition.protein)}g
                </Text>
                <Text style={styles.summaryLabel}>蛋白质</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {Math.round(totalNutrition.carbs)}g
                </Text>
                <Text style={styles.summaryLabel}>碳水</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {Math.round(totalNutrition.fat)}g
                </Text>
                <Text style={styles.summaryLabel}>脂肪</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={[
          styles.saveButton,
          foodItems.length === 0 && styles.disabledSaveButton,
        ]}
        onPress={handleSave}
        disabled={foodItems.length === 0 || isLoading}>
        <Text style={styles.saveButtonText}>
          {isLoading ? '保存中...' : '保存记录'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    padding: 15,
    paddingTop: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 24,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  imageSection: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  imagePreviewContainer: {
    position: 'relative',
  },
  foodImage: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
  },
  changePhotoButton: {
    position: 'absolute',
    bottom: 15,
    right: 15,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  changePhotoText: {
    color: '#fff',
    fontSize: 14,
  },
  imagePlaceholder: {
    padding: 40,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 60,
    marginBottom: 15,
  },
  placeholderSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  imageButtons: {
    flexDirection: 'row',
  },
  imageButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 10,
    marginHorizontal: 5,
  },
  galleryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  imageButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  galleryButtonText: {
    color: '#4CAF50',
  },
  foodListSection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  addFoodButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e8f5e9',
  },
  addFoodButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '500',
  },
  foodSearchContainer: {
    marginBottom: 20,
  },
  searchInput: {
    height: 45,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  foodSearchResults: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
  },
  foodSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  foodSearchItemInfo: {
    flex: 1,
  },
  foodSearchItemName: {
    fontSize: 16,
    color: '#333',
  },
  foodSearchItemDetail: {
    fontSize: 12,
    color: '#999',
    marginTop: 3,
  },
  foodSearchItemCalories: {
    fontSize: 24,
    color: '#4CAF50',
    fontWeight: '300',
  },
  emptyFoodList: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
  },
  foodItemsList: {
    marginBottom: 10,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  foodItemInfo: {
    flex: 1,
  },
  foodItemName: {
    fontSize: 16,
    color: '#333',
  },
  foodItemDetail: {
    fontSize: 12,
    color: '#999',
    marginTop: 3,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
  },
  quantityButtonText: {
    fontSize: 18,
    color: '#666',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    minWidth: 30,
    textAlign: 'center',
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffebee',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  removeButtonText: {
    fontSize: 20,
    color: '#f44336',
  },
  nutritionSummary: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 100,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  saveButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#4CAF50',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledSaveButton: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddMealScreen;

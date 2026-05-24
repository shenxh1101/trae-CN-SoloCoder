import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import {LineChart} from 'react-native-chart-kit';
import {Dimensions} from 'react-native';
import {fetchMealLogs, addCustomFood} from '@redux/slices/nutritionSlice';
import {recommendationService} from '@services/recommendationService';
import {MealLog, FoodItem} from '@types/index';
import {AppDispatch, RootState} from '@redux/store';

const screenWidth = Dimensions.get('window').width;

const NutritionScreen = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const userProfile = useSelector((state: RootState) => state.user.profile);
  const {mealLogs, customFoods, isLoading} = useSelector(
    (state: RootState) => state.nutrition
  );

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'foods'>('today');

  useEffect(() => {
    dispatch(fetchMealLogs());
  }, [dispatch]);

  const nutritionRecommendations = userProfile
    ? recommendationService.calculateNutritionNeeds(userProfile)
    : {calories: 2000, protein: 120, carbs: 250, fat: 65};

  const todayMeals = mealLogs.filter(
    (log: MealLog) =>
      new Date(log.date).toDateString() === selectedDate.toDateString()
  );

  const totalCalories = todayMeals.reduce(
    (sum: number, log: MealLog) => sum + log.totalCalories,
    0
  );
  const totalProtein = todayMeals.reduce(
    (sum: number, log: MealLog) => sum + (log.totalProtein || 0),
    0
  );
  const totalCarbs = todayMeals.reduce(
    (sum: number, log: MealLog) => sum + (log.totalCarbs || 0),
    0
  );
  const totalFat = todayMeals.reduce(
    (sum: number, log: MealLog) => sum + (log.totalFat || 0),
    0
  );

  const getWeeklyCalorieData = () => {
    const weekData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayMeals = mealLogs.filter(
        (log: MealLog) =>
          new Date(log.date).toDateString() === date.toDateString()
      );
      const dayCalories = dayMeals.reduce(
        (sum: number, log: MealLog) => sum + log.totalCalories,
        0
      );
      weekData.push(dayCalories);
    }
    return weekData;
  };

  const getMealTypeEmoji = (type: string): string => {
    const emojis: Record<string, string> = {
      breakfast: '🍳',
      lunch: '🍱',
      dinner: '🍽️',
      snack: '🍎',
    };
    return emojis[type] || '🍴';
  };

  const getMealTypeName = (type: string): string => {
    const names: Record<string, string> = {
      breakfast: '早餐',
      lunch: '午餐',
      dinner: '晚餐',
      snack: '加餐',
    };
    return names[type] || '餐食';
  };

  const getProgressPercent = (current: number, goal: number): number => {
    return Math.min((current / goal) * 100, 100);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>饮食记录</Text>
        <Text style={styles.headerSubtitle}>
          {selectedDate.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'today' && styles.activeTab]}
          onPress={() => setActiveTab('today')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'today' && styles.activeTabText,
            ]}>
            今日
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'week' && styles.activeTab]}
          onPress={() => setActiveTab('week')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'week' && styles.activeTabText,
            ]}>
            周统计
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'foods' && styles.activeTab]}
          onPress={() => setActiveTab('foods')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'foods' && styles.activeTabText,
            ]}>
            食物库
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'today' && (
          <>
            <View style={styles.calorieCard}>
              <View style={styles.calorieGoal}>
                <Text style={styles.calorieValue}>{Math.round(totalCalories)}</Text>
                <Text style={styles.calorieLabel}>
                  / {nutritionRecommendations.calories} 千卡
                </Text>
              </View>
              <View style={styles.calorieProgressBar}>
                <View
                  style={[
                    styles.calorieProgressFill,
                    {width: `${getProgressPercent(totalCalories, nutritionRecommendations.calories)}%`},
                  ]}
                />
              </View>
              <Text style={styles.calorieRemaining}>
                还可摄入 {Math.max(0, nutritionRecommendations.calories - totalCalories)} 千卡
              </Text>
            </View>

            <View style={styles.macroContainer}>
              <View style={styles.macroItem}>
                <View style={styles.macroHeader}>
                  <Text style={styles.macroName}>蛋白质</Text>
                  <Text style={styles.macroValue}>
                    {Math.round(totalProtein)}g / {nutritionRecommendations.protein}g
                  </Text>
                </View>
                <View style={styles.macroProgressBar}>
                  <View
                    style={[
                      styles.macroProgressFill,
                      styles.proteinColor,
                      {width: `${getProgressPercent(totalProtein, nutritionRecommendations.protein)}%`},
                    ]}
                  />
                </View>
              </View>
              <View style={styles.macroItem}>
                <View style={styles.macroHeader}>
                  <Text style={styles.macroName}>碳水</Text>
                  <Text style={styles.macroValue}>
                    {Math.round(totalCarbs)}g / {nutritionRecommendations.carbs}g
                  </Text>
                </View>
                <View style={styles.macroProgressBar}>
                  <View
                    style={[
                      styles.macroProgressFill,
                      styles.carbsColor,
                      {width: `${getProgressPercent(totalCarbs, nutritionRecommendations.carbs)}%`},
                    ]}
                  />
                </View>
              </View>
              <View style={styles.macroItem}>
                <View style={styles.macroHeader}>
                  <Text style={styles.macroName}>脂肪</Text>
                  <Text style={styles.macroValue}>
                    {Math.round(totalFat)}g / {nutritionRecommendations.fat}g
                  </Text>
                </View>
                <View style={styles.macroProgressBar}>
                  <View
                    style={[
                      styles.macroProgressFill,
                      styles.fatColor,
                      {width: `${getProgressPercent(totalFat, nutritionRecommendations.fat)}%`},
                    ]}
                  />
                </View>
              </View>
            </View>

            <View style={styles.mealsContainer}>
              {['breakfast', 'lunch', 'dinner', 'snack'].map((mealType) => {
                const mealsOfType = todayMeals.filter(
                  (m: MealLog) => m.mealType === mealType
                );
                const typeCalories = mealsOfType.reduce(
                  (sum: number, m: MealLog) => sum + m.totalCalories,
                  0
                );

                return (
                  <View key={mealType} style={styles.mealSection}>
                    <View style={styles.mealHeader}>
                      <Text style={styles.mealEmoji}>{getMealTypeEmoji(mealType)}</Text>
                      <Text style={styles.mealTypeName}>
                        {getMealTypeName(mealType)}
                      </Text>
                      <Text style={styles.mealTypeCalories}>
                        {Math.round(typeCalories)} 千卡
                      </Text>
                      <TouchableOpacity
                        style={styles.addMealButton}
                        onPress={() =>
                          navigation.navigate('AddMeal', {mealType})
                        }>
                        <Text style={styles.addMealButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
                    {mealsOfType.map((meal: MealLog) => (
                      <View key={meal.id} style={styles.mealItem}>
                        <View style={styles.mealItemInfo}>
                          <Text style={styles.mealItemName}>
                            {meal.foodItems.map((f) => f.name).join(', ')}
                          </Text>
                          <Text style={styles.mealItemDetail}>
                            {meal.foodItems.length} 种食物
                          </Text>
                        </View>
                        <Text style={styles.mealItemCalories}>
                          {Math.round(meal.totalCalories)} 千卡
                        </Text>
                      </View>
                    ))}
                  </View>
                );
              })}
            </View>
          </>
        )}

        {activeTab === 'week' && (
          <View style={styles.weekContainer}>
            <Text style={styles.sectionTitle}>本周热量摄入趋势</Text>
            <LineChart
              data={{
                labels: ['一', '二', '三', '四', '五', '六', '日'],
                datasets: [
                  {
                    data: getWeeklyCalorieData(),
                  },
                ],
              }}
              width={screenWidth - 40}
              height={220}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: '6',
                  strokeWidth: '2',
                  stroke: '#4CAF50',
                },
              }}
              bezier
              style={styles.chart}
            />
            <View style={styles.weekSummary}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>
                  {Math.round(
                    getWeeklyCalorieData().reduce((a: number, b: number) => a + b, 0) /
                      7
                  )}
                </Text>
                <Text style={styles.summaryLabel}>日均摄入(千卡)</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>
                  {todayMeals.length > 0 ? Math.round(totalCalories) : 0}
                </Text>
                <Text style={styles.summaryLabel}>今日摄入(千卡)</Text>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'foods' && (
          <View style={styles.foodsContainer}>
            <TouchableOpacity
              style={styles.addCustomFoodButton}
              onPress={() => navigation.navigate('AddCustomFood')}>
              <Text style={styles.addCustomFoodText}>+ 添加自定义食物</Text>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>我的食物库</Text>
            {customFoods.map((food: FoodItem) => (
              <View key={food.id} style={styles.foodItem}>
                <View style={styles.foodItemInfo}>
                  <Text style={styles.foodItemName}>{food.name}</Text>
                  <Text style={styles.foodItemDetail}>
                    {food.serving} | 蛋白质:{food.protein}g 碳水:{food.carbs}g 脂肪:{food.fat}g
                  </Text>
                </View>
                <Text style={styles.foodItemCalories}>
                  {food.calories} 千卡
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddMeal')}>
        <Text style={styles.fabText}>📷</Text>
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
    backgroundColor: '#4CAF50',
    padding: 20,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#4CAF50',
  },
  tabText: {
    fontSize: 14,
    color: '#999',
  },
  activeTabText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  calorieCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  calorieGoal: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 15,
  },
  calorieValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  calorieLabel: {
    fontSize: 16,
    color: '#999',
    marginLeft: 5,
  },
  calorieProgressBar: {
    width: '100%',
    height: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
    marginBottom: 10,
  },
  calorieProgressFill: {
    height: 12,
    backgroundColor: '#4CAF50',
    borderRadius: 6,
  },
  calorieRemaining: {
    fontSize: 14,
    color: '#666',
  },
  macroContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  macroItem: {
    marginBottom: 15,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  macroName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  macroValue: {
    fontSize: 14,
    color: '#666',
  },
  macroProgressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
  macroProgressFill: {
    height: 8,
    borderRadius: 4,
  },
  proteinColor: {
    backgroundColor: '#FF6B6B',
  },
  carbsColor: {
    backgroundColor: '#4ECDC4',
  },
  fatColor: {
    backgroundColor: '#FFE66D',
  },
  mealsContainer: {
    marginBottom: 20,
  },
  mealSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fafafa',
  },
  mealEmoji: {
    fontSize: 24,
    marginRight: 10,
  },
  mealTypeName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  mealTypeCalories: {
    fontSize: 14,
    color: '#4CAF50',
    marginRight: 15,
  },
  addMealButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMealButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  mealItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  mealItemInfo: {
    flex: 1,
  },
  mealItemName: {
    fontSize: 14,
    color: '#333',
  },
  mealItemDetail: {
    fontSize: 12,
    color: '#999',
    marginTop: 3,
  },
  mealItemCalories: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4CAF50',
  },
  weekContainer: {
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
    alignSelf: 'flex-start',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  weekSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
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
    textAlign: 'center',
  },
  foodsContainer: {
    paddingBottom: 100,
  },
  addCustomFoodButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    marginBottom: 20,
  },
  addCustomFoodText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '500',
  },
  foodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  foodItemInfo: {
    flex: 1,
  },
  foodItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  foodItemDetail: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  foodItemCalories: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  fabText: {
    fontSize: 28,
  },
});

export default NutritionScreen;

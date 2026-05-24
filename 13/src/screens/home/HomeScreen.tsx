import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import {LineChart} from 'react-native-chart-kit';
import {Dimensions} from 'react-native';
import {fetchTodayActivity, fetchWeeklyActivities, updateSteps, setIsTracking, updateLocalSteps} from '@redux/slices/activitySlice';
import {fetchWorkouts} from '@redux/slices/workoutSlice';
import {fetchMealLogs} from '@redux/slices/nutritionSlice';
import {sensorService} from '@services/sensorService';
import {recommendationService} from '@services/recommendationService';
import {AppDispatch, RootState} from '@redux/store';

const HomeScreen = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);

  const userProfile = useSelector((state: RootState) => state.user.profile);
  const todayActivity = useSelector((state: RootState) => state.activity.todayActivity);
  const weeklyActivities = useSelector((state: RootState) => state.activity.weeklyActivities);
  const isTracking = useSelector((state: RootState) => state.activity.isTracking);
  const workouts = useSelector((state: RootState) => state.workout.workouts);
  const mealLogs = useSelector((state: RootState) => state.nutrition.mealLogs);
  const todayWaterAmount = useSelector((state: RootState) => state.notification.todayWaterAmount);
  const waterGoal = useSelector((state: RootState) => state.notification.waterGoal);

  const loadData = useCallback(async () => {
    if (userProfile?.id) {
      await Promise.all([
        dispatch(fetchTodayActivity(userProfile.id)).unwrap(),
        dispatch(fetchWeeklyActivities(userProfile.id)).unwrap(),
        dispatch(fetchWorkouts(userProfile.id)).unwrap(),
        dispatch(fetchMealLogs({userId: userProfile.id, date: new Date()})).unwrap(),
      ]);
    }
  }, [dispatch, userProfile?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (userProfile?.weight) {
      sensorService.setUserWeight(userProfile.weight);
    }
  }, [userProfile?.weight]);

  const handleSensorUpdate = useCallback((data: {
    steps: number;
    walkingSteps: number;
    runningSteps: number;
    distance: number;
    calories: number;
  }) => {
    dispatch(updateLocalSteps(data));
    if (todayActivity?.id) {
      dispatch(updateSteps({
        activityId: todayActivity.id,
        ...data,
      }));
    }
  }, [dispatch, todayActivity?.id]);

  const toggleTracking = () => {
    if (isTracking) {
      sensorService.stopTracking();
      dispatch(setIsTracking(false));
    } else {
      sensorService.startTracking(handleSensorUpdate);
      dispatch(setIsTracking(true));
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const calculateTotalCalories = () => {
    return mealLogs.reduce((sum, meal) => sum + meal.totalCalories, 0);
  };

  const getStepGoal = () => {
    return 10000;
  };

  const getWeeklyChartData = () => {
    const days = ['一', '二', '三', '四', '五', '六', '日'];
    return {
      labels: days,
      datasets: [
        {
          data: weeklyActivities.map(a => a.steps),
          color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    };
  };

  const motivationalMessage = userProfile?.fitnessGoal
    ? recommendationService.getMotivationalMessage(userProfile.fitnessGoal, 0)
    : '';

  const screenWidth = Dimensions.get('window').width - 40;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            你好，{userProfile?.displayName || '健身达人'}！
          </Text>
          <Text style={styles.subGreeting}>{motivationalMessage}</Text>
        </View>
        <TouchableOpacity
          style={styles.trackingButton}
          onPress={toggleTracking}>
          <Text style={[
            styles.trackingButtonText,
            isTracking && styles.trackingButtonTextActive,
          ]}>
            {isTracking ? '🔴 追踪中' : '⚪ 开始追踪'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.stepsCard}>
        <View style={styles.stepsHeader}>
          <Text style={styles.stepsTitle}>今日步数</Text>
          <Text style={styles.stepsGoal}>目标: {getStepGoal().toLocaleString()}</Text>
        </View>
        <Text style={styles.stepsCount}>
          {todayActivity?.steps?.toLocaleString() || 0}
        </Text>
        <View style={styles.progressBarContainer}>
          <View style={[
            styles.progressBar,
            {width: `${Math.min((todayActivity?.steps || 0) / getStepGoal() * 100, 100)}%`},
          ]} />
        </View>
        <View style={styles.stepsDetails}>
          <View style={styles.stepDetailItem}>
            <Text style={styles.stepDetailValue}>{todayActivity?.walkingSteps || 0}</Text>
            <Text style={styles.stepDetailLabel}>步行</Text>
          </View>
          <View style={styles.stepDetailItem}>
            <Text style={styles.stepDetailValue}>{todayActivity?.runningSteps || 0}</Text>
            <Text style={styles.stepDetailLabel}>跑步</Text>
          </View>
          <View style={styles.stepDetailItem}>
            <Text style={styles.stepDetailValue}>{(todayActivity?.distance || 0).toFixed(1)}km</Text>
            <Text style={styles.stepDetailLabel}>距离</Text>
          </View>
          <View style={styles.stepDetailItem}>
            <Text style={styles.stepDetailValue}>{todayActivity?.caloriesBurned || 0}</Text>
            <Text style={styles.stepDetailLabel}>卡路里</Text>
          </View>
        </View>
      </View>

      <View style={styles.quickStatsRow}>
        <TouchableOpacity
          style={styles.quickStatCard}
          onPress={() => navigation.navigate('Nutrition')}>
          <Text style={styles.quickStatIcon}>🍎</Text>
          <Text style={styles.quickStatValue}>{calculateTotalCalories()}</Text>
          <Text style={styles.quickStatLabel}>摄入卡路里</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickStatCard}
          onPress={() => navigation.navigate('Workout')}>
          <Text style={styles.quickStatIcon}>🏋️</Text>
          <Text style={styles.quickStatValue}>{workouts.length}</Text>
          <Text style={styles.quickStatLabel}>今日运动</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickStatCard}
          onPress={() => navigation.navigate('BodyStats')}>
          <Text style={styles.quickStatIcon}>💧</Text>
          <Text style={styles.quickStatValue}>{todayWaterAmount}/{waterGoal}ml</Text>
          <Text style={styles.quickStatLabel}>喝水</Text>
        </TouchableOpacity>
      </View>

      {weeklyActivities.length > 0 && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>本周步数趋势</Text>
          <LineChart
            data={getWeeklyChartData()}
            width={screenWidth}
            height={200}
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
                r: '4',
                strokeWidth: '2',
                stroke: '#4CAF50',
              },
            }}
            bezier
            style={{
              marginVertical: 8,
              borderRadius: 16,
            }}
          />
        </View>
      )}

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>快速操作</Text>
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('AddWorkout')}>
            <Text style={styles.quickActionIcon}>🏃</Text>
            <Text style={styles.quickActionLabel}>记录运动</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('AddMeal')}>
            <Text style={styles.quickActionIcon}>🥗</Text>
            <Text style={styles.quickActionLabel}>记录饮食</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('Training')}>
            <Text style={styles.quickActionIcon}>📋</Text>
            <Text style={styles.quickActionLabel}>训练计划</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('Challenge')}>
            <Text style={styles.quickActionIcon}>🏆</Text>
            <Text style={styles.quickActionLabel}>挑战</Text>
          </TouchableOpacity>
        </View>
      </View>

      {workouts.length > 0 && (
        <View style={styles.recentWorkouts}>
          <Text style={styles.sectionTitle}>最近运动</Text>
          {workouts.slice(0, 3).map((workout) => (
            <View key={workout.id} style={styles.workoutItem}>
              <View style={styles.workoutInfo}>
                <Text style={styles.workoutName}>{workout.name}</Text>
                <Text style={styles.workoutDate}>
                  {new Date(workout.date).toLocaleDateString('zh-CN')}
                </Text>
              </View>
              <View style={styles.workoutStats}>
                <Text style={styles.workoutCalories}>{workout.totalCalories} 卡</Text>
                <Text style={styles.workoutDuration}>{workout.totalDuration} 分钟</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subGreeting: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  trackingButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  trackingButtonText: {
    fontSize: 14,
    color: '#666',
  },
  trackingButtonTextActive: {
    color: '#f44336',
  },
  stepsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stepsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  stepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  stepsGoal: {
    fontSize: 14,
    color: '#999',
  },
  stepsCount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'center',
    marginVertical: 10,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  stepsDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stepDetailItem: {
    alignItems: 'center',
  },
  stepDetailValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  stepDetailLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  quickStatIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  quickActions: {
    marginBottom: 20,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  quickActionIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 12,
    color: '#666',
  },
  recentWorkouts: {
    marginBottom: 20,
  },
  workoutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  workoutInfo: {
    flex: 1,
  },
  workoutName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  workoutDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  workoutStats: {
    alignItems: 'flex-end',
  },
  workoutCalories: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  workoutDuration: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
});

export default HomeScreen;

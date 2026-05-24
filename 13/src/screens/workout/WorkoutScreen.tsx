import React, {useState, useEffect, useMemo, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import {LineChart} from 'react-native-chart-kit';
import {fetchWorkouts, deleteWorkout} from '@redux/slices/workoutSlice';
import {fetchTodayActivity, fetchWeeklyActivities} from '@redux/slices/activitySlice';
import {AppDispatch, RootState} from '@redux/store';
import {Workout, ExerciseType, DailyActivity} from '@types/index';

type FilterType = 'all' | 'cardio' | 'strength';

const {width: screenWidth} = Dimensions.get('window');

const workoutTypeLabels: Record<ExerciseType, string> = {
  cardio: '有氧运动',
  strength: '力量训练',
};

const WorkoutScreen = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const {workouts, isLoading: workoutsLoading, error: workoutsError} = useSelector(
    (state: RootState) => state.workout
  );
  const {todayActivity, weeklyActivities, isLoading: activityLoading} = useSelector(
    (state: RootState) => state.activity
  );
  const {user} = useSelector((state: RootState) => state.auth);
  const userProfile = useSelector((state: RootState) => state.user.profile);

  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);

  const loadData = useCallback(async () => {
    if (user?.uid) {
      try {
        await Promise.all([
          dispatch(fetchWorkouts(user.uid)).unwrap(),
          dispatch(fetchTodayActivity(user.uid)).unwrap(),
          dispatch(fetchWeeklyActivities(user.uid)).unwrap(),
        ]);
      } catch (err: any) {
        Alert.alert('错误', err.message || '加载数据失败');
      }
    }
  }, [dispatch, user?.uid]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (workoutsError) {
      Alert.alert('错误', workoutsError);
    }
  }, [workoutsError]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const filteredWorkouts = useMemo(() => {
    if (filter === 'all') return workouts;
    return workouts.filter((workout) => {
      return workout.exercises.some((ex) => ex.type === filter);
    });
  }, [workouts, filter]);

  const todayStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaysWorkouts = workouts.filter((workout) => {
      const workoutDate = new Date(workout.date);
      workoutDate.setHours(0, 0, 0, 0);
      return workoutDate.getTime() === today.getTime();
    });

    const totalCalories = todaysWorkouts.reduce(
      (sum, w) => sum + w.totalCalories,
      0
    );
    const totalDuration = todaysWorkouts.reduce(
      (sum, w) => sum + w.totalDuration,
      0
    );

    return {
      calories: todayActivity?.caloriesBurned || totalCalories,
      duration: totalDuration + (todayActivity?.activeMinutes || 0),
      workoutCount: todaysWorkouts.length,
    };
  }, [workouts, todayActivity]);

  const weeklyChartData = useMemo(() => {
    const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const today = new Date();
    const dayOfWeek = today.getDay() || 7;

    const sortedActivities = [...weeklyActivities].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const activityMap = new Map<string, DailyActivity>();
    sortedActivities.forEach((activity) => {
      const date = new Date(activity.date);
      const dayIndex = (date.getDay() || 7) - 1;
      activityMap.set(days[dayIndex], activity);
    });

    const labels: string[] = [];
    const data: number[] = [];

    for (let i = 0; i < 7; i++) {
      const index = (dayOfWeek - 1 + i) % 7;
      const day = days[index];
      labels.push(day);
      const activity = activityMap.get(day);
      data.push(activity?.caloriesBurned || 0);
    }

    return {
      labels,
      datasets: [
        {
          data,
          color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    };
  }, [weeklyActivities]);

  const handleAddWorkout = useCallback(
    (type: ExerciseType) => {
      navigation.navigate('AddWorkout' as never, {defaultType: type} as never);
    },
    [navigation]
  );

  const handleDeleteWorkout = useCallback(
    (workoutId: string) => {
      Alert.alert(
        '确认删除',
        '确定要删除这条运动记录吗？此操作无法撤销。',
        [
          {text: '取消', style: 'cancel'},
          {
            text: '删除',
            style: 'destructive',
            onPress: async () => {
              try {
                await dispatch(deleteWorkout(workoutId)).unwrap();
                Alert.alert('成功', '运动记录已删除');
              } catch (err: any) {
                Alert.alert('错误', err.message || '删除失败');
              }
            },
          },
        ]
      );
    },
    [dispatch]
  );

  const handleWorkoutPress = useCallback(
    (workout: Workout) => {
      setSelectedWorkout(workout);
    },
    []
  );

  const closeDetailModal = useCallback(() => {
    setSelectedWorkout(null);
  }, []);

  const getWorkoutIcon = (workout: Workout): string => {
    const hasCardio = workout.exercises.some((ex) => ex.type === 'cardio');
    const hasStrength = workout.exercises.some((ex) => ex.type === 'strength');
    if (hasCardio && hasStrength) return '🏋️';
    if (hasCardio) return '🏃';
    return '💪';
  };

  const getWorkoutTypeLabel = (workout: Workout): string => {
    const types = new Set(workout.exercises.map((ex) => ex.type));
    return Array.from(types).map((t) => workoutTypeLabels[t]).join('/');
  };

  const formatDate = (date: Date): string => {
    const d = new Date(date);
    const now = new Date();
    const diffTime = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
      return `今天 ${hours}:${minutes}`;
    } else if (diffDays === 1) {
      return '昨天';
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else {
      return `${d.getMonth() + 1}月${d.getDate()}日`;
    }
  };

  const renderWorkoutDetail = () => {
    if (!selectedWorkout) return null;

    return (
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{selectedWorkout.name}</Text>
            <TouchableOpacity onPress={closeDetailModal}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.detailSummary}>
              <View style={styles.detailSummaryItem}>
                <Text style={styles.detailSummaryValue}>
                  {selectedWorkout.totalDuration}
                </Text>
                <Text style={styles.detailSummaryLabel}>总时长(分钟)</Text>
              </View>
              <View style={styles.detailSummaryItem}>
                <Text style={styles.detailSummaryValue}>
                  {selectedWorkout.totalCalories}
                </Text>
                <Text style={styles.detailSummaryLabel}>卡路里</Text>
              </View>
              <View style={styles.detailSummaryItem}>
                <Text style={styles.detailSummaryValue}>
                  {selectedWorkout.exercises.length}
                </Text>
                <Text style={styles.detailSummaryLabel}>运动项目</Text>
              </View>
            </View>

            <Text style={styles.detailSectionTitle}>运动项目详情</Text>
            {selectedWorkout.exercises.map((exercise, index) => (
              <View key={exercise.id} style={styles.detailExerciseItem}>
                <View style={styles.detailExerciseHeader}>
                  <Text style={styles.detailExerciseName}>{exercise.name}</Text>
                  <Text style={styles.detailExerciseType}>
                    {workoutTypeLabels[exercise.type]}
                  </Text>
                </View>
                <View style={styles.detailExerciseInfo}>
                  {exercise.duration && (
                    <Text style={styles.detailExerciseText}>
                      时长: {exercise.duration}分钟
                    </Text>
                  )}
                  {exercise.distance && (
                    <Text style={styles.detailExerciseText}>
                      距离: {exercise.distance}公里
                    </Text>
                  )}
                  {exercise.sets && exercise.reps && (
                    <Text style={styles.detailExerciseText}>
                      {exercise.sets}组 × {exercise.reps}次
                      {exercise.weight && ` @ ${exercise.weight}kg`}
                    </Text>
                  )}
                  <Text style={styles.detailExerciseCalories}>
                    消耗: {exercise.caloriesBurned} 卡
                  </Text>
                </View>
                {exercise.notes && (
                  <Text style={styles.detailExerciseNotes}>
                    备注: {exercise.notes}
                  </Text>
                )}
              </View>
            ))}

            {selectedWorkout.notes && (
              <View style={styles.detailNotesSection}>
                <Text style={styles.detailSectionTitle}>备注</Text>
                <Text style={styles.detailNotes}>{selectedWorkout.notes}</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalDeleteButton]}
              onPress={() => {
                handleDeleteWorkout(selectedWorkout.id);
                closeDetailModal();
              }}>
              <Text style={styles.modalDeleteButtonText}>删除记录</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalCloseButton]}
              onPress={closeDetailModal}>
              <Text style={styles.modalCloseButtonText}>关闭</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#4CAF50']}
            tintColor="#4CAF50"
          />
        }>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>运动记录</Text>
          <Text style={styles.headerSubtitle}>
            {userProfile?.displayName || '用户'}，今天也要加油！
          </Text>
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>今日概览</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statIcon}>🔥</Text>
              <Text style={styles.statValue}>{todayStats.calories}</Text>
              <Text style={styles.statLabel}>卡路里</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statIcon}>⏱️</Text>
              <Text style={styles.statValue}>{todayStats.duration}</Text>
              <Text style={styles.statLabel}>分钟</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statIcon}>📊</Text>
              <Text style={styles.statValue}>{todayStats.workoutCount}</Text>
              <Text style={styles.statLabel}>次运动</Text>
            </View>
          </View>
        </View>

        <View style={styles.quickAddSection}>
          <Text style={styles.sectionTitle}>快速添加</Text>
          <View style={styles.quickAddButtons}>
            <TouchableOpacity
              style={[styles.quickAddButton, styles.cardioButton]}
              onPress={() => handleAddWorkout('cardio')}>
              <Text style={styles.quickAddIcon}>🏃</Text>
              <Text style={styles.quickAddText}>有氧运动</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAddButton, styles.strengthButton]}
              onPress={() => handleAddWorkout('strength')}>
              <Text style={styles.quickAddIcon}>💪</Text>
              <Text style={styles.quickAddText}>力量训练</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>本周运动趋势</Text>
          <View style={styles.chartCard}>
            {activityLoading ? (
              <View style={styles.chartLoading}>
                <Text style={styles.loadingText}>加载中...</Text>
              </View>
            ) : (
              <LineChart
                data={weeklyChartData}
                width={screenWidth - 40}
                height={200}
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(102, 102, 102, ${opacity})`,
                  style: {
                    borderRadius: 16,
                  },
                  propsForDots: {
                    r: '4',
                    strokeWidth: '2',
                    stroke: '#4CAF50',
                  },
                  propsForBackgroundLines: {
                    strokeDasharray: '',
                    stroke: '#f0f0f0',
                  },
                }}
                bezier
                style={styles.chart}
              />
            )}
            <Text style={styles.chartLabel}>卡路里消耗趋势 (卡)</Text>
          </View>
        </View>

        <View style={styles.workoutListSection}>
          <View style={styles.filterContainer}>
            <Text style={styles.sectionTitle}>最近运动</Text>
            <View style={styles.filterButtons}>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  filter === 'all' && styles.filterButtonActive,
                ]}
                onPress={() => setFilter('all')}>
                <Text
                  style={[
                    styles.filterButtonText,
                    filter === 'all' && styles.filterButtonTextActive,
                  ]}>
                  全部
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  filter === 'cardio' && styles.filterButtonActive,
                ]}
                onPress={() => setFilter('cardio')}>
                <Text
                  style={[
                    styles.filterButtonText,
                    filter === 'cardio' && styles.filterButtonTextActive,
                  ]}>
                  有氧
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  filter === 'strength' && styles.filterButtonActive,
                ]}
                onPress={() => setFilter('strength')}>
                <Text
                  style={[
                    styles.filterButtonText,
                    filter === 'strength' && styles.filterButtonTextActive,
                  ]}>
                  力量
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {workoutsLoading && filteredWorkouts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.loadingText}>加载中...</Text>
            </View>
          ) : filteredWorkouts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🏋️</Text>
              <Text style={styles.emptyText}>暂无运动记录</Text>
              <Text style={styles.emptySubtext}>
                点击上方按钮开始记录您的第一次运动
              </Text>
            </View>
          ) : (
            <View style={styles.workoutList}>
              {filteredWorkouts.map((workout) => (
                <TouchableOpacity
                  key={workout.id}
                  style={styles.workoutCard}
                  onPress={() => handleWorkoutPress(workout)}
                  activeOpacity={0.7}>
                  <View style={styles.workoutCardContent}>
                    <View style={styles.workoutIconContainer}>
                      <Text style={styles.workoutIcon}>
                        {getWorkoutIcon(workout)}
                      </Text>
                    </View>
                    <View style={styles.workoutInfo}>
                      <Text style={styles.workoutName}>{workout.name}</Text>
                      <Text style={styles.workoutType}>
                        {getWorkoutTypeLabel(workout)}
                      </Text>
                      <Text style={styles.workoutDate}>
                        {formatDate(workout.date)}
                      </Text>
                    </View>
                    <View style={styles.workoutStats}>
                      <Text style={styles.workoutCalories}>
                        {workout.totalCalories} 卡
                      </Text>
                      <Text style={styles.workoutDuration}>
                        {workout.totalDuration} 分钟
                      </Text>
                      <Text style={styles.workoutExerciseCount}>
                        {workout.exercises.length} 项
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteWorkout(workout.id)}
                    hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                    <Text style={styles.deleteButtonText}>删除</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {renderWorkoutDetail()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 20,
    paddingTop: 40,
    paddingBottom: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: -15,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  quickAddSection: {
    padding: 20,
  },
  quickAddButtons: {
    flexDirection: 'row',
    marginTop: 15,
    gap: 12,
  },
  quickAddButton: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  cardioButton: {
    backgroundColor: '#E8F5E9',
  },
  strengthButton: {
    backgroundColor: '#FFF3E0',
  },
  quickAddIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  quickAddText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  chartSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginTop: 15,
    alignItems: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  chartLoading: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workoutListSection: {
    paddingHorizontal: 20,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  workoutList: {
    gap: 12,
  },
  workoutCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  workoutCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  workoutIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  workoutIcon: {
    fontSize: 24,
  },
  workoutInfo: {
    flex: 1,
  },
  workoutName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  workoutType: {
    fontSize: 12,
    color: '#4CAF50',
    marginBottom: 2,
  },
  workoutDate: {
    fontSize: 12,
    color: '#999',
  },
  workoutStats: {
    alignItems: 'flex-end',
  },
  workoutCalories: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f44336',
    marginBottom: 2,
  },
  workoutDuration: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  workoutExerciseCount: {
    fontSize: 12,
    color: '#999',
  },
  deleteButton: {
    marginLeft: 10,
    padding: 8,
  },
  deleteButtonText: {
    fontSize: 12,
    color: '#f44336',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#999',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalClose: {
    fontSize: 24,
    color: '#999',
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  detailSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
  },
  detailSummaryItem: {
    alignItems: 'center',
  },
  detailSummaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  detailSummaryLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    marginTop: 8,
  },
  detailExerciseItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  detailExerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailExerciseName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  detailExerciseType: {
    fontSize: 12,
    color: '#4CAF50',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  detailExerciseInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailExerciseText: {
    fontSize: 14,
    color: '#666',
  },
  detailExerciseCalories: {
    fontSize: 14,
    fontWeight: '500',
    color: '#f44336',
  },
  detailExerciseNotes: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  detailNotesSection: {
    marginTop: 10,
  },
  detailNotes: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    lineHeight: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalDeleteButton: {
    backgroundColor: '#FFEBEE',
  },
  modalDeleteButtonText: {
    color: '#f44336',
    fontSize: 16,
    fontWeight: '500',
  },
  modalCloseButton: {
    backgroundColor: '#4CAF50',
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default WorkoutScreen;

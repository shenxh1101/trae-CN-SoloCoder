import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Vibration,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {useNavigation, useRoute} from '@react-navigation/native';
import {
  startWorkout,
  nextExercise,
  previousExercise,
  endWorkout,
  saveWorkout,
} from '@redux/slices/workoutSlice';
import {startTimer, updateRestTime, stopTimer} from '@redux/slices/trainingPlanSlice';
import {voiceService} from '@services/voiceService';
import {recommendationService} from '@services/recommendationService';
import {TrainingPlan, PlannedExercise, Workout, Exercise} from '@types/index';
import {AppDispatch, RootState} from '@redux/store';

const ActiveWorkoutScreen = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const route = useRoute();
  const trainingPlan = route.params?.plan as TrainingPlan;
  const selectedDay = route.params?.day || 'monday';

  const userProfile = useSelector((state: RootState) => state.user.profile);
  const {currentWorkout, currentExerciseIndex, isWorkoutActive} = useSelector(
    (state: RootState) => state.workout
  );
  const {isTimerRunning, currentRestTime} = useSelector(
    (state: RootState) => state.trainingPlan
  );

  const [workoutStarted, setWorkoutStarted] = useState(false);
  const [currentSet, setCurrentSet] = useState(1);
  const [exercisesCompleted, setExercisesCompleted] = useState<boolean[]>([]);
  const [workoutStartTime, setWorkoutStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [restTimeLeft, setRestTimeLeft] = useState(0);

  const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const restTimerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const dayWorkout = trainingPlan?.weeklySchedule?.[selectedDay];
  const exercises = dayWorkout?.exercises || [];
  const currentExercise = exercises[currentExerciseIndex];

  useEffect(() => {
    if (workoutStarted && exercises.length > 0) {
      setExercisesCompleted(new Array(exercises.length).fill(false));
    }
  }, [workoutStarted, exercises.length]);

  useEffect(() => {
    if (workoutStarted && workoutStartTime) {
      elapsedTimerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - workoutStartTime.getTime()) / 1000));
      }, 1000);
    }

    return () => {
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
      }
    };
  }, [workoutStarted, workoutStartTime]);

  useEffect(() => {
    return () => {
      if (restTimerIntervalRef.current) clearInterval(restTimerIntervalRef.current);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
      voiceService.destroy();
    };
  }, []);

  useEffect(() => {
    if (isTimerRunning && currentRestTime > 0) {
      setRestTimeLeft(currentRestTime);
      
      if (restTimerIntervalRef.current) {
        clearInterval(restTimerIntervalRef.current);
      }

      restTimerIntervalRef.current = setInterval(() => {
        setRestTimeLeft(prev => {
          if (prev <= 1) {
            if (restTimerIntervalRef.current) {
              clearInterval(restTimerIntervalRef.current);
            }
            dispatch(stopTimer());
            Vibration.vibrate([500, 200, 500]);
            return 0;
          }
          
          const newTime = prev - 1;
          dispatch(updateRestTime(newTime));
          
          if (newTime <= 10) {
            voiceService.announceRestTimeRemaining(newTime);
          }
          
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (restTimerIntervalRef.current) {
        clearInterval(restTimerIntervalRef.current);
      }
    };
  }, [isTimerRunning, currentRestTime, dispatch]);

  const startWorkoutSession = () => {
    const workoutExercises: Exercise[] = exercises.map((ex: PlannedExercise) => ({
      id: ex.exerciseId,
      name: ex.exerciseName,
      type: ex.type,
      subType: ex.subType,
      duration: ex.duration,
      distance: ex.distance,
      sets: ex.sets,
      reps: ex.reps,
      weight: ex.weight,
      caloriesBurned: 0,
    }));

    const workout: Workout = {
      id: Date.now().toString(),
      userId: userProfile?.id || '',
      name: `${trainingPlan.name} - ${getDayName(selectedDay)}`,
      date: new Date(),
      exercises: workoutExercises,
      totalDuration: 0,
      totalCalories: 0,
    };

    dispatch(startWorkout(workout));
    setWorkoutStarted(true);
    setWorkoutStartTime(new Date());
    setCurrentSet(1);
    voiceService.announceExerciseStart(currentExercise?.exerciseName || '训练');
  };

  const completeSet = () => {
    if (!currentExercise) return;

    const totalSets = currentExercise.sets || 3;
    
    if (currentSet < totalSets) {
      voiceService.announceSetComplete(currentSet, currentExercise.restTime);
      dispatch(startTimer(currentExercise.restTime));
      setCurrentSet(currentSet + 1);
    } else {
      completeExercise();
    }
  };

  const completeExercise = () => {
    const newCompleted = [...exercisesCompleted];
    newCompleted[currentExerciseIndex] = true;
    setExercisesCompleted(newCompleted);

    if (currentExerciseIndex < exercises.length - 1) {
      voiceService.announceExerciseComplete();
      dispatch(nextExercise());
      setCurrentSet(1);
      setTimeout(() => {
        voiceService.announceExerciseStart(exercises[currentExerciseIndex + 1]?.exerciseName || '下一个动作');
      }, 2000);
    } else {
      completeWorkout();
    }
  };

  const completeWorkout = async () => {
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
    }

    voiceService.announceWorkoutComplete();
    Vibration.vibrate([200, 100, 200, 100, 500]);

    if (currentWorkout) {
      const updatedWorkout: Omit<Workout, 'id'> = {
        ...currentWorkout,
        totalDuration: Math.floor(elapsedTime / 60),
        totalCalories: currentWorkout.exercises.reduce((sum, ex) => sum + ex.caloriesBurned, 0),
      };

      try {
        await dispatch(saveWorkout(updatedWorkout)).unwrap();
      } catch (err) {
        console.error('保存训练失败:', err);
      }
    }

    dispatch(endWorkout());
    dispatch(stopTimer());
  };

  const skipRest = () => {
    if (restTimerIntervalRef.current) {
      clearInterval(restTimerIntervalRef.current);
    }
    dispatch(stopTimer());
    setRestTimeLeft(0);
  };

  const addTimeToRest = (seconds: number) => {
    const newTime = restTimeLeft + seconds;
    setRestTimeLeft(newTime);
    dispatch(updateRestTime(newTime));
  };

  const goToPreviousExercise = () => {
    dispatch(previousExercise());
    setCurrentSet(1);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getDayName = (day: string): string => {
    const dayNames: Record<string, string> = {
      monday: '周一',
      tuesday: '周二',
      wednesday: '周三',
      thursday: '周四',
      friday: '周五',
      saturday: '周六',
      sunday: '周日',
    };
    return dayNames[day] || day;
  };

  const getProgress = (): number => {
    const completed = exercisesCompleted.filter(Boolean).length;
    return exercises.length > 0 ? (completed / exercises.length) * 100 : 0;
  };

  if (!workoutStarted) {
    return (
      <View style={styles.container}>
        <View style={styles.preWorkoutContainer}>
          <Text style={styles.planName}>{trainingPlan?.name}</Text>
          <Text style={styles.dayName}>{getDayName(selectedDay)}训练</Text>
          
          <View style={styles.workoutInfoCard}>
            <View style={styles.workoutInfoItem}>
              <Text style={styles.workoutInfoValue}>{exercises.length}</Text>
              <Text style={styles.workoutInfoLabel}>动作数量</Text>
            </View>
            <View style={styles.workoutInfoItem}>
              <Text style={styles.workoutInfoValue}>
                {exercises.reduce((sum, ex) => sum + (ex.sets || 0), 0)}
              </Text>
              <Text style={styles.workoutInfoLabel}>总组数</Text>
            </View>
            <View style={styles.workoutInfoItem}>
              <Text style={styles.workoutInfoValue}>
                ~{Math.round(exercises.reduce((sum, ex) => sum + (ex.duration || 20), 0))}
              </Text>
              <Text style={styles.workoutInfoLabel}>预计时长(分钟)</Text>
            </View>
          </View>

          <ScrollView style={styles.exerciseList}>
            <Text style={styles.sectionTitle}>训练内容</Text>
            {exercises.map((ex: PlannedExercise, index: number) => (
              <View key={index} style={styles.exercisePreviewItem}>
                <View style={styles.exercisePreviewInfo}>
                  <Text style={styles.exercisePreviewName}>{ex.exerciseName}</Text>
                  <Text style={styles.exercisePreviewDetail}>
                    {ex.type === 'cardio'
                      ? `${ex.duration}分钟${ex.distance ? ` / ${ex.distance}公里` : ''}`
                      : `${ex.sets}组 x ${ex.reps}次${ex.weight ? ` @ ${ex.weight}kg` : ''}`}
                  </Text>
                </View>
                <Text style={styles.exerciseRest}>休息 {ex.restTime}秒</Text>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.startButton} onPress={startWorkoutSession}>
            <Text style={styles.startButtonText}>开始训练</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.elapsedTime}>{formatTime(elapsedTime)}</Text>
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBar, {width: `${getProgress()}%`}]} />
          </View>
          <Text style={styles.progressText}>
            {currentExerciseIndex + 1}/{exercises.length}
          </Text>
        </View>
      </View>

      {isTimerRunning ? (
        <View style={styles.restTimerContainer}>
          <Text style={styles.restLabel}>休息时间</Text>
          <Text style={styles.restTimer}>{restTimeLeft}</Text>
          <View style={styles.restActions}>
            <TouchableOpacity
              style={styles.restActionButton}
              onPress={() => addTimeToRest(30)}>
              <Text style={styles.restActionText}>+30秒</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.restActionButton, styles.skipButton]}
              onPress={skipRest}>
              <Text style={styles.skipButtonText}>跳过休息</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <ScrollView style={styles.workoutContent}>
          {currentExercise && (
            <View style={styles.currentExerciseCard}>
              <Text style={styles.currentExerciseName}>
                {currentExercise.exerciseName}
              </Text>
              <Text style={styles.currentExerciseType}>
                {currentExercise.type === 'cardio' ? '有氧运动' : '力量训练'}
              </Text>

              <View style={styles.setInfo}>
                <Text style={styles.setLabel}>当前组数</Text>
                <Text style={styles.setCount}>
                  {currentSet} / {currentExercise.sets || 3}
                </Text>
              </View>

              <View style={styles.exerciseDetails}>
                {currentExercise.type === 'cardio' ? (
                  <>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>目标时长</Text>
                      <Text style={styles.detailValue}>
                        {currentExercise.duration || 30} 分钟
                      </Text>
                    </View>
                    {currentExercise.distance && (
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>目标距离</Text>
                        <Text style={styles.detailValue}>
                          {currentExercise.distance} 公里
                        </Text>
                      </View>
                    )}
                  </>
                ) : (
                  <>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>每组次数</Text>
                      <Text style={styles.detailValue}>
                        {currentExercise.reps || 12} 次
                      </Text>
                    </View>
                    {currentExercise.weight && (
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>重量</Text>
                        <Text style={styles.detailValue}>
                          {currentExercise.weight} kg
                        </Text>
                      </View>
                    )}
                  </>
                )}
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>组间休息</Text>
                  <Text style={styles.detailValue}>
                    {currentExercise.restTime || 60} 秒
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.completeSetButton}
                onPress={completeSet}>
                <Text style={styles.completeSetButtonText}>
                  {currentSet >= (currentExercise.sets || 3) ? '完成动作' : '完成本组'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.exerciseNavigator}>
            <TouchableOpacity
              style={[
                styles.navButton,
                currentExerciseIndex === 0 && styles.disabledNavButton,
              ]}
              onPress={goToPreviousExercise}
              disabled={currentExerciseIndex === 0}>
              <Text style={styles.navButtonText}>上一个</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navButton, styles.nextButton]}
              onPress={completeExercise}>
              <Text style={styles.navButtonText}>跳过动作</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.exerciseList}>
            <Text style={styles.sectionTitle}>所有动作</Text>
            {exercises.map((ex: PlannedExercise, index: number) => (
              <View
                key={index}
                style={[
                  styles.exerciseListItem,
                  index === currentExerciseIndex && styles.currentExerciseListItem,
                  exercisesCompleted[index] && styles.completedExercise,
                ]}>
                <Text style={styles.exerciseListNumber}>{index + 1}</Text>
                <View style={styles.exerciseListInfo}>
                  <Text style={styles.exerciseListName}>{ex.exerciseName}</Text>
                  <Text style={styles.exerciseListDetail}>
                    {ex.type === 'cardio'
                      ? `${ex.duration}分钟`
                      : `${ex.sets}组 x ${ex.reps}次`}
                  </Text>
                </View>
                {exercisesCompleted[index] && (
                  <Text style={styles.completedCheck}>✓</Text>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      <TouchableOpacity
        style={styles.endWorkoutButton}
        onPress={() => {
          Alert.alert(
            '结束训练',
            '确定要结束本次训练吗？',
            [
              {text: '继续训练', style: 'cancel'},
              {text: '结束训练', style: 'destructive', onPress: completeWorkout},
            ]
          );
        }}>
        <Text style={styles.endWorkoutButtonText}>结束训练</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  preWorkoutContainer: {
    flex: 1,
    padding: 20,
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,
  },
  dayName: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  workoutInfoCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    justifyContent: 'space-around',
  },
  workoutInfoItem: {
    alignItems: 'center',
  },
  workoutInfoValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  workoutInfoLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  exerciseList: {
    flex: 1,
    marginBottom: 20,
  },
  exercisePreviewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  exercisePreviewInfo: {
    flex: 1,
  },
  exercisePreviewName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  exercisePreviewDetail: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  exerciseRest: {
    fontSize: 14,
    color: '#4CAF50',
  },
  startButton: {
    backgroundColor: '#4CAF50',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 20,
    paddingTop: 40,
  },
  elapsedTime: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  progressText: {
    color: '#fff',
    marginLeft: 15,
    fontSize: 16,
    fontWeight: '600',
  },
  restTimerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  restLabel: {
    fontSize: 24,
    color: '#666',
    marginBottom: 20,
  },
  restTimer: {
    fontSize: 120,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  restActions: {
    flexDirection: 'row',
    marginTop: 40,
  },
  restActionButton: {
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#4CAF50',
    marginHorizontal: 10,
  },
  restActionText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    backgroundColor: '#4CAF50',
  },
  skipButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  workoutContent: {
    flex: 1,
    padding: 20,
  },
  currentExerciseCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  currentExerciseName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  currentExerciseType: {
    fontSize: 14,
    color: '#4CAF50',
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 20,
  },
  setInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  setLabel: {
    fontSize: 14,
    color: '#999',
  },
  setCount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  exerciseDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  detailItem: {
    width: '45%',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
  },
  detailValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  completeSetButton: {
    backgroundColor: '#4CAF50',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  completeSetButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  exerciseNavigator: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  navButton: {
    flex: 1,
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  disabledNavButton: {
    opacity: 0.5,
  },
  nextButton: {
    backgroundColor: '#fff',
  },
  navButtonText: {
    fontSize: 14,
    color: '#666',
  },
  exerciseListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  currentExerciseListItem: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  completedExercise: {
    opacity: 0.6,
  },
  exerciseListNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e0e0e0',
    textAlign: 'center',
    textAlignVertical: 'center',
    marginRight: 15,
    fontWeight: '600',
    color: '#666',
  },
  exerciseListInfo: {
    flex: 1,
  },
  exerciseListName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  exerciseListDetail: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  completedCheck: {
    fontSize: 24,
    color: '#4CAF50',
  },
  endWorkoutButton: {
    margin: 20,
    padding: 18,
    backgroundColor: '#f44336',
    borderRadius: 12,
    alignItems: 'center',
  },
  endWorkoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ActiveWorkoutScreen;

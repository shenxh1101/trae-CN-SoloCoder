import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import {saveWorkout} from '@redux/slices/workoutSlice';
import {recommendationService} from '@services/recommendationService';
import {Exercise, Workout, ExerciseType, CardioExercise, StrengthExercise} from '@types/index';
import {AppDispatch, RootState} from '@redux/store';

const AddWorkoutScreen = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const userProfile = useSelector((state: RootState) => state.user.profile);
  const {isLoading} = useSelector((state: RootState) => state.workout);

  const [workoutName, setWorkoutName] = useState('');
  const [workoutDate, setWorkoutDate] = useState(new Date());
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExerciseType, setSelectedExerciseType] = useState<ExerciseType | null>(null);
  const [showExerciseForm, setShowExerciseForm] = useState(false);
  const [currentExercise, setCurrentExercise] = useState<Partial<Exercise>>({});

  const cardioExercises = recommendationService.getExerciseRecommendations('cardio', userProfile?.fitnessGoal || 'maintain');
  const strengthExercises = recommendationService.getExerciseRecommendations('strength', userProfile?.fitnessGoal || 'maintain');

  const selectExerciseType = (type: ExerciseType) => {
    setSelectedExerciseType(type);
    setCurrentExercise({type});
  };

  const selectSubType = (subType: CardioExercise | StrengthExercise, name: string) => {
    setCurrentExercise(prev => ({
      ...prev,
      subType,
      name,
    }));
  };

  const addExercise = () => {
    if (!currentExercise.name || !currentExercise.subType || !currentExercise.type) {
      Alert.alert('提示', '请选择运动类型');
      return;
    }

    let caloriesBurned = 0;
    if (userProfile?.weight) {
      const duration = currentExercise.duration || 30;
      caloriesBurned = recommendationService.calculateCaloriesBurned(
        currentExercise.subType,
        duration,
        userProfile.weight,
        'medium'
      );
    }

    const exercise: Exercise = {
      id: Date.now().toString(),
      name: currentExercise.name,
      type: currentExercise.type,
      subType: currentExercise.subType,
      duration: currentExercise.duration,
      distance: currentExercise.distance,
      sets: currentExercise.sets,
      reps: currentExercise.reps,
      weight: currentExercise.weight,
      caloriesBurned: currentExercise.caloriesBurned || caloriesBurned,
      heartRate: currentExercise.heartRate,
      notes: currentExercise.notes,
    };

    setExercises([...exercises, exercise]);
    setShowExerciseForm(false);
    setSelectedExerciseType(null);
    setCurrentExercise({});
  };

  const removeExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!workoutName) {
      Alert.alert('提示', '请输入运动名称');
      return;
    }

    if (exercises.length === 0) {
      Alert.alert('提示', '请至少添加一个运动项目');
      return;
    }

    const totalDuration = exercises.reduce((sum, ex) => sum + (ex.duration || 0), 0);
    const totalCalories = exercises.reduce((sum, ex) => sum + ex.caloriesBurned, 0);

    const workout: Omit<Workout, 'id'> = {
      userId: userProfile?.id || '',
      name: workoutName,
      date: workoutDate,
      exercises,
      totalDuration,
      totalCalories,
    };

    try {
      await dispatch(saveWorkout(workout)).unwrap();
      Alert.alert('成功', '运动记录已保存');
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('错误', err.message || '保存失败');
    }
  };

  const calculateTotalDuration = () => {
    return exercises.reduce((sum, ex) => sum + (ex.duration || 0), 0);
  };

  const calculateTotalCalories = () => {
    return exercises.reduce((sum, ex) => sum + ex.caloriesBurned, 0);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.label}>运动名称</Text>
        <TextInput
          style={styles.input}
          placeholder="例如：胸部训练、有氧跑..."
          value={workoutName}
          onChangeText={setWorkoutName}
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>运动摘要</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{exercises.length}</Text>
            <Text style={styles.summaryLabel}>运动项目</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{calculateTotalDuration()}</Text>
            <Text style={styles.summaryLabel}>总时长(分钟)</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{calculateTotalCalories()}</Text>
            <Text style={styles.summaryLabel}>总卡路里</Text>
          </View>
        </View>
      </View>

      {exercises.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>已添加的运动</Text>
          {exercises.map((exercise, index) => (
            <View key={exercise.id} style={styles.exerciseItem}>
              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                <Text style={styles.exerciseType}>
                  {exercise.type === 'cardio' ? '有氧运动' : '力量训练'}
                </Text>
                {exercise.duration && (
                  <Text style={styles.exerciseDetail}>时长: {exercise.duration}分钟</Text>
                )}
                {exercise.distance && (
                  <Text style={styles.exerciseDetail}>距离: {exercise.distance}公里</Text>
                )}
                {exercise.sets && exercise.reps && (
                  <Text style={styles.exerciseDetail}>
                    {exercise.sets}组 x {exercise.reps}次
                    {exercise.weight && ` @ ${exercise.weight}kg`}
                  </Text>
                )}
                <Text style={styles.exerciseCalories}>
                  消耗: {exercise.caloriesBurned} 卡
                </Text>
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeExercise(index)}>
                <Text style={styles.removeButtonText}>删除</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {!showExerciseForm ? (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowExerciseForm(true)}>
          <Text style={styles.addButtonText}>+ 添加运动项目</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.exerciseForm}>
          <Text style={styles.formTitle}>添加运动项目</Text>

          {!selectedExerciseType ? (
            <View>
              <Text style={styles.label}>选择运动类型</Text>
              <View style={styles.typeButtons}>
                <TouchableOpacity
                  style={[styles.typeButton, selectedExerciseType === 'cardio' && styles.selectedTypeButton]}
                  onPress={() => selectExerciseType('cardio')}>
                  <Text style={[
                    styles.typeButtonText,
                    selectedExerciseType === 'cardio' && styles.selectedTypeText,
                  ]}>
                    🏃 有氧运动
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeButton, selectedExerciseType === 'strength' && styles.selectedTypeButton]}
                  onPress={() => selectExerciseType('strength')}>
                  <Text style={[
                    styles.typeButtonText,
                    selectedExerciseType === 'strength' && styles.selectedTypeText,
                  ]}>
                    💪 力量训练
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <ScrollView style={styles.exerciseList}>
              <Text style={styles.label}>
                选择{selectedExerciseType === 'cardio' ? '有氧' : '力量'}运动
              </Text>
              {(selectedExerciseType === 'cardio' ? cardioExercises : strengthExercises).map((ex) => (
                <TouchableOpacity
                  key={ex.subType}
                  style={[
                    styles.exerciseOption,
                    currentExercise.subType === ex.subType && styles.selectedExerciseOption,
                  ]}
                  onPress={() => selectSubType(ex.subType, ex.name)}>
                  <View>
                    <Text style={styles.exerciseOptionName}>{ex.name}</Text>
                    <Text style={styles.exerciseOptionDesc}>{ex.description}</Text>
                  </View>
                </TouchableOpacity>
              ))}

              {currentExercise.subType && (
                <View style={styles.exerciseDetailsForm}>
                  {selectedExerciseType === 'cardio' ? (
                    <>
                      <Text style={styles.label}>时长 (分钟)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="30"
                        keyboardType="numeric"
                        value={currentExercise.duration?.toString() || ''}
                        onChangeText={(text) => setCurrentExercise(prev => ({
                          ...prev,
                          duration: parseInt(text) || 0,
                        }))}
                        placeholderTextColor="#999"
                      />
                      <Text style={styles.label}>距离 (公里)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="5.0"
                        keyboardType="decimal-pad"
                        value={currentExercise.distance?.toString() || ''}
                        onChangeText={(text) => setCurrentExercise(prev => ({
                          ...prev,
                          distance: parseFloat(text) || 0,
                        }))}
                        placeholderTextColor="#999"
                      />
                    </>
                  ) : (
                    <>
                      <Text style={styles.label}>组数</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="3"
                        keyboardType="numeric"
                        value={currentExercise.sets?.toString() || ''}
                        onChangeText={(text) => setCurrentExercise(prev => ({
                          ...prev,
                          sets: parseInt(text) || 0,
                        }))}
                        placeholderTextColor="#999"
                      />
                      <Text style={styles.label}>次数</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="12"
                        keyboardType="numeric"
                        value={currentExercise.reps?.toString() || ''}
                        onChangeText={(text) => setCurrentExercise(prev => ({
                          ...prev,
                          reps: parseInt(text) || 0,
                        }))}
                        placeholderTextColor="#999"
                      />
                      <Text style={styles.label}>重量 (kg)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="20"
                        keyboardType="decimal-pad"
                        value={currentExercise.weight?.toString() || ''}
                        onChangeText={(text) => setCurrentExercise(prev => ({
                          ...prev,
                          weight: parseFloat(text) || 0,
                        }))}
                        placeholderTextColor="#999"
                      />
                      <Text style={styles.label}>预估时长 (分钟)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="20"
                        keyboardType="numeric"
                        value={currentExercise.duration?.toString() || ''}
                        onChangeText={(text) => setCurrentExercise(prev => ({
                          ...prev,
                          duration: parseInt(text) || 0,
                        }))}
                        placeholderTextColor="#999"
                      />
                    </>
                  )}
                  <Text style={styles.label}>卡路里消耗 (可选)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="自动计算"
                    keyboardType="numeric"
                    value={currentExercise.caloriesBurned?.toString() || ''}
                    onChangeText={(text) => setCurrentExercise(prev => ({
                      ...prev,
                      caloriesBurned: parseInt(text) || 0,
                    }))}
                    placeholderTextColor="#999"
                  />
                  <Text style={styles.label}>备注</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="添加备注..."
                    value={currentExercise.notes || ''}
                    onChangeText={(text) => setCurrentExercise(prev => ({
                      ...prev,
                      notes: text,
                    }))}
                    multiline
                    placeholderTextColor="#999"
                  />
                </View>
              )}

              <View style={styles.formButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowExerciseForm(false);
                    setSelectedExerciseType(null);
                    setCurrentExercise({});
                  }}>
                  <Text style={styles.cancelButtonText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.confirmButton,
                    !currentExercise.subType && styles.disabledButton,
                  ]}
                  onPress={addExercise}
                  disabled={!currentExercise.subType}>
                  <Text style={styles.confirmButtonText}>添加</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      )}

      <TouchableOpacity
        style={[styles.saveButton, (exercises.length === 0 || isLoading) && styles.disabledButton]}
        onPress={handleSave}
        disabled={exercises.length === 0 || isLoading}>
        <Text style={styles.saveButtonText}>
          {isLoading ? '保存中...' : '保存运动记录'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
    marginBottom: 15,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 15,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  summaryRow: {
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
  exerciseItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  exerciseType: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 5,
  },
  exerciseDetail: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  exerciseCalories: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f44336',
    marginTop: 5,
  },
  removeButton: {
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  removeButtonText: {
    color: '#f44336',
    fontSize: 14,
  },
  addButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  addButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
  exerciseForm: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  typeButtons: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    padding: 15,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 10,
    marginRight: 10,
    alignItems: 'center',
  },
  selectedTypeButton: {
    borderColor: '#4CAF50',
    backgroundColor: '#f0fff0',
  },
  typeButtonText: {
    fontSize: 16,
    color: '#666',
  },
  selectedTypeText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  exerciseList: {
    maxHeight: 400,
  },
  exerciseOption: {
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    marginBottom: 10,
  },
  selectedExerciseOption: {
    borderColor: '#4CAF50',
    backgroundColor: '#f0fff0',
  },
  exerciseOptionName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  exerciseOptionDesc: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  exerciseDetailsForm: {
    marginTop: 20,
  },
  formButtons: {
    flexDirection: 'row',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
  confirmButton: {
    flex: 2,
    padding: 15,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 30,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddWorkoutScreen;

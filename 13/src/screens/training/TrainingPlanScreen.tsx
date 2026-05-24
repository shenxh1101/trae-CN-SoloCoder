import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import {
  fetchPresetPlans,
  fetchUserPlans,
  createCustomPlan,
  updateTrainingPlan,
  deleteTrainingPlan,
  setActivePlan,
  setSelectedDay,
  clearTrainingPlanError,
} from '@redux/slices/trainingPlanSlice';
import {AppDispatch, RootState} from '@redux/store';
import {TrainingPlan, DayWorkout} from '@types/index';

const {width: screenWidth} = Dimensions.get('window');

type TabType = 'recommended' | 'my';
type GoalType = 'lose_fat' | 'build_muscle' | 'maintain';
type DifficultyType = 'beginner' | 'intermediate' | 'advanced';

const WEEK_DAYS = [
  {key: 'monday', label: '周一'},
  {key: 'tuesday', label: '周二'},
  {key: 'wednesday', label: '周三'},
  {key: 'thursday', label: '周四'},
  {key: 'friday', label: '周五'},
  {key: 'saturday', label: '周六'},
  {key: 'sunday', label: '周日'},
];

const TrainingPlanScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();

  const {presetPlans, userPlans, isLoading, error} = useSelector(
    (state: RootState) => state.trainingPlan
  );
  const user = useSelector((state: RootState) => state.auth.user);

  const [activeTab, setActiveTab] = useState<TabType>('recommended');
  const [selectedPlan, setSelectedPlan] = useState<TrainingPlan | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDaySelector, setShowDaySelector] = useState(false);
  const [editingPlan, setEditingPlan] = useState<TrainingPlan | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanDescription, setNewPlanDescription] = useState('');
  const [newPlanGoal, setNewPlanGoal] = useState<GoalType>('maintain');
  const [newPlanDifficulty, setNewPlanDifficulty] = useState<DifficultyType>('beginner');

  useEffect(() => {
    dispatch(fetchPresetPlans());
    if (user?.uid) {
      dispatch(fetchUserPlans(user.uid));
    }
  }, [dispatch, user?.uid]);

  useEffect(() => {
    if (error) {
      Alert.alert('错误', error, [
        {text: '确定', onPress: () => dispatch(clearTrainingPlanError())},
      ]);
    }
  }, [error, dispatch]);

  const getGoalLabel = (goal: GoalType): string => {
    const labels: Record<GoalType, string> = {
      lose_fat: '减脂',
      build_muscle: '增肌',
      maintain: '保持健康',
    };
    return labels[goal];
  };

  const getGoalEmoji = (goal: GoalType): string => {
    const emojis: Record<GoalType, string> = {
      lose_fat: '🔥',
      build_muscle: '💪',
      maintain: '❤️',
    };
    return emojis[goal];
  };

  const getDifficultyLabel = (difficulty: DifficultyType): string => {
    const labels: Record<DifficultyType, string> = {
      beginner: '初级',
      intermediate: '中级',
      advanced: '高级',
    };
    return labels[difficulty];
  };

  const getDifficultyColor = (difficulty: DifficultyType): string => {
    const colors: Record<DifficultyType, string> = {
      beginner: '#4CAF50',
      intermediate: '#FF9800',
      advanced: '#F44336',
    };
    return colors[difficulty];
  };

  const getWeeklyTrainingDays = (plan: TrainingPlan): number => {
    return Object.keys(plan.weeklySchedule).filter(
      (day) => plan.weeklySchedule[day]?.exercises?.length > 0
    ).length;
  };

  const getTotalDuration = (plan: TrainingPlan): number => {
    let total = 0;
    Object.values(plan.weeklySchedule).forEach((dayWorkout: DayWorkout) => {
      if (dayWorkout?.exercises) {
        total += dayWorkout.warmUpDuration || 0;
        total += dayWorkout.coolDownDuration || 0;
        dayWorkout.exercises.forEach((ex) => {
          if (ex.duration) total += ex.duration;
        });
      }
    });
    return Math.round(total / getWeeklyTrainingDays(plan) / 60) || 30;
  };

  const showPlanDetail = (plan: TrainingPlan) => {
    setSelectedPlan(plan);
    setShowDetailModal(true);
  };

  const handleStartTraining = (plan: TrainingPlan) => {
    setSelectedPlan(plan);
    setShowDetailModal(false);
    setShowDaySelector(true);
  };

  const handleSelectDay = (dayKey: string) => {
    if (!selectedPlan) return;
    dispatch(setActivePlan(selectedPlan));
    dispatch(setSelectedDay(dayKey));
    setShowDaySelector(false);
    navigation.navigate('ActiveWorkout', {
      plan: selectedPlan,
      day: dayKey,
    });
  };

  const handleDeletePlan = useCallback(
    (planId: string) => {
      Alert.alert('确认删除', '确定要删除这个训练计划吗？', [
        {text: '取消', style: 'cancel'},
        {
          text: '删除',
          style: 'destructive',
          onPress: () => {
            dispatch(deleteTrainingPlan(planId))
              .unwrap()
              .then(() => {
                Alert.alert('成功', '计划已删除');
              })
              .catch((err) => {
                Alert.alert('删除失败', err.message || '请稍后重试');
              });
          },
        },
      ]);
    },
    [dispatch]
  );

  const handleEditPlan = (plan: TrainingPlan) => {
    setEditingPlan(plan);
    setNewPlanName(plan.name);
    setNewPlanDescription(plan.description);
    setNewPlanGoal(plan.goal);
    setNewPlanDifficulty(plan.difficulty);
    setShowCreateModal(true);
  };

  const handleCreatePlan = () => {
    setEditingPlan(null);
    setNewPlanName('');
    setNewPlanDescription('');
    setNewPlanGoal('maintain');
    setNewPlanDifficulty('beginner');
    setShowCreateModal(true);
  };

  const handleSavePlan = () => {
    if (!newPlanName.trim()) {
      Alert.alert('提示', '请输入计划名称');
      return;
    }
    if (!user?.uid) return;

    const emptySchedule: TrainingPlan['weeklySchedule'] = {};
    WEEK_DAYS.forEach((day) => {
      emptySchedule[day.key] = {
        exercises: [],
        restBetweenExercises: 60,
        warmUpDuration: 300,
        coolDownDuration: 300,
      };
    });

    const planData: Omit<TrainingPlan, 'id'> = {
      name: newPlanName.trim(),
      description: newPlanDescription.trim(),
      userId: user.uid,
      isPreset: false,
      goal: newPlanGoal,
      difficulty: newPlanDifficulty,
      durationWeeks: 4,
      weeklySchedule: emptySchedule,
    };

    if (editingPlan) {
      dispatch(
        updateTrainingPlan({
          ...editingPlan,
          ...planData,
        })
      )
        .unwrap()
        .then(() => {
          Alert.alert('成功', '计划已更新');
          setShowCreateModal(false);
        })
        .catch((err) => {
          Alert.alert('保存失败', err.message || '请稍后重试');
        });
    } else {
      dispatch(createCustomPlan(planData))
        .unwrap()
        .then(() => {
          Alert.alert('成功', '计划已创建');
          setShowCreateModal(false);
        })
        .catch((err) => {
          Alert.alert('创建失败', err.message || '请稍后重试');
        });
    }
  };

  const renderPlanCard = (plan: TrainingPlan, showActions: boolean = false) => {
    const trainingDays = getWeeklyTrainingDays(plan);
    const avgDuration = getTotalDuration(plan);

    return (
      <TouchableOpacity
        key={plan.id}
        style={styles.planCard}
        onPress={() => showPlanDetail(plan)}>
        <View style={styles.planCardHeader}>
          <View style={styles.tagContainer}>
            <View style={styles.goalTag}>
              <Text style={styles.goalEmoji}>{getGoalEmoji(plan.goal)}</Text>
              <Text style={styles.goalTagText}>{getGoalLabel(plan.goal)}</Text>
            </View>
            <View
              style={[
                styles.difficultyTag,
                {backgroundColor: getDifficultyColor(plan.difficulty) + '20'},
              ]}>
              <Text
                style={[
                  styles.difficultyTagText,
                  {color: getDifficultyColor(plan.difficulty)},
                ]}>
                {getDifficultyLabel(plan.difficulty)}
              </Text>
            </View>
          </View>
          {showActions && (
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleEditPlan(plan);
                }}>
                <Text style={styles.actionButtonText}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleDeletePlan(plan.id);
                }}>
                <Text style={styles.actionButtonText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Text style={styles.planName}>{plan.name}</Text>
        <Text style={styles.planDescription} numberOfLines={2}>
          {plan.description}
        </Text>

        <View style={styles.planInfoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>📅</Text>
            <Text style={styles.infoText}>{trainingDays} 天/周</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>⏱️</Text>
            <Text style={styles.infoText}>约 {avgDuration} 分钟/次</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>📆</Text>
            <Text style={styles.infoText}>{plan.durationWeeks} 周</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.startButton}
          onPress={(e) => {
            e.stopPropagation();
            handleStartTraining(plan);
          }}>
          <Text style={styles.startButtonText}>开始训练</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    if (!selectedPlan) return null;
    const trainingDays = getWeeklyTrainingDays(selectedPlan);

    return (
      <Modal
        visible={showDetailModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTags}>
                <View style={styles.goalTag}>
                  <Text style={styles.goalEmoji}>
                    {getGoalEmoji(selectedPlan.goal)}
                  </Text>
                  <Text style={styles.goalTagText}>
                    {getGoalLabel(selectedPlan.goal)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.difficultyTag,
                    {
                      backgroundColor:
                        getDifficultyColor(selectedPlan.difficulty) + '20',
                    },
                  ]}>
                  <Text
                    style={[
                      styles.difficultyTagText,
                      {color: getDifficultyColor(selectedPlan.difficulty)},
                    ]}>
                    {getDifficultyLabel(selectedPlan.difficulty)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowDetailModal(false)}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalTitle}>{selectedPlan.name}</Text>
              <Text style={styles.modalDescription}>
                {selectedPlan.description}
              </Text>

              <View style={styles.overviewSection}>
                <View style={styles.overviewItem}>
                  <Text style={styles.overviewValue}>{trainingDays}</Text>
                  <Text style={styles.overviewLabel}>每周训练</Text>
                </View>
                <View style={styles.overviewDivider} />
                <View style={styles.overviewItem}>
                  <Text style={styles.overviewValue}>
                    {getTotalDuration(selectedPlan)}
                  </Text>
                  <Text style={styles.overviewLabel}>分钟/次</Text>
                </View>
                <View style={styles.overviewDivider} />
                <View style={styles.overviewItem}>
                  <Text style={styles.overviewValue}>
                    {selectedPlan.durationWeeks}
                  </Text>
                  <Text style={styles.overviewLabel}>总周期</Text>
                </View>
              </View>

              <View style={styles.scheduleSection}>
                <Text style={styles.sectionTitle}>每周安排</Text>
                {WEEK_DAYS.map((day) => {
                  const dayWorkout = selectedPlan.weeklySchedule[day.key];
                  const hasWorkout = dayWorkout?.exercises?.length > 0;
                  return (
                    <View key={day.key} style={styles.dayScheduleItem}>
                      <View style={styles.dayHeader}>
                        <Text style={styles.dayLabel}>{day.label}</Text>
                        {hasWorkout ? (
                          <View style={styles.dayHasWorkout}>
                            <Text style={styles.dayWorkoutCount}>
                              {dayWorkout.exercises.length} 个动作
                            </Text>
                          </View>
                        ) : (
                          <Text style={styles.restDayText}>休息日</Text>
                        )}
                      </View>
                      {hasWorkout && (
                        <View style={styles.exerciseList}>
                          {dayWorkout.exercises.map((ex, idx) => (
                            <View key={idx} style={styles.exerciseItem}>
                              <Text style={styles.exerciseName}>
                                {ex.exerciseName}
                              </Text>
                              <Text style={styles.exerciseDetail}>
                                {ex.sets
                                  ? `${ex.sets}组 × ${ex.reps}次`
                                  : `${ex.duration}秒`}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalStartButton}
                onPress={() => handleStartTraining(selectedPlan)}>
                <Text style={styles.modalStartButtonText}>选择日期开始训练</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderDaySelectorModal = () => {
    if (!selectedPlan) return null;

    return (
      <Modal
        visible={showDaySelector}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDaySelector(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.daySelectorContent}>
            <View style={styles.daySelectorHeader}>
              <Text style={styles.daySelectorTitle}>选择训练日期</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowDaySelector(false)}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.daySelectorPlanInfo}>
              <Text style={styles.daySelectorPlanName}>{selectedPlan.name}</Text>
              <Text style={styles.daySelectorPlanGoal}>
                {getGoalEmoji(selectedPlan.goal)} {getGoalLabel(selectedPlan.goal)}
              </Text>
            </View>

            <View style={styles.dayGrid}>
              {WEEK_DAYS.map((day) => {
                const dayWorkout = selectedPlan.weeklySchedule[day.key];
                const hasWorkout = dayWorkout?.exercises?.length > 0;
                return (
                  <TouchableOpacity
                    key={day.key}
                    style={[
                      styles.dayButton,
                      !hasWorkout && styles.dayButtonDisabled,
                    ]}
                    onPress={() => hasWorkout && handleSelectDay(day.key)}
                    disabled={!hasWorkout}>
                    <Text style={styles.dayButtonLabel}>{day.label}</Text>
                    {hasWorkout ? (
                      <Text style={styles.dayButtonExercises}>
                        {dayWorkout.exercises.length} 动作
                      </Text>
                    ) : (
                      <Text style={styles.dayButtonRest}>休息</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderCreateModal = () => {
    return (
      <Modal
        visible={showCreateModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.createModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.createModalTitle}>
                {editingPlan ? '编辑计划' : '创建新计划'}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowCreateModal(false)}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.createModalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>计划名称</Text>
                <View style={styles.textInput}>
                  <Text style={{color: '#000'}}>{newPlanName || ' '}</Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>计划描述</Text>
                <View style={[styles.textInput, styles.textArea]}>
                  <Text style={{color: '#000'}}>{newPlanDescription || ' '}</Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>训练目标</Text>
                <View style={styles.optionRow}>
                  {(['lose_fat', 'build_muscle', 'maintain'] as GoalType[]).map(
                    (goal) => (
                      <TouchableOpacity
                        key={goal}
                        style={[
                          styles.optionButton,
                          newPlanGoal === goal && styles.optionButtonActive,
                        ]}
                        onPress={() => setNewPlanGoal(goal)}>
                        <Text
                          style={[
                            styles.optionButtonText,
                            newPlanGoal === goal && styles.optionButtonTextActive,
                          ]}>
                          {getGoalEmoji(goal)} {getGoalLabel(goal)}
                        </Text>
                      </TouchableOpacity>
                    )
                  )}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>难度级别</Text>
                <View style={styles.optionRow}>
                  {(['beginner', 'intermediate', 'advanced'] as DifficultyType[]).map(
                    (diff) => (
                      <TouchableOpacity
                        key={diff}
                        style={[
                          styles.optionButton,
                          newPlanDifficulty === diff && styles.optionButtonActive,
                          {
                            borderColor:
                              newPlanDifficulty === diff
                                ? getDifficultyColor(diff)
                                : '#E0E0E0',
                          },
                        ]}
                        onPress={() => setNewPlanDifficulty(diff)}>
                        <Text
                          style={[
                            styles.optionButtonText,
                            newPlanDifficulty === diff && {
                              color: getDifficultyColor(diff),
                            },
                          ]}>
                          {getDifficultyLabel(diff)}
                        </Text>
                      </TouchableOpacity>
                    )
                  )}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.createButton}
                onPress={handleSavePlan}>
                <Text style={styles.createButtonText}>
                  {editingPlan ? '保存修改' : '创建计划'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (isLoading && presetPlans.length === 0 && userPlans.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>训练计划</Text>
        <Text style={styles.headerSubtitle}>
          选择适合你的训练方案，开启健康生活
        </Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'recommended' && styles.activeTab]}
          onPress={() => setActiveTab('recommended')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'recommended' && styles.activeTabText,
            ]}>
            推荐计划
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'my' && styles.activeTab]}
          onPress={() => setActiveTab('my')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'my' && styles.activeTabText,
            ]}>
            我的计划
            {userPlans.length > 0 && (
              <Text style={styles.tabBadge}> {userPlans.length}</Text>
            )}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'recommended' && (
          <View style={styles.listContainer}>
            {presetPlans.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>📋</Text>
                <Text style={styles.emptyTitle}>暂无推荐计划</Text>
                <Text style={styles.emptyDesc}>请稍后再来查看</Text>
              </View>
            ) : (
              presetPlans.map((plan) => renderPlanCard(plan, false))
            )}
          </View>
        )}

        {activeTab === 'my' && (
          <View style={styles.listContainer}>
            <TouchableOpacity
              style={styles.createPlanButton}
              onPress={handleCreatePlan}>
              <Text style={styles.createPlanIcon}>➕</Text>
              <Text style={styles.createPlanText}>创建新计划</Text>
            </TouchableOpacity>

            {userPlans.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>💪</Text>
                <Text style={styles.emptyTitle}>暂无自定义计划</Text>
                <Text style={styles.emptyDesc}>
                  点击上方按钮创建你的专属训练计划
                </Text>
              </View>
            ) : (
              userPlans.map((plan) => renderPlanCard(plan, true))
            )}
          </View>
        )}
      </ScrollView>

      {renderDetailModal()}
      {renderDaySelectorModal()}
      {renderCreateModal()}
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
  tabBadge: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  listContainer: {
    paddingBottom: 20,
  },
  createPlanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 15,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#4CAF50',
  },
  createPlanIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  createPlanText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  planCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tagContainer: {
    flexDirection: 'row',
    flex: 1,
    flexWrap: 'wrap',
  },
  goalTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 4,
  },
  goalEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  goalTagText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  difficultyTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 4,
  },
  difficultyTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  actionButtonText: {
    fontSize: 14,
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  planDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  planInfoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  infoIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#999',
  },
  startButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTags: {
    flexDirection: 'row',
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginBottom: 16,
  },
  overviewSection: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  overviewItem: {
    flex: 1,
    alignItems: 'center',
  },
  overviewValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  overviewLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  overviewDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E0E0E0',
  },
  scheduleSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  dayScheduleItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  dayHasWorkout: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dayWorkoutCount: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  restDayText: {
    fontSize: 12,
    color: '#999',
  },
  exerciseList: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 8,
  },
  exerciseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  exerciseName: {
    fontSize: 13,
    color: '#666',
  },
  exerciseDetail: {
    fontSize: 13,
    color: '#999',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  modalStartButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalStartButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  daySelectorContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  daySelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  daySelectorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  daySelectorPlanInfo: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  daySelectorPlanName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  daySelectorPlanGoal: {
    fontSize: 14,
    color: '#666',
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  dayButton: {
    width: (screenWidth - 60) / 3,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    margin: 5,
  },
  dayButtonDisabled: {
    backgroundColor: '#f5f5f5',
    opacity: 0.6,
  },
  dayButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 4,
  },
  dayButtonExercises: {
    fontSize: 12,
    color: '#666',
  },
  dayButtonRest: {
    fontSize: 12,
    color: '#999',
  },
  createModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  createModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  createModalBody: {
    padding: 20,
    maxHeight: 400,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 14,
    minHeight: 48,
  },
  textArea: {
    minHeight: 80,
  },
  optionRow: {
    flexDirection: 'row',
    marginHorizontal: -5,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  optionButtonActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  optionButtonText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  optionButtonTextActive: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

export default TrainingPlanScreen;

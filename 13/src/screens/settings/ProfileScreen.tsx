import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {useNavigation, NavigationProp} from '@react-navigation/native';
import {launchCamera, launchImageLibrary, Asset, CameraOptions, ImageLibraryOptions} from 'react-native-image-picker';
import {updateUserProfile, updateUserPhoto, fetchUserProfile} from '@redux/slices/userSlice';
import {AppDispatch, RootState} from '@redux/store';
import {User} from '@types/index';
import {recommendationService} from '@services/recommendationService';

const {width} = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 4;

type RootStackParamList = {
  Settings: undefined;
};

interface EditFormData {
  displayName: string;
  gender: 'male' | 'female';
  age: string;
  height: string;
  weight: string;
}

interface StatCardProps {
  icon: string;
  value: string;
  label: string;
}

const StatCard: React.FC<StatCardProps> = ({icon, value, label}) => (
  <View style={styles.statCard}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const ProfileScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const userProfile = useSelector((state: RootState) => state.user.profile);
  const authUser = useSelector((state: RootState) => state.auth.user);
  const isLoading = useSelector((state: RootState) => state.user.isLoading);
  const workouts = useSelector((state: RootState) => state.workout.workouts);
  const badges = useSelector((state: RootState) => state.challenge.badges || []);

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState<EditFormData>({
    displayName: '',
    gender: 'male',
    age: '',
    height: '',
    weight: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  useEffect(() => {
    if (authUser?.uid && !userProfile) {
      dispatch(fetchUserProfile(authUser.uid));
    }
  }, [dispatch, authUser?.uid, userProfile]);

  useEffect(() => {
    if (userProfile) {
      setEditForm({
        displayName: userProfile.displayName || '',
        gender: (userProfile.gender as 'male' | 'female') || 'male',
        age: userProfile.age?.toString() || '',
        height: userProfile.height?.toString() || '',
        weight: userProfile.weight?.toString() || '',
      });
    }
  }, [userProfile]);

  const getFitnessGoalText = (goal: User['fitnessGoal']): string => {
    const goalMap: Record<User['fitnessGoal'], string> = {
      lose_fat: '减脂',
      build_muscle: '增肌',
      maintain: '保持健康',
    };
    return goalMap[goal] || '未设置';
  };

  const getGenderText = (gender?: User['gender']): string => {
    const genderMap: Record<string, string> = {
      male: '男',
      female: '女',
      other: '其他',
    };
    return gender ? genderMap[gender] || '未设置' : '未设置';
  };

  const calculateBMI = (): number => {
    if (!userProfile?.weight || !userProfile?.height) return 0;
    return recommendationService.calculateBMI(userProfile.weight, userProfile.height);
  };

  const getBMIStatus = () => {
    const bmi = calculateBMI();
    return recommendationService.getBMIStatus(bmi);
  };

  const getTotalWorkouts = (): number => {
    return workouts?.length || 0;
  };

  const getTotalDuration = (): number => {
    if (!workouts) return 0;
    return workouts.reduce((total, workout) => total + (workout.totalDuration || 0), 0);
  };

  const getTotalCalories = (): number => {
    if (!workouts) return 0;
    return workouts.reduce((total, workout) => total + (workout.totalCalories || 0), 0);
  };

  const getStreakDays = (): number => {
    if (!workouts || workouts.length === 0) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streak = 0;
    const workoutDates = new Set(
      workouts.map(w => {
        const date = new Date(w.date);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
      })
    );
    let checkDate = new Date(today);
    while (workoutDates.has(checkDate.getTime())) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
    return streak;
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}分钟`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}小时${mins}分` : `${hours}小时`;
  };

  const handleChangePhoto = () => {
    Alert.alert(
      '更换头像',
      '请选择图片来源',
      [
        {
          text: '拍照',
          onPress: () => openCamera(),
        },
        {
          text: '从相册选择',
          onPress: () => openImageLibrary(),
        },
        {
          text: '取消',
          style: 'cancel',
        },
      ],
      {cancelable: true}
    );
  };

  const openCamera = async () => {
    const options: CameraOptions = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 1024,
      maxWidth: 1024,
      quality: 0.8,
      saveToPhotos: true,
    };
    try {
      const result = await launchCamera(options);
      if (!result.didCancel && result.assets && result.assets.length > 0) {
        handlePhotoSelected(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('错误', '打开相机失败，请检查权限设置');
    }
  };

  const openImageLibrary = async () => {
    const options: ImageLibraryOptions = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 1024,
      maxWidth: 1024,
      quality: 0.8,
      selectionLimit: 1,
    };
    try {
      const result = await launchImageLibrary(options);
      if (!result.didCancel && result.assets && result.assets.length > 0) {
        handlePhotoSelected(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('错误', '打开相册失败，请检查权限设置');
    }
  };

  const handlePhotoSelected = async (asset: Asset) => {
    if (!asset.uri || !authUser?.uid) return;
    setIsUploadingPhoto(true);
    try {
      await dispatch(updateUserPhoto({userId: authUser.uid, photoUri: asset.uri})).unwrap();
      Alert.alert('成功', '头像更新成功');
    } catch (error) {
      Alert.alert('错误', '头像更新失败，请重试');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleEditProfile = () => {
    setIsEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!editForm.displayName.trim()) {
      Alert.alert('提示', '请输入昵称');
      return;
    }
    const age = parseInt(editForm.age);
    const height = parseFloat(editForm.height);
    const weight = parseFloat(editForm.weight);
    if (age && (age < 10 || age > 120)) {
      Alert.alert('提示', '请输入有效的年龄（10-120岁）');
      return;
    }
    if (height && (height < 50 || height > 250)) {
      Alert.alert('提示', '请输入有效的身高（50-250cm）');
      return;
    }
    if (weight && (weight < 20 || weight > 300)) {
      Alert.alert('提示', '请输入有效的体重（20-300kg）');
      return;
    }
    if (!authUser?.uid || !userProfile?.id) return;
    setIsUpdating(true);
    try {
      const updates: Partial<User> & {id: string} = {
        id: userProfile.id,
        displayName: editForm.displayName.trim(),
        gender: editForm.gender,
        age: age || undefined,
        height: height || undefined,
        weight: weight || undefined,
      };
      await dispatch(updateUserProfile(updates)).unwrap();
      setIsEditModalVisible(false);
      Alert.alert('成功', '个人资料更新成功');
    } catch (error) {
      Alert.alert('错误', '更新失败，请重试');
    } finally {
      setIsUpdating(false);
    }
  };

  const renderEditModal = () => (
    <Modal
      visible={isEditModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setIsEditModalVisible(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>编辑个人资料</Text>
            <TouchableOpacity
              onPress={() => setIsEditModalVisible(false)}
              style={styles.modalCloseButton}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>昵称</Text>
              <TextInput
                style={styles.formInput}
                value={editForm.displayName}
                onChangeText={(text) => setEditForm({...editForm, displayName: text})}
                placeholder="请输入昵称"
                placeholderTextColor="#999"
                maxLength={20}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>性别</Text>
              <View style={styles.genderContainer}>
                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    editForm.gender === 'male' && styles.genderButtonActive,
                  ]}
                  onPress={() => setEditForm({...editForm, gender: 'male'})}>
                  <Text
                    style={[
                      styles.genderButtonText,
                      editForm.gender === 'male' && styles.genderButtonTextActive,
                    ]}>
                    男
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    editForm.gender === 'female' && styles.genderButtonActive,
                  ]}
                  onPress={() => setEditForm({...editForm, gender: 'female'})}>
                  <Text
                    style={[
                      styles.genderButtonText,
                      editForm.gender === 'female' && styles.genderButtonTextActive,
                    ]}>
                    女
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>年龄</Text>
              <TextInput
                style={styles.formInput}
                value={editForm.age}
                onChangeText={(text) => setEditForm({...editForm, age: text.replace(/[^0-9]/g, '')})}
                placeholder="请输入年龄"
                placeholderTextColor="#999"
                keyboardType="number-pad"
                maxLength={3}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>身高 (cm)</Text>
              <TextInput
                style={styles.formInput}
                value={editForm.height}
                onChangeText={(text) => setEditForm({...editForm, height: text.replace(/[^0-9.]/g, '')})}
                placeholder="请输入身高"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
                maxLength={5}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>体重 (kg)</Text>
              <TextInput
                style={styles.formInput}
                value={editForm.weight}
                onChangeText={(text) => setEditForm({...editForm, weight: text.replace(/[^0-9.]/g, '')})}
                placeholder="请输入体重"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
                maxLength={5}
              />
            </View>
          </ScrollView>
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setIsEditModalVisible(false)}>
              <Text style={styles.cancelButtonText}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveProfile}
              disabled={isUpdating}>
              {isUpdating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>保存</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (isLoading && !userProfile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  const bmi = calculateBMI();
  const bmiStatus = getBMIStatus();
  const totalWorkouts = getTotalWorkouts();
  const totalDuration = getTotalDuration();
  const totalCalories = getTotalCalories();
  const streakDays = getStreakDays();
  const badgeCount = badges?.length || 0;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>个人资料</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.profileHeader}>
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={handleChangePhoto}
            disabled={isUploadingPhoto}>
            {isUploadingPhoto ? (
              <View style={[styles.avatar, styles.avatarLoading]}>
                <ActivityIndicator size="large" color="#4CAF50" />
              </View>
            ) : userProfile?.photoURL ? (
              <Image
                source={{uri: userProfile.photoURL}}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>
                  {userProfile?.displayName?.charAt(0) || '用'}
                </Text>
              </View>
            )}
            <View style={styles.avatarEditIcon}>
              <Text style={styles.avatarEditIconText}>📷</Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.userName}>{userProfile?.displayName || '健身爱好者'}</Text>
          <Text style={styles.userPhone}>{userProfile?.phoneNumber || userProfile?.email || '未绑定'}</Text>

          <TouchableOpacity
            style={styles.editButton}
            onPress={handleEditProfile}>
            <Text style={styles.editButtonText}>✎ 编辑资料</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>健身目标</Text>
          <View style={styles.card}>
            <View style={styles.goalRow}>
              <Text style={styles.goalIcon}>🎯</Text>
              <View style={styles.goalInfo}>
                <Text style={styles.goalText}>
                  {getFitnessGoalText(userProfile?.fitnessGoal || 'maintain')}
                </Text>
                <Text style={styles.goalSubText}>当前健身目标</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>基本信息</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoIcon}>👤</Text>
                <Text style={styles.infoLabel}>性别</Text>
                <Text style={styles.infoValue}>{getGenderText(userProfile?.gender)}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoIcon}>🎂</Text>
                <Text style={styles.infoLabel}>年龄</Text>
                <Text style={styles.infoValue}>{userProfile?.age ? `${userProfile.age}岁` : '未设置'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoIcon}>📏</Text>
                <Text style={styles.infoLabel}>身高</Text>
                <Text style={styles.infoValue}>{userProfile?.height ? `${userProfile.height}cm` : '未设置'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoIcon}>⚖️</Text>
                <Text style={styles.infoLabel}>体重</Text>
                <Text style={styles.infoValue}>{userProfile?.weight ? `${userProfile.weight}kg` : '未设置'}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>身体质量指数 (BMI)</Text>
          <View style={styles.card}>
            <View style={styles.bmiRow}>
              <View style={styles.bmiValueContainer}>
                <Text style={styles.bmiValue}>{bmi > 0 ? bmi.toFixed(1) : '--'}</Text>
                <Text
                  style={[
                    styles.bmiStatus,
                    {color: bmi > 0 ? bmiStatus.color : '#999'},
                  ]}>
                  {bmi > 0 ? bmiStatus.status : '未计算'}
                </Text>
              </View>
              <View style={styles.bmiDescriptionContainer}>
                <Text style={styles.bmiDescription}>
                  {bmi > 0 ? bmiStatus.description : '请先设置身高和体重以计算BMI'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>健身统计</Text>
          <View style={styles.statsContainer}>
            <StatCard icon="🏋️" value={totalWorkouts.toString()} label="运动次数" />
            <StatCard icon="⏱️" value={formatDuration(totalDuration)} label="运动时长" />
            <StatCard icon="🔥" value={totalCalories.toString()} label="消耗卡路里" />
            <StatCard icon="📅" value={`${streakDays}天`} label="连续打卡" />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>成就徽章</Text>
          <View style={styles.card}>
            <View style={styles.badgeRow}>
              <View style={styles.badgeIconContainer}>
                <Text style={styles.badgeIcon}>🏆</Text>
              </View>
              <View style={styles.badgeInfo}>
                <Text style={styles.badgeCount}>{badgeCount}</Text>
                <Text style={styles.badgeLabel}>已获得徽章</Text>
              </View>
              <View style={styles.badgeArrow}>
                <Text style={styles.badgeArrowText}>›</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {renderEditModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 28,
    color: '#333',
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerRight: {
    width: 40,
  },
  profileHeader: {
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 24,
    marginBottom: 12,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e0e0e0',
  },
  avatarLoading: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  avatarEditIcon: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarEditIconText: {
    fontSize: 14,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  editButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  goalInfo: {
    flex: 1,
  },
  goalText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  goalSubText: {
    fontSize: 14,
    color: '#999',
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  infoItem: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  bmiRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bmiValueContainer: {
    alignItems: 'center',
    marginRight: 20,
    paddingRight: 20,
    borderRightWidth: 1,
    borderRightColor: '#f0f0f0',
  },
  bmiValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
  },
  bmiStatus: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  bmiDescriptionContainer: {
    flex: 1,
  },
  bmiDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  statCard: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF9C4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  badgeIcon: {
    fontSize: 32,
  },
  badgeInfo: {
    flex: 1,
  },
  badgeCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  badgeLabel: {
    fontSize: 14,
    color: '#999',
  },
  badgeArrow: {
    paddingHorizontal: 8,
  },
  badgeArrowText: {
    fontSize: 24,
    color: '#ccc',
  },
  bottomSpacing: {
    height: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 20,
    color: '#999',
  },
  formGroup: {
    padding: 20,
    paddingBottom: 0,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fafafa',
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  genderButtonActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  genderButtonText: {
    fontSize: 16,
    color: '#666',
  },
  genderButtonTextActive: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default ProfileScreen;

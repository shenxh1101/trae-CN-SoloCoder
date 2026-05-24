import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import {createUserProfile} from '@redux/slices/userSlice';
import {recommendationService} from '@services/recommendationService';
import {AppDispatch, RootState} from '@redux/store';

type GoalType = 'lose_fat' | 'build_muscle' | 'maintain';
type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
type Gender = 'male' | 'female' | 'other';

const GoalSetupScreen = () => {
  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState<GoalType>('maintain');
  const [gender, setGender] = useState<Gender | null>(null);
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [displayName, setDisplayName] = useState('');

  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const {user} = useSelector((state: RootState) => state.auth);
  const {isLoading} = useSelector((state: RootState) => state.user);

  const goals = [
    {id: 'lose_fat', title: '减脂', description: '燃烧脂肪，塑造身材', icon: '🔥'},
    {id: 'build_muscle', title: '增肌', description: '增加肌肉，增强力量', icon: '💪'},
    {id: 'maintain', title: '保持健康', description: '维持健康，提升活力', icon: '❤️'},
  ];

  const activityLevels = [
    {id: 'sedentary', title: '久坐不动', description: '几乎不运动'},
    {id: 'light', title: '轻度活动', description: '每周1-3次运动'},
    {id: 'moderate', title: '中度活动', description: '每周3-5次运动'},
    {id: 'active', title: '活跃', description: '每周6-7次运动'},
    {id: 'very_active', title: '非常活跃', description: '几乎每天运动'},
  ];

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    try {
      const userData = {
        id: user?.uid || Math.random().toString(),
        phoneNumber: user?.phoneNumber,
        email: user?.email,
        displayName: displayName || '健身爱好者',
        photoURL: user?.photoURL,
        fitnessGoal: goal,
        height: parseFloat(height),
        weight: parseFloat(weight),
        age: parseInt(age),
        gender: gender || undefined,
        activityLevel,
        isPremium: false,
        createdAt: new Date(),
      };

      await dispatch(createUserProfile(userData)).unwrap();
      Alert.alert('设置完成', '开始你的健身之旅吧！');
    } catch (err: any) {
      Alert.alert('错误', err.message || '保存失败');
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return !!goal;
      case 2:
        return !!gender && !!age && age.length > 0;
      case 3:
        return !!height && !!weight && height.length > 0 && weight.length > 0;
      case 4:
        return !!activityLevel;
      default:
        return false;
    }
  };

  const calorieInfo = height && weight && age && gender
    ? recommendationService.calculateCalorieRecommendation({
        goal,
        activityLevel,
        age: parseInt(age),
        gender,
        weight: parseFloat(weight),
        height: parseFloat(height),
      })
    : null;

  const renderStep1 = () => (
    <View>
      <Text style={styles.stepTitle}>你的健身目标是什么？</Text>
      <Text style={styles.stepSubtitle}>选择最适合你的目标</Text>
      {goals.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={[
            styles.goalCard,
            goal === item.id && styles.selectedCard,
          ]}
          onPress={() => setGoal(item.id as GoalType)}>
          <Text style={styles.goalIcon}>{item.icon}</Text>
          <View style={styles.goalInfo}>
            <Text style={styles.goalTitle}>{item.title}</Text>
            <Text style={styles.goalDescription}>{item.description}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderStep2 = () => (
    <View>
      <Text style={styles.stepTitle}>基本信息</Text>
      <Text style={styles.stepSubtitle}>帮助我们更好地了解你</Text>
      
      <Text style={styles.label}>性别</Text>
      <View style={styles.genderContainer}>
        {(['male', 'female', 'other'] as Gender[]).map((g) => (
          <TouchableOpacity
            key={g}
            style={[
              styles.genderButton,
              gender === g && styles.selectedGenderButton,
            ]}
            onPress={() => setGender(g)}>
            <Text style={[
              styles.genderButtonText,
              gender === g && styles.selectedGenderText,
            ]}>
              {g === 'male' ? '男' : g === 'female' ? '女' : '其他'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>年龄</Text>
      <TextInput
        style={styles.input}
        placeholder="请输入年龄"
        keyboardType="numeric"
        value={age}
        onChangeText={setAge}
        placeholderTextColor="#999"
      />

      <Text style={styles.label}>昵称</Text>
      <TextInput
        style={styles.input}
        placeholder="给自己起个昵称吧"
        value={displayName}
        onChangeText={setDisplayName}
        placeholderTextColor="#999"
      />
    </View>
  );

  const renderStep3 = () => (
    <View>
      <Text style={styles.stepTitle}>身体数据</Text>
      <Text style={styles.stepSubtitle}>帮助我们计算推荐摄入量</Text>
      
      <Text style={styles.label}>身高 (cm)</Text>
      <TextInput
        style={styles.input}
        placeholder="请输入身高"
        keyboardType="numeric"
        value={height}
        onChangeText={setHeight}
        placeholderTextColor="#999"
      />

      <Text style={styles.label}>体重 (kg)</Text>
      <TextInput
        style={styles.input}
        placeholder="请输入体重"
        keyboardType="numeric"
        value={weight}
        onChangeText={setWeight}
        placeholderTextColor="#999"
      />

      {calorieInfo && (
        <View style={styles.calorieCard}>
          <Text style={styles.calorieTitle}>每日推荐</Text>
          <View style={styles.calorieRow}>
            <View style={styles.calorieItem}>
              <Text style={styles.calorieValue}>{calorieInfo.targetCalories}</Text>
              <Text style={styles.calorieLabel}>卡路里</Text>
            </View>
            <View style={styles.calorieItem}>
              <Text style={styles.calorieValue}>{calorieInfo.protein}g</Text>
              <Text style={styles.calorieLabel}>蛋白质</Text>
            </View>
            <View style={styles.calorieItem}>
              <Text style={styles.calorieValue}>{calorieInfo.carbs}g</Text>
              <Text style={styles.calorieLabel}>碳水</Text>
            </View>
            <View style={styles.calorieItem}>
              <Text style={styles.calorieValue}>{calorieInfo.fat}g</Text>
              <Text style={styles.calorieLabel}>脂肪</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );

  const renderStep4 = () => (
    <View>
      <Text style={styles.stepTitle}>活动水平</Text>
      <Text style={styles.stepSubtitle}>选择最符合你日常的活动量</Text>
      {activityLevels.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={[
            styles.activityCard,
            activityLevel === item.id && styles.selectedCard,
          ]}
          onPress={() => setActivityLevel(item.id as ActivityLevel)}>
          <View style={styles.activityInfo}>
            <Text style={styles.activityTitle}>{item.title}</Text>
            <Text style={styles.activityDescription}>{item.description}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.progressContainer}>
        {[1, 2, 3, 4].map((s) => (
          <View key={s} style={[
            styles.progressDot,
            step >= s && styles.activeProgressDot,
          ]} />
        ))}
      </View>

      <ScrollView style={styles.scrollView}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </ScrollView>

      <View style={styles.buttonContainer}>
        {step > 1 && (
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>上一步</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.nextButton,
            !canProceed() && styles.disabledButton,
          ]}
          onPress={handleNext}
          disabled={!canProceed() || isLoading}>
          <Text style={styles.nextButtonText}>
            {isLoading ? '保存中...' : step === 4 ? '完成' : '下一步'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ddd',
    marginHorizontal: 5,
  },
  activeProgressDot: {
    backgroundColor: '#4CAF50',
    width: 30,
  },
  scrollView: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  goalCard: {
    flexDirection: 'row',
    padding: 20,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 12,
    marginBottom: 15,
    alignItems: 'center',
  },
  selectedCard: {
    borderColor: '#4CAF50',
    backgroundColor: '#f0fff0',
  },
  goalIcon: {
    fontSize: 40,
    marginRight: 15,
  },
  goalInfo: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  goalDescription: {
    fontSize: 14,
    color: '#666',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 15,
    marginBottom: 10,
  },
  genderContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  genderButton: {
    flex: 1,
    padding: 15,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 10,
    marginRight: 10,
    alignItems: 'center',
  },
  selectedGenderButton: {
    borderColor: '#4CAF50',
    backgroundColor: '#f0fff0',
  },
  genderButtonText: {
    fontSize: 16,
    color: '#666',
  },
  selectedGenderText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#333',
  },
  calorieCard: {
    marginTop: 20,
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  calorieTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
  },
  calorieRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  calorieItem: {
    alignItems: 'center',
  },
  calorieValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  calorieLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  activityCard: {
    padding: 20,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 12,
    marginBottom: 15,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  activityDescription: {
    fontSize: 14,
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 20,
  },
  backButton: {
    flex: 1,
    height: 50,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  backButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 2,
    height: 50,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default GoalSetupScreen;

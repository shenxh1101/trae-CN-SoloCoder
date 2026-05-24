import {User, TrainingPlan, ExerciseType, CardioExercise, StrengthExercise} from '@types/index';
import firestore from '@react-native-firebase/firestore';

interface RecommendationParams {
  goal: 'lose_fat' | 'build_muscle' | 'maintain';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  age?: number;
  gender?: 'male' | 'female' | 'other';
  weight?: number;
  height?: number;
  availableEquipment?: string[];
  preferredExercises?: string[];
}

interface CalorieRecommendation {
  bmr: number;
  tdee: number;
  targetCalories: number;
  protein: number;
  carbs: number;
  fat: number;
}

class RecommendationService {
  calculateBMR(weight: number, height: number, age: number, gender: 'male' | 'female' | 'other'): number {
    if (gender === 'male') {
      return Math.round(88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age));
    } else if (gender === 'female') {
      return Math.round(447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age));
    } else {
      return Math.round((13.397 * weight + 4.799 * height - 5.677 * age + 447.593 + 88.362) / 2);
    }
  }

  calculateTDEE(bmr: number, activityLevel: string): number {
    const activityMultipliers: Record<string, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };
    return Math.round(bmr * (activityMultipliers[activityLevel] || 1.2));
  }

  calculateCalorieRecommendation(params: RecommendationParams): CalorieRecommendation {
    const {weight, height, age, gender, activityLevel, goal} = params;
    
    if (!weight || !height || !age || !gender) {
      return {
        bmr: 0,
        tdee: 0,
        targetCalories: 2000,
        protein: 120,
        carbs: 200,
        fat: 60,
      };
    }

    const bmr = this.calculateBMR(weight, height, age, gender);
    const tdee = this.calculateTDEE(bmr, activityLevel);

    let targetCalories = tdee;
    if (goal === 'lose_fat') {
      targetCalories = Math.round(tdee * 0.8);
    } else if (goal === 'build_muscle') {
      targetCalories = Math.round(tdee * 1.15);
    }

    const protein = Math.round(weight * 1.8);
    const fat = Math.round(targetCalories * 0.25 / 9);
    const carbs = Math.round((targetCalories - protein * 4 - fat * 9) / 4);

    return {
      bmr,
      tdee,
      targetCalories,
      protein,
      carbs,
      fat,
    };
  }

  async getRecommendedPlans(params: RecommendationParams): Promise<TrainingPlan[]> {
    const {goal, activityLevel} = params;
    
    let difficulty: 'beginner' | 'intermediate' | 'advanced' = 'beginner';
    if (activityLevel === 'moderate') {
      difficulty = 'intermediate';
    } else if (activityLevel === 'active' || activityLevel === 'very_active') {
      difficulty = 'advanced';
    }

    const snapshot = await firestore()
      .collection('training_plans')
      .where('isPreset', '==', true)
      .where('goal', '==', goal)
      .where('difficulty', '==', difficulty)
      .limit(5)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as TrainingPlan[];
  }

  generateWeeklyPlan(params: RecommendationParams): {[key: string]: string[]} {
    const {goal} = params;
    
    const plans: Record<string, {[key: string]: string[]}> = {
      lose_fat: {
        monday: ['running', 'jumping_jacks', 'burpees', 'mountain_climbers'],
        tuesday: ['squat', 'lunges', 'deadlift', 'plank'],
        wednesday: ['cycling', 'swimming', 'high_knees'],
        thursday: ['bench_press', 'push_up', 'shoulder_press', 'pull_up'],
        friday: ['running', 'jump_squat', 'burpees', 'box_jumps'],
        saturday: ['yoga', 'stretching'],
        sunday: ['rest'],
      },
      build_muscle: {
        monday: ['bench_press', 'push_up', 'chest_fly', 'tricep_dips'],
        tuesday: ['squat', 'leg_press', 'lunges', 'calf_raises'],
        wednesday: ['rest', 'light_stretching'],
        thursday: ['pull_up', 'deadlift', 'rows', 'bicep_curls'],
        friday: ['shoulder_press', 'lateral_raises', 'face_pulls'],
        saturday: ['deadlift', 'squat', 'lunges', 'plank'],
        sunday: ['rest'],
      },
      maintain: {
        monday: ['running', 'squat', 'push_up', 'plank'],
        tuesday: ['cycling', 'lunges', 'pull_up', 'stretching'],
        wednesday: ['swimming', 'yoga'],
        thursday: ['running', 'deadlift', 'shoulder_press', 'plank'],
        friday: ['cycling', 'bench_press', 'rows', 'calf_raises'],
        saturday: ['hiit', 'burpees', 'mountain_climbers'],
        sunday: ['rest'],
      },
    };

    return plans[goal] || plans.maintain;
  }

  getExerciseRecommendations(type: ExerciseType, goal: string): {subType: CardioExercise | StrengthExercise; name: string; description: string}[] {
    if (type === 'cardio') {
      return [
        {subType: 'running', name: '跑步', description: '高效燃脂有氧运动，提高心肺功能'},
        {subType: 'cycling', name: '骑行', description: '低冲击有氧训练，保护膝盖'},
        {subType: 'swimming', name: '游泳', description: '全身有氧运动，锻炼所有肌群'},
        {subType: 'walking', name: '快走', description: '温和的有氧运动，适合所有人群'},
        {subType: 'jumping_rope', name: '跳绳', description: '高效燃脂，提高协调性'},
      ];
    } else {
      const strengthExercises = [
        {subType: 'squat', name: '深蹲', description: '下肢力量训练之王'},
        {subType: 'bench_press', name: '卧推', description: '胸部和上肢力量训练'},
        {subType: 'deadlift', name: '硬拉', description: '全身力量训练，刺激多个肌群'},
        {subType: 'shoulder_press', name: '肩推', description: '肩部力量训练'},
        {subType: 'pull_up', name: '引体向上', description: '背部和上肢力量训练'},
        {subType: 'push_up', name: '俯卧撑', description: '胸部、肩部和核心训练'},
        {subType: 'lunges', name: '箭步蹲', description: '下肢单腿力量训练'},
        {subType: 'plank', name: '平板支撑', description: '核心稳定性训练'},
      ];

      if (goal === 'lose_fat') {
        return strengthExercises.filter(e => 
          ['squat', 'deadlift', 'lunges', 'burpees'].includes(e.subType)
        );
      } else if (goal === 'build_muscle') {
        return strengthExercises;
      } else {
        return strengthExercises.slice(0, 5);
      }
    }
  }

  calculateCaloriesBurned(
    exerciseType: string,
    duration: number,
    weight: number,
    intensity: 'low' | 'medium' | 'high' = 'medium'
  ): number {
    const metValues: Record<string, Record<string, number>> = {
      running: {low: 6.0, medium: 9.8, high: 14.0},
      cycling: {low: 4.0, medium: 8.0, high: 12.0},
      swimming: {low: 5.0, medium: 8.0, high: 12.0},
      walking: {low: 2.5, medium: 3.5, high: 5.0},
      jumping_rope: {low: 8.0, medium: 12.0, high: 16.0},
      squat: {low: 3.5, medium: 5.0, high: 8.0},
      bench_press: {low: 3.0, medium: 5.0, high: 7.0},
      deadlift: {low: 4.0, medium: 6.0, high: 9.0},
      default: {low: 3.0, medium: 5.0, high: 7.0},
    };

    const met = metValues[exerciseType]?.[intensity] || metValues.default[intensity];
    const durationHours = duration / 60;
    return Math.round(met * weight * durationHours);
  }

  calculateWaterIntake(weight: number, activityLevel: string): number {
    const baseIntake = weight * 35;
    const activityMultipliers: Record<string, number> = {
      sedentary: 1.0,
      light: 1.1,
      moderate: 1.2,
      active: 1.3,
      very_active: 1.4,
    };
    return Math.round(baseIntake * (activityMultipliers[activityLevel] || 1.0));
  }

  getMotivationalMessage(goal: string, progress: number): string {
    const messages: Record<string, string[]> = {
      lose_fat: [
        '每一步都是向着目标前进！💪',
        '坚持下去，你正在变得更好！',
        '汗水是脂肪在哭泣！🔥',
        '你的努力终将有回报！',
      ],
      build_muscle: [
        '感受肌肉的燃烧！💪',
        '每一次举起都是进步！',
        '坚持训练，成就更强的自己！',
        '没有痛苦就没有收获！',
      ],
      maintain: [
        '保持健康的生活方式！🌟',
        '规律运动，享受生活！',
        '健康是最大的财富！',
        '每一天都是新的开始！',
      ],
    };

    const goalMessages = messages[goal] || messages.maintain;
    return goalMessages[Math.floor(Math.random() * goalMessages.length)];
  }

  calculateBMI(weight: number, height: number): number {
    if (!weight || !height) return 0;
    const heightInMeters = height / 100;
    return Math.round((weight / (heightInMeters * heightInMeters)) * 10) / 10;
  }

  getBMIStatus(bmi: number): {status: string; color: string; description: string} {
    if (bmi < 18.5) {
      return {
        status: '偏瘦',
        color: '#2196F3',
        description: '建议适当增加营养摄入，保持健康体重',
      };
    } else if (bmi < 24) {
      return {
        status: '正常',
        color: '#4CAF50',
        description: '体重处于健康范围，继续保持！',
      };
    } else if (bmi < 28) {
      return {
        status: '偏胖',
        color: '#FF9800',
        description: '建议适当控制饮食，增加有氧运动',
      };
    } else {
      return {
        status: '肥胖',
        color: '#F44336',
        description: '建议咨询医生，制定科学的减重计划',
      };
    }
  }
}

export const recommendationService = new RecommendationService();

export interface User {
  id: string;
  phoneNumber?: string;
  email?: string;
  displayName: string;
  photoURL?: string;
  fitnessGoal: 'lose_fat' | 'build_muscle' | 'maintain';
  height?: number;
  weight?: number;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  isPremium: boolean;
  createdAt: Date;
  privacySettings: PrivacySettings;
  notificationSettings: NotificationSettings;
}

export type Visibility = 'public' | 'friends' | 'private';

export interface PrivacySettings {
  profileVisibility: Visibility;
  workoutVisibility: Visibility;
  bodyDataVisibility: Visibility;
  leaderboardVisible: boolean;
  postDefaultVisibility: Visibility;
  allowFriendRequests: boolean;
  locationSharing: boolean;
}

export interface NotificationSettings {
  waterReminder: boolean;
  workoutReminder: boolean;
  sedentaryReminder: boolean;
  socialNotifications: boolean;
  challengeNotifications: boolean;
  waterReminderInterval: number;
  workoutReminderTime: string;
  sedentaryReminderInterval: number;
}

export type ExerciseType = 'cardio' | 'strength';
export type CardioExercise = 'running' | 'cycling' | 'swimming' | 'walking' | 'jumping_rope';
export type StrengthExercise = 'squat' | 'bench_press' | 'deadlift' | 'shoulder_press' | 'pull_up' | 'push_up' | 'lunges' | 'plank';

export interface Exercise {
  id: string;
  name: string;
  type: ExerciseType;
  subType: CardioExercise | StrengthExercise;
  duration?: number;
  distance?: number;
  sets?: number;
  reps?: number;
  weight?: number;
  caloriesBurned: number;
  heartRate?: number;
  notes?: string;
}

export interface Workout {
  id: string;
  userId: string;
  name: string;
  date: Date;
  exercises: Exercise[];
  totalDuration: number;
  totalCalories: number;
  notes?: string;
}

export interface TrainingPlan {
  id: string;
  name: string;
  description: string;
  userId?: string;
  isPreset: boolean;
  goal: 'lose_fat' | 'build_muscle' | 'maintain';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  durationWeeks: number;
  weeklySchedule: WeeklySchedule;
}

export interface WeeklySchedule {
  [day: string]: DayWorkout;
}

export interface DayWorkout {
  exercises: PlannedExercise[];
  restBetweenExercises: number;
  warmUpDuration: number;
  coolDownDuration: number;
}

export interface PlannedExercise {
  exerciseId: string;
  exerciseName: string;
  type: ExerciseType;
  subType: CardioExercise | StrengthExercise;
  sets?: number;
  reps?: number;
  weight?: number;
  duration?: number;
  distance?: number;
  restTime: number;
}

export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  servingSize: string;
  servingUnit: string;
  isCustom: boolean;
  userId?: string;
}

export interface MealLog {
  id: string;
  userId: string;
  date: Date;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foods: FoodPortion[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  notes?: string;
  photoURL?: string;
}

export interface FoodPortion {
  foodId: string;
  foodName: string;
  quantity: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface BodyMeasurement {
  id: string;
  userId: string;
  date: Date;
  weight?: number;
  bodyFat?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  bicep?: number;
  thigh?: number;
  calf?: number;
  neck?: number;
  bmi?: number;
}

export interface DailyActivity {
  id: string;
  userId: string;
  date: Date;
  steps: number;
  walkingSteps: number;
  runningSteps: number;
  distance: number;
  caloriesBurned: number;
  activeMinutes: number;
  floorsClimbed?: number;
  heartRateAvg?: number;
}

export interface Friend {
  userId: string;
  friendId: string;
  friendName: string;
  friendPhotoURL?: string;
  status: 'pending' | 'accepted' | 'blocked';
  addedAt: Date;
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  type: 'steps' | 'streak' | 'weight_loss';
  target: number;
  unit: string;
  durationDays: number;
  startDate: Date;
  endDate: Date;
  participants: string[];
  badgeId?: string;
  isPremium: boolean;
}

export interface ChallengeParticipation {
  challengeId: string;
  userId: string;
  currentProgress: number;
  startDate: Date;
  completed: boolean;
  completedDate?: Date;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: string;
  unlockedAt?: Date;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: 'monthly' | 'yearly';
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  transactionId: string;
}

export interface SocialPost {
  id: string;
  userId: string;
  userName: string;
  userPhotoURL?: string;
  content: string;
  workoutId?: string;
  mediaURL?: string;
  likes: string[];
  comments: Comment[];
  createdAt: Date;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: Date;
}

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  userPhotoURL?: string;
  value: number;
  rank: number;
}

export interface WaterLog {
  id: string;
  userId: string;
  date: Date;
  amount: number;
  goal: number;
}

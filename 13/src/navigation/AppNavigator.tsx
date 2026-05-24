import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useSelector} from 'react-redux';
import {RootState} from '@redux/store';

import LoginScreen from '@screens/auth/LoginScreen';
import RegisterScreen from '@screens/auth/RegisterScreen';
import GoalSetupScreen from '@screens/auth/GoalSetupScreen';
import HomeScreen from '@screens/home/HomeScreen';
import WorkoutScreen from '@screens/workout/WorkoutScreen';
import AddWorkoutScreen from '@screens/workout/AddWorkoutScreen';
import TrainingPlanScreen from '@screens/training/TrainingPlanScreen';
import ActiveWorkoutScreen from '@screens/training/ActiveWorkoutScreen';
import NutritionScreen from '@screens/nutrition/NutritionScreen';
import AddMealScreen from '@screens/nutrition/AddMealScreen';
import BodyStatsScreen from '@screens/stats/BodyStatsScreen';
import SocialScreen from '@screens/social/SocialScreen';
import ChallengeScreen from '@screens/challenge/ChallengeScreen';
import SettingsScreen from '@screens/settings/SettingsScreen';
import ProfileScreen from '@screens/settings/ProfileScreen';
import PrivacySettingsScreen from '@screens/settings/PrivacySettingsScreen';
import NotificationSettingsScreen from '@screens/settings/NotificationSettingsScreen';
import SubscriptionScreen from '@screens/settings/SubscriptionScreen';
import ExportDataScreen from '@screens/settings/ExportDataScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const AuthStack = () => (
  <Stack.Navigator screenOptions={{headerShown: false}}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="GoalSetup" component={GoalSetupScreen} />
  </Stack.Navigator>
);

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={{
      tabBarActiveTintColor: '#4CAF50',
      tabBarInactiveTintColor: '#999',
      tabBarStyle: {
        paddingBottom: 5,
        paddingTop: 5,
        height: 60,
      },
      headerShown: false,
    }}>
    <Tab.Screen
      name="Home"
      component={HomeScreen}
      options={{
        tabBarLabel: '首页',
        tabBarIcon: ({color, size}) => null,
      }}
    />
    <Tab.Screen
      name="Workout"
      component={WorkoutScreen}
      options={{
        tabBarLabel: '运动',
        tabBarIcon: ({color, size}) => null,
      }}
    />
    <Tab.Screen
      name="Training"
      component={TrainingPlanScreen}
      options={{
        tabBarLabel: '计划',
        tabBarIcon: ({color, size}) => null,
      }}
    />
    <Tab.Screen
      name="Nutrition"
      component={NutritionScreen}
      options={{
        tabBarLabel: '饮食',
        tabBarIcon: ({color, size}) => null,
      }}
    />
    <Tab.Screen
      name="Social"
      component={SocialScreen}
      options={{
        tabBarLabel: '社区',
        tabBarIcon: ({color, size}) => null,
      }}
    />
  </Tab.Navigator>
);

const AppStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="MainTabs" component={MainTabs} options={{headerShown: false}} />
    <Stack.Screen name="AddWorkout" component={AddWorkoutScreen} options={{title: '添加运动'}} />
    <Stack.Screen name="ActiveWorkout" component={ActiveWorkoutScreen} options={{title: '训练中'}} />
    <Stack.Screen name="AddMeal" component={AddMealScreen} options={{title: '记录饮食'}} />
    <Stack.Screen name="BodyStats" component={BodyStatsScreen} options={{title: '身体数据'}} />
    <Stack.Screen name="Challenge" component={ChallengeScreen} options={{title: '挑战'}} />
    <Stack.Screen name="Settings" component={SettingsScreen} options={{title: '设置'}} />
    <Stack.Screen name="Profile" component={ProfileScreen} options={{headerShown: false}} />
    <Stack.Screen name="PrivacySettings" component={PrivacySettingsScreen} options={{title: '隐私设置'}} />
    <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} options={{title: '通知设置'}} />
    <Stack.Screen name="Subscription" component={SubscriptionScreen} options={{title: '会员订阅'}} />
    <Stack.Screen name="ExportData" component={ExportDataScreen} options={{title: '导出数据'}} />
  </Stack.Navigator>
);

const AppNavigator = () => {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const userProfile = useSelector((state: RootState) => state.user.profile);
  const hasCompletedSetup = userProfile?.fitnessGoal !== undefined;

  return (
    <>
      {!isAuthenticated ? (
        <AuthStack />
      ) : !hasCompletedSetup ? (
        <Stack.Navigator screenOptions={{headerShown: false}}>
          <Stack.Screen name="GoalSetup" component={GoalSetupScreen} />
        </Stack.Navigator>
      ) : (
        <AppStack />
      )}
    </>
  );
};

export default AppNavigator;

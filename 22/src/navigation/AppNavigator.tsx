import React from 'react';
import {NavigationContainer, DefaultTheme, DarkTheme} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {RootStackParamList, RootTabParamList} from '@types';
import {useTheme} from '@theme';

import HomeScreen from '@screens/HomeScreen';
import EventDetailScreen from '@screens/EventDetailScreen';
import CreateEventScreen from '@screens/CreateEventScreen';
import HistoryScreen from '@screens/HistoryScreen';
import StatisticsScreen from '@screens/StatisticsScreen';
import SettingsScreen from '@screens/SettingsScreen';
import WidgetSettingsScreen from '@screens/WidgetSettingsScreen';
import CategoryManagementScreen from '@screens/CategoryManagementScreen';
import CloudSyncScreen from '@screens/CloudSyncScreen';
import ShareEventScreen from '@screens/ShareEventScreen';
import WallpaperSettingsScreen from '@screens/WallpaperSettingsScreen';
import LoginScreen from '@screens/LoginScreen';
import RegisterScreen from '@screens/RegisterScreen';
import ICSScreen from '@screens/ICSScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

const TabNavigator = () => {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
        tabBarLabelStyle: {
          fontSize: 12,
        },
      }}>
      <Tab.Screen
        name="Countdowns"
        component={HomeScreen}
        options={{
          tabBarLabel: '倒计时',
          tabBarIcon: ({color}) => null,
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: '历史',
          tabBarIcon: ({color}) => null,
        }}
      />
      <Tab.Screen
        name="Statistics"
        component={StatisticsScreen}
        options={{
          tabBarLabel: '统计',
          tabBarIcon: ({color}) => null,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: '设置',
          tabBarIcon: ({color}) => null,
        }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const theme = useTheme();

  const navTheme = theme.isDark ? DarkTheme : DefaultTheme;

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
          headerTintColor: theme.colors.text,
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}>
        <Stack.Screen
          name="Home"
          component={TabNavigator}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="EventDetail"
          component={EventDetailScreen}
          options={{title: '倒计时详情'}}
        />
        <Stack.Screen
          name="CreateEvent"
          component={CreateEventScreen}
          options={({route}) => ({
            title: route.params?.eventId ? '编辑事件' : '新建事件',
          })}
        />
        <Stack.Screen
          name="WidgetSettings"
          component={WidgetSettingsScreen}
          options={{title: '小组件设置'}}
        />
        <Stack.Screen
          name="CategoryManagement"
          component={CategoryManagementScreen}
          options={{title: '分类管理'}}
        />
        <Stack.Screen
          name="CloudSync"
          component={CloudSyncScreen}
          options={{title: '云同步'}}
        />
        <Stack.Screen
          name="ICSImport"
          component={ICSScreen}
          options={{title: '导入日历'}}
        />
        <Stack.Screen
          name="ICSExport"
          component={ICSScreen}
          options={{title: '导出日历'}}
        />
        <Stack.Screen
          name="ShareEvent"
          component={ShareEventScreen}
          options={{title: '分享'}}
        />
        <Stack.Screen
          name="WallpaperSettings"
          component={WallpaperSettingsScreen}
          options={{title: '倒计时壁纸'}}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{title: '登录'}}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{title: '注册'}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;

import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {useNavigation, NavigationProp} from '@react-navigation/native';
import {signOut} from '@redux/slices/authSlice';
import {fetchUserProfile, setUserProfile} from '@redux/slices/userSlice';
import {AppDispatch, RootState} from '@redux/store';
import {User} from '@types/index';

type RootStackParamList = {
  PrivacySettings: undefined;
  NotificationSettings: undefined;
  ExportData: undefined;
  Subscription: undefined;
  Training: undefined;
  BodyStats: undefined;
  HelpFeedback: undefined;
  About: undefined;
  Profile: undefined;
  Login: undefined;
};

interface SettingItem {
  id: string;
  icon: string;
  title: string;
  screen: keyof RootStackParamList;
}

const SettingsScreen = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const userProfile = useSelector((state: RootState) => state.user.profile);
  const authUser = useSelector((state: RootState) => state.auth.user);
  const isLoading = useSelector((state: RootState) => state.user.isLoading);

  useEffect(() => {
    if (authUser?.uid && !userProfile) {
      dispatch(fetchUserProfile(authUser.uid));
    }
  }, [dispatch, authUser?.uid, userProfile]);

  const getFitnessGoalText = (goal: User['fitnessGoal']) => {
    const goalMap: Record<User['fitnessGoal'], string> = {
      lose_fat: '减脂',
      build_muscle: '增肌',
      maintain: '保持健康',
    };
    return goalMap[goal] || '未设置';
  };

  const settingItems: SettingItem[] = [
    {id: 'privacy', icon: '🔒', title: '隐私设置', screen: 'PrivacySettings'},
    {id: 'notification', icon: '🔔', title: '通知设置', screen: 'NotificationSettings'},
    {id: 'export', icon: '📤', title: '数据导出', screen: 'ExportData'},
    {id: 'subscription', icon: '💎', title: '订阅管理', screen: 'Subscription'},
    {id: 'training', icon: '📋', title: '训练计划管理', screen: 'Training'},
    {id: 'body', icon: '📊', title: '身体数据', screen: 'BodyStats'},
    {id: 'help', icon: '❓', title: '帮助与反馈', screen: 'HelpFeedback'},
    {id: 'about', icon: 'ℹ️', title: '关于我们', screen: 'About'},
  ];

  const handleSettingPress = (screen: keyof RootStackParamList) => {
    navigation.navigate(screen);
  };

  const handleSignOut = () => {
    Alert.alert(
      '退出登录',
      '确定要退出登录吗？退出后您的本地数据将被清除。',
      [
        {
          text: '取消',
          style: 'cancel',
        },
        {
          text: '确定',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              await dispatch(signOut()).unwrap();
              dispatch(setUserProfile(null));
              navigation.reset({
                index: 0,
                routes: [{name: 'Login'}],
              });
            } catch (error) {
              Alert.alert('错误', '退出登录失败，请重试');
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ],
      {cancelable: true}
    );
  };

  if (isLoading && !userProfile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.profileSection}>
        <TouchableOpacity
          style={styles.profileCard}
          onPress={() => navigation.navigate('Profile')}>
          <View style={styles.avatarContainer}>
            {userProfile?.photoURL ? (
              <Image
                source={{uri: userProfile.photoURL}}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {userProfile?.displayName?.charAt(0) || '用'}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>
              {userProfile?.displayName || '健身爱好者'}
            </Text>
            <Text style={styles.userGoal}>
              🎯 目标：{getFitnessGoalText(userProfile?.fitnessGoal || 'maintain')}
            </Text>
            {userProfile?.isPremium && (
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumText}>💎 会员</Text>
              </View>
            )}
          </View>
          <Text style={styles.arrowIcon}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>设置</Text>
        <View style={styles.settingsCard}>
          {settingItems.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.settingItem,
                index < settingItems.length - 1 && styles.settingItemBorder,
              ]}
              onPress={() => handleSettingPress(item.screen)}>
              <Text style={styles.settingIcon}>{item.icon}</Text>
              <Text style={styles.settingTitle}>{item.title}</Text>
              <Text style={styles.settingArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.signOutSection}>
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          disabled={isLoggingOut}>
          {isLoggingOut ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.signOutText}>退出登录</Text>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.versionText}>版本 1.0.0</Text>
    </ScrollView>
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
  profileSection: {
    padding: 20,
    paddingBottom: 10,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    marginRight: 15,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userGoal: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  premiumBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  premiumText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B8860B',
  },
  arrowIcon: {
    fontSize: 28,
    color: '#ccc',
  },
  settingsSection: {
    padding: 20,
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    marginLeft: 4,
  },
  settingsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  settingItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingIcon: {
    fontSize: 22,
    marginRight: 15,
    width: 28,
    textAlign: 'center',
  },
  settingTitle: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  settingArrow: {
    fontSize: 24,
    color: '#ccc',
  },
  signOutSection: {
    padding: 20,
    paddingTop: 10,
  },
  signOutButton: {
    backgroundColor: '#f44336',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f44336',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  versionText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    marginVertical: 20,
  },
});

export default SettingsScreen;

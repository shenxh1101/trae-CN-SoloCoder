import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import {updatePrivacySettings, fetchUserProfile} from '@redux/slices/userSlice';
import {AppDispatch, RootState} from '@redux/store';
import {PrivacySettings, Visibility} from '@types/index';

const THEME_COLOR = '#4CAF50';

interface SegmentedControlProps {
  values: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
}

const SegmentedControl: React.FC<SegmentedControlProps> = ({values, selectedIndex, onChange}) => {
  return (
    <View style={styles.segmentedContainer}>
      {values.map((value, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.segmentedButton,
            selectedIndex === index && styles.segmentedButtonActive,
            index === 0 && styles.segmentedButtonFirst,
            index === values.length - 1 && styles.segmentedButtonLast,
          ]}
          onPress={() => onChange(index)}>
          <Text
            style={[
              styles.segmentedButtonText,
              selectedIndex === index && styles.segmentedButtonTextActive,
            ]}>
            {value}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

interface SettingItemProps {
  icon: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  isLast?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({icon, title, description, children, isLast}) => {
  return (
    <View style={[styles.settingItem, !isLast && styles.settingItemBorder]}>
      <View style={styles.settingItemHeader}>
        <Text style={styles.settingIcon}>{icon}</Text>
        <View style={styles.settingItemContent}>
          <Text style={styles.settingTitle}>{title}</Text>
          {description && <Text style={styles.settingDescription}>{description}</Text>}
        </View>
      </View>
      <View style={styles.settingItemControl}>{children}</View>
    </View>
  );
};

const PrivacySettingsScreen = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();

  const userProfile = useSelector((state: RootState) => state.user.profile);
  const authUser = useSelector((state: RootState) => state.auth.user);
  const isLoading = useSelector((state: RootState) => state.user.isLoading);

  const [localSettings, setLocalSettings] = useState<PrivacySettings>({
    profileVisibility: 'public',
    workoutVisibility: 'friends',
    bodyDataVisibility: 'private',
    leaderboardVisible: true,
    postDefaultVisibility: 'friends',
    allowFriendRequests: true,
    locationSharing: false,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const visibilityOptions: Visibility[] = ['public', 'friends', 'private'];
  const visibilityLabels = ['公开', '仅好友', '仅自己'];

  useEffect(() => {
    if (authUser?.uid && !userProfile) {
      dispatch(fetchUserProfile(authUser.uid));
    }
  }, [dispatch, authUser?.uid, userProfile]);

  useEffect(() => {
    if (userProfile?.privacySettings) {
      setLocalSettings(userProfile.privacySettings);
    }
  }, [userProfile?.privacySettings]);

  useEffect(() => {
    if (userProfile?.privacySettings) {
      setHasChanges(
        JSON.stringify(localSettings) !== JSON.stringify(userProfile.privacySettings)
      );
    }
  }, [localSettings, userProfile?.privacySettings]);

  const getVisibilityIndex = (visibility: Visibility): number => {
    return visibilityOptions.indexOf(visibility);
  };

  const handleVisibilityChange = (key: keyof PrivacySettings, index: number) => {
    setLocalSettings((prev) => ({
      ...prev,
      [key]: visibilityOptions[index],
    }));
  };

  const handleSwitchChange = (key: keyof PrivacySettings, value: boolean) => {
    setLocalSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    if (!authUser?.uid) {
      Alert.alert('错误', '用户未登录');
      return;
    }

    setIsSaving(true);
    try {
      await dispatch(
        updatePrivacySettings({
          userId: authUser.uid,
          settings: localSettings,
        })
      ).unwrap();
      Alert.alert('成功', '隐私设置已保存');
    } catch (error) {
      Alert.alert('错误', '保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    Alert.alert('重置设置', '确定要重置为默认隐私设置吗？', [
      {text: '取消', style: 'cancel'},
      {
        text: '确定',
        style: 'destructive',
        onPress: () => {
          setLocalSettings({
            profileVisibility: 'public',
            workoutVisibility: 'friends',
            bodyDataVisibility: 'private',
            leaderboardVisible: true,
            postDefaultVisibility: 'friends',
            allowFriendRequests: true,
            locationSharing: false,
          });
        },
      },
    ]);
  };

  if (isLoading && !userProfile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME_COLOR} />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>隐私设置</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.noticeCard}>
        <Text style={styles.noticeIcon}>🔒</Text>
        <View style={styles.noticeContent}>
          <Text style={styles.noticeTitle}>保护您的隐私</Text>
          <Text style={styles.noticeText}>
            您可以在这里控制您的个人信息、运动数据和位置信息的可见范围。
            我们承诺不会未经您的许可共享您的敏感数据。
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>数据可见性</Text>
        <View style={styles.settingsCard}>
          <SettingItem
            icon="👤"
            title="个人资料可见性"
            description="控制谁可以查看您的个人资料">
            <SegmentedControl
              values={visibilityLabels}
              selectedIndex={getVisibilityIndex(localSettings.profileVisibility)}
              onChange={(index) => handleVisibilityChange('profileVisibility', index)}
            />
          </SettingItem>

          <SettingItem
            icon="🏃"
            title="运动记录可见性"
            description="控制谁可以查看您的运动记录">
            <SegmentedControl
              values={visibilityLabels}
              selectedIndex={getVisibilityIndex(localSettings.workoutVisibility)}
              onChange={(index) => handleVisibilityChange('workoutVisibility', index)}
            />
          </SettingItem>

          <SettingItem
            icon="📊"
            title="身体数据可见性"
            description="控制谁可以查看您的身体测量数据">
            <SegmentedControl
              values={visibilityLabels}
              selectedIndex={getVisibilityIndex(localSettings.bodyDataVisibility)}
              onChange={(index) => handleVisibilityChange('bodyDataVisibility', index)}
            />
          </SettingItem>

          <SettingItem
            icon="🏆"
            title="排行榜可见性"
            description="是否在排行榜中显示您的排名"
            isLast>
            <Switch
              value={localSettings.leaderboardVisible}
              onValueChange={(value) => handleSwitchChange('leaderboardVisible', value)}
              trackColor={{false: '#e0e0e0', true: THEME_COLOR + '80'}}
              thumbColor={localSettings.leaderboardVisible ? THEME_COLOR : '#fafafa'}
            />
          </SettingItem>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>社交设置</Text>
        <View style={styles.settingsCard}>
          <SettingItem
            icon="📝"
            title="动态发布默认可见性"
            description="发布新动态时的默认可见范围">
            <SegmentedControl
              values={visibilityLabels}
              selectedIndex={getVisibilityIndex(localSettings.postDefaultVisibility)}
              onChange={(index) => handleVisibilityChange('postDefaultVisibility', index)}
            />
          </SettingItem>

          <SettingItem
            icon="👥"
            title="允许好友请求"
            description="是否允许其他人向您发送好友请求"
            isLast>
            <Switch
              value={localSettings.allowFriendRequests}
              onValueChange={(value) => handleSwitchChange('allowFriendRequests', value)}
              trackColor={{false: '#e0e0e0', true: THEME_COLOR + '80'}}
              thumbColor={localSettings.allowFriendRequests ? THEME_COLOR : '#fafafa'}
            />
          </SettingItem>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>位置服务</Text>
        <View style={styles.settingsCard}>
          <SettingItem
            icon="📍"
            title="位置信息共享"
            description="是否允许应用收集和共享您的位置信息"
            isLast>
            <Switch
              value={localSettings.locationSharing}
              onValueChange={(value) => handleSwitchChange('locationSharing', value)}
              trackColor={{false: '#e0e0e0', true: THEME_COLOR + '80'}}
              thumbColor={localSettings.locationSharing ? THEME_COLOR : '#fafafa'}
            />
          </SettingItem>
        </View>
      </View>

      <View style={styles.privacyInfoCard}>
        <Text style={styles.privacyInfoTitle}>📋 隐私说明</Text>
        <View style={styles.privacyInfoContent}>
          <Text style={styles.privacyInfoText}>• <Text style={styles.privacyInfoBold}>公开</Text>：所有用户都可以查看</Text>
          <Text style={styles.privacyInfoText}>• <Text style={styles.privacyInfoBold}>仅好友</Text>：只有您的好友可以查看</Text>
          <Text style={styles.privacyInfoText}>• <Text style={styles.privacyInfoBold}>仅自己</Text>：只有您自己可以查看</Text>
        </View>
        <Text style={styles.privacyInfoFooter}>
          您可以随时修改这些设置。关闭位置共享后，我们将停止收集您的位置数据。
        </Text>
      </View>

      <View style={styles.buttonSection}>
        <TouchableOpacity
          style={[styles.saveButton, !hasChanges && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!hasChanges || isSaving}>
          {isSaving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>保存设置</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
          <Text style={styles.resetButtonText}>恢复默认</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomPadding} />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 32,
    color: THEME_COLOR,
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
  noticeCard: {
    flexDirection: 'row',
    margin: 20,
    marginBottom: 10,
    padding: 16,
    backgroundColor: THEME_COLOR + '15',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME_COLOR + '30',
  },
  noticeIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  noticeContent: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME_COLOR,
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  section: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 10,
    marginLeft: 4,
  },
  settingsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  settingItem: {
    padding: 16,
  },
  settingItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  settingItemHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  settingIcon: {
    fontSize: 22,
    marginRight: 12,
    width: 28,
    textAlign: 'center',
  },
  settingItemContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: '#999',
    lineHeight: 16,
  },
  settingItemControl: {
    paddingLeft: 40,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 3,
  },
  segmentedButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedButtonFirst: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  segmentedButtonLast: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  segmentedButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentedButtonText: {
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
  },
  segmentedButtonTextActive: {
    color: THEME_COLOR,
    fontWeight: '600',
  },
  privacyInfoCard: {
    margin: 20,
    marginTop: 10,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  privacyInfoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  privacyInfoContent: {
    marginBottom: 12,
  },
  privacyInfoText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 22,
  },
  privacyInfoBold: {
    fontWeight: '600',
    color: '#333',
  },
  privacyInfoFooter: {
    fontSize: 12,
    color: '#999',
    lineHeight: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
  },
  buttonSection: {
    padding: 20,
    paddingTop: 10,
  },
  saveButton: {
    backgroundColor: THEME_COLOR,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: THEME_COLOR,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  resetButton: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    fontSize: 14,
    color: '#888',
  },
  bottomPadding: {
    height: 40,
  },
});

export default PrivacySettingsScreen;

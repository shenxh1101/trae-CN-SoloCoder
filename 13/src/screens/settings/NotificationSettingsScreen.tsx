import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Modal,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {useNavigation, NavigationProp} from '@react-navigation/native';
import {updateNotificationSettings} from '@redux/slices/userSlice';
import {scheduleNotifications} from '@redux/slices/notificationSlice';
import {AppDispatch, RootState} from '@redux/store';
import {NotificationSettings} from '@types/index';

type RootStackParamList = {
  NotificationSettings: undefined;
  Settings: undefined;
};

interface LocalNotificationSettings extends NotificationSettings {
  friendRequestNotifications: boolean;
  likeCommentNotifications: boolean;
  achievementNotifications: boolean;
}

const WATER_INTERVALS = [30, 60, 90, 120];
const SEDENTARY_INTERVALS = [30, 60, 90];
const HOURS = Array.from({length: 24}, (_, i) => i);
const MINUTES = [0, 15, 30, 45];

const NotificationSettingsScreen = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const userProfile = useSelector((state: RootState) => state.user.profile);
  const authUser = useSelector((state: RootState) => state.auth.user);
  const isLoading = useSelector((state: RootState) => state.user.isLoading);

  const [settings, setSettings] = useState<LocalNotificationSettings>({
    waterReminder: true,
    workoutReminder: true,
    sedentaryReminder: true,
    socialNotifications: true,
    challengeNotifications: true,
    waterReminderInterval: 120,
    workoutReminderTime: '18:00',
    sedentaryReminderInterval: 60,
    friendRequestNotifications: true,
    likeCommentNotifications: true,
    achievementNotifications: true,
  });

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedHour, setSelectedHour] = useState(18);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (userProfile?.notificationSettings) {
      const ns = userProfile.notificationSettings;
      setSettings({
        waterReminder: ns.waterReminder,
        workoutReminder: ns.workoutReminder,
        sedentaryReminder: ns.sedentaryReminder,
        socialNotifications: ns.socialNotifications,
        challengeNotifications: ns.challengeNotifications,
        waterReminderInterval: ns.waterReminderInterval,
        workoutReminderTime: ns.workoutReminderTime,
        sedentaryReminderInterval: ns.sedentaryReminderInterval,
        friendRequestNotifications: ns.socialNotifications,
        likeCommentNotifications: ns.socialNotifications,
        achievementNotifications: ns.challengeNotifications,
      });
      const [h, m] = ns.workoutReminderTime.split(':').map(Number);
      setSelectedHour(h);
      setSelectedMinute(m);
    }
  }, [userProfile]);

  const handleToggle = (key: keyof LocalNotificationSettings, value: boolean) => {
    setSettings(prev => {
      const newSettings = {...prev, [key]: value};
      if (key === 'friendRequestNotifications' || key === 'likeCommentNotifications') {
        newSettings.socialNotifications =
          newSettings.friendRequestNotifications || newSettings.likeCommentNotifications;
      }
      if (key === 'achievementNotifications' || key === 'challengeNotifications') {
        newSettings.challengeNotifications =
          newSettings.achievementNotifications || prev.challengeNotifications;
      }
      return newSettings;
    });
  };

  const handleIntervalChange = (type: 'water' | 'sedentary', value: number) => {
    if (type === 'water') {
      setSettings(prev => ({...prev, waterReminderInterval: value}));
    } else {
      setSettings(prev => ({...prev, sedentaryReminderInterval: value}));
    }
  };

  const handleTimeConfirm = () => {
    const time = `${String(selectedHour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`;
    setSettings(prev => ({...prev, workoutReminderTime: time}));
    setShowTimePicker(false);
  };

  const handleSave = async () => {
    if (!authUser?.uid) {
      Alert.alert('错误', '用户未登录');
      return;
    }

    setIsSaving(true);
    try {
      const settingsToSave: Partial<NotificationSettings> = {
        waterReminder: settings.waterReminder,
        workoutReminder: settings.workoutReminder,
        sedentaryReminder: settings.sedentaryReminder,
        socialNotifications: settings.socialNotifications,
        challengeNotifications: settings.challengeNotifications,
        waterReminderInterval: settings.waterReminderInterval,
        workoutReminderTime: settings.workoutReminderTime,
        sedentaryReminderInterval: settings.sedentaryReminderInterval,
      };

      await dispatch(
        updateNotificationSettings({
          userId: authUser.uid,
          settings: settingsToSave,
        })
      ).unwrap();

      await dispatch(
        scheduleNotifications({
          waterReminder: settings.waterReminder,
          waterReminderInterval: settings.waterReminderInterval,
          workoutReminder: settings.workoutReminder,
          workoutReminderTime: settings.workoutReminderTime,
          sedentaryReminder: settings.sedentaryReminder,
          sedentaryReminderInterval: settings.sedentaryReminderInterval,
        })
      ).unwrap();

      Alert.alert('成功', '通知设置已保存', [
        {text: '确定', onPress: () => navigation.goBack()},
      ]);
    } catch (error) {
      Alert.alert('错误', '保存设置失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (time: string) => {
    const [h, m] = time.split(':');
    return `${h}时${m}分`;
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
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>健康提醒</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingIcon}>💧</Text>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>喝水提醒</Text>
                  <Text style={styles.settingDesc}>定时提醒您补充水分</Text>
                </View>
              </View>
              <Switch
                value={settings.waterReminder}
                onValueChange={value => handleToggle('waterReminder', value)}
                trackColor={{false: '#e0e0e0', true: '#81C784'}}
                thumbColor={settings.waterReminder ? '#4CAF50' : '#fafafa'}
              />
            </View>

            {settings.waterReminder && (
              <View style={styles.subSetting}>
                <Text style={styles.subSettingTitle}>提醒间隔</Text>
                <View style={styles.segmentedControl}>
                  {WATER_INTERVALS.map(interval => (
                    <TouchableOpacity
                      key={interval}
                      style={[
                        styles.segmentButton,
                        settings.waterReminderInterval === interval &&
                          styles.segmentButtonActive,
                      ]}
                      onPress={() => handleIntervalChange('water', interval)}>
                      <Text
                        style={[
                          styles.segmentButtonText,
                          settings.waterReminderInterval === interval &&
                            styles.segmentButtonTextActive,
                        ]}>
                        {interval}分钟
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingIcon}>🏋️</Text>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>训练提醒</Text>
                  <Text style={styles.settingDesc}>每日训练时间提醒</Text>
                </View>
              </View>
              <Switch
                value={settings.workoutReminder}
                onValueChange={value => handleToggle('workoutReminder', value)}
                trackColor={{false: '#e0e0e0', true: '#81C784'}}
                thumbColor={settings.workoutReminder ? '#4CAF50' : '#fafafa'}
              />
            </View>

            {settings.workoutReminder && (
              <View style={styles.subSetting}>
                <Text style={styles.subSettingTitle}>提醒时间</Text>
                <TouchableOpacity
                  style={styles.timePickerButton}
                  onPress={() => setShowTimePicker(true)}>
                  <Text style={styles.timePickerText}>
                    {formatTime(settings.workoutReminderTime)}
                  </Text>
                  <Text style={styles.timePickerArrow}>›</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingIcon}>🚶</Text>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>久坐提醒</Text>
                  <Text style={styles.settingDesc}>提醒您起身活动</Text>
                </View>
              </View>
              <Switch
                value={settings.sedentaryReminder}
                onValueChange={value => handleToggle('sedentaryReminder', value)}
                trackColor={{false: '#e0e0e0', true: '#81C784'}}
                thumbColor={settings.sedentaryReminder ? '#4CAF50' : '#fafafa'}
              />
            </View>

            {settings.sedentaryReminder && (
              <View style={styles.subSetting}>
                <Text style={styles.subSettingTitle}>提醒间隔</Text>
                <View style={styles.segmentedControl}>
                  {SEDENTARY_INTERVALS.map(interval => (
                    <TouchableOpacity
                      key={interval}
                      style={[
                        styles.segmentButton,
                        settings.sedentaryReminderInterval === interval &&
                          styles.segmentButtonActive,
                      ]}
                      onPress={() => handleIntervalChange('sedentary', interval)}>
                      <Text
                        style={[
                          styles.segmentButtonText,
                          settings.sedentaryReminderInterval === interval &&
                            styles.segmentButtonTextActive,
                        ]}>
                        {interval}分钟
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>社交通知</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingIcon}>👥</Text>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>好友请求通知</Text>
                  <Text style={styles.settingDesc}>收到好友请求时提醒</Text>
                </View>
              </View>
              <Switch
                value={settings.friendRequestNotifications}
                onValueChange={value => handleToggle('friendRequestNotifications', value)}
                trackColor={{false: '#e0e0e0', true: '#81C784'}}
                thumbColor={settings.friendRequestNotifications ? '#4CAF50' : '#fafafa'}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingIcon}>❤️</Text>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>点赞和评论通知</Text>
                  <Text style={styles.settingDesc}>动态被点赞或评论时提醒</Text>
                </View>
              </View>
              <Switch
                value={settings.likeCommentNotifications}
                onValueChange={value => handleToggle('likeCommentNotifications', value)}
                trackColor={{false: '#e0e0e0', true: '#81C784'}}
                thumbColor={settings.likeCommentNotifications ? '#4CAF50' : '#fafafa'}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>挑战与成就</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingIcon}>🎯</Text>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>挑战进度提醒</Text>
                  <Text style={styles.settingDesc}>挑战进度更新时提醒</Text>
                </View>
              </View>
              <Switch
                value={settings.challengeNotifications}
                onValueChange={value => handleToggle('challengeNotifications', value)}
                trackColor={{false: '#e0e0e0', true: '#81C784'}}
                thumbColor={settings.challengeNotifications ? '#4CAF50' : '#fafafa'}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingIcon}>🏆</Text>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>成就解锁通知</Text>
                  <Text style={styles.settingDesc}>解锁新成就时提醒</Text>
                </View>
              </View>
              <Switch
                value={settings.achievementNotifications}
                onValueChange={value => handleToggle('achievementNotifications', value)}
                trackColor={{false: '#e0e0e0', true: '#81C784'}}
                thumbColor={settings.achievementNotifications ? '#4CAF50' : '#fafafa'}
              />
            </View>
          </View>
        </View>

        <View style={styles.saveSection}>
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>保存设置</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={showTimePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTimePicker(false)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowTimePicker(false)}>
          <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                <Text style={styles.modalCancel}>取消</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>选择训练时间</Text>
              <TouchableOpacity onPress={handleTimeConfirm}>
                <Text style={styles.modalConfirm}>确定</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.timePickerContainer}>
              <View style={styles.timeColumn}>
                <Text style={styles.timeLabel}>时</Text>
                <ScrollView
                  style={styles.timeScroll}
                  showsVerticalScrollIndicator={false}>
                  {HOURS.map(hour => (
                    <TouchableOpacity
                      key={hour}
                      style={[
                        styles.timeOption,
                        selectedHour === hour && styles.timeOptionActive,
                      ]}
                      onPress={() => setSelectedHour(hour)}>
                      <Text
                        style={[
                          styles.timeOptionText,
                          selectedHour === hour && styles.timeOptionTextActive,
                        ]}>
                        {String(hour).padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Text style={styles.timeSeparator}>:</Text>

              <View style={styles.timeColumn}>
                <Text style={styles.timeLabel}>分</Text>
                <ScrollView
                  style={styles.timeScroll}
                  showsVerticalScrollIndicator={false}>
                  {MINUTES.map(minute => (
                    <TouchableOpacity
                      key={minute}
                      style={[
                        styles.timeOption,
                        selectedMinute === minute && styles.timeOptionActive,
                      ]}
                      onPress={() => setSelectedMinute(minute)}>
                      <Text
                        style={[
                          styles.timeOptionText,
                          selectedMinute === minute && styles.timeOptionTextActive,
                        ]}>
                        {String(minute).padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
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
  section: {
    padding: 20,
    paddingBottom: 10,
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
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  settingInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    fontSize: 22,
    marginRight: 15,
    width: 28,
    textAlign: 'center',
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: '#333',
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: 12,
    color: '#999',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 20,
  },
  subSetting: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 8,
    backgroundColor: '#fafafa',
  },
  subSettingTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    fontWeight: '500',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 3,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentButtonActive: {
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentButtonText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  segmentButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  timePickerText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  timePickerArrow: {
    fontSize: 24,
    color: '#ccc',
  },
  saveSection: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 30,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonDisabled: {
    backgroundColor: '#A5D6A7',
    shadowOpacity: 0.1,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalCancel: {
    fontSize: 16,
    color: '#999',
    fontWeight: '500',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  modalConfirm: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    paddingHorizontal: 40,
  },
  timeColumn: {
    flex: 1,
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 10,
    fontWeight: '500',
  },
  timeScroll: {
    maxHeight: 200,
  },
  timeSeparator: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginHorizontal: 20,
  },
  timeOption: {
    paddingVertical: 10,
    paddingHorizontal: 30,
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 2,
  },
  timeOptionActive: {
    backgroundColor: '#E8F5E9',
  },
  timeOptionText: {
    fontSize: 20,
    color: '#999',
    fontWeight: '500',
  },
  timeOptionTextActive: {
    color: '#4CAF50',
    fontWeight: '700',
  },
});

export default NotificationSettingsScreen;

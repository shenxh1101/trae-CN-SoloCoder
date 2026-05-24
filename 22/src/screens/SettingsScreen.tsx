import React, {useCallback} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Switch,
  Alert,
  ActionSheetIOS,
  Platform,
  Share,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList, SortOption} from '@types';
import {useTheme, ThemeMode} from '@theme';
import {useAppDispatch, useAppSelector} from '@hooks';
import {updateSettings} from '@store/eventsSlice';
import {logout as logoutAction} from '@store/userSlice';
import notificationService from '@services/notificationService';
import widgetManager from '@services/widgetManager';
import {exportToICS} from '@utils/icsUtils';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

const SettingsScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  const {settings, events, categories} = useAppSelector(state => state.events);
  const {user, isAuthenticated, syncStatus} = useAppSelector(state => state.user);

  const sortOptions: Array<{value: SortOption; label: string}> = [
    {value: 'date', label: '按日期'},
    {value: 'name', label: '按名称'},
    {value: 'category', label: '按分类'},
    {value: 'remaining', label: '按剩余时间'},
  ];

  const themeOptions: Array<{value: ThemeMode; label: string; icon: string}> = [
    {value: 'system', label: '跟随系统', icon: '📱'},
    {value: 'light', label: '浅色模式', icon: '☀️'},
    {value: 'dark', label: '深色模式', icon: '🌙'},
  ];

  const archiveDaysOptions = [
    {value: 7, label: '7 天后'},
    {value: 14, label: '14 天后'},
    {value: 30, label: '30 天后'},
    {value: 60, label: '60 天后'},
    {value: 90, label: '90 天后'},
  ];

  const showThemeActionSheet = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...themeOptions.map(o => `${o.icon} ${o.label}`), '取消'],
          cancelButtonIndex: themeOptions.length,
          title: '选择主题',
        },
        buttonIndex => {
          if (buttonIndex < themeOptions.length) {
            const selectedTheme = themeOptions[buttonIndex].value;
            dispatch(updateSettings({theme: selectedTheme}));
          }
        },
      );
    } else {
      const buttons = [
        ...themeOptions.map(opt => ({
          text: `${opt.icon} ${opt.label}`,
          onPress: () => dispatch(updateSettings({theme: opt.value})),
        })),
        {text: '取消', style: 'cancel' as const},
      ];
      Alert.alert('选择主题', '请选择主题模式', buttons);
    }
  }, [dispatch]);

  const showSortActionSheet = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...sortOptions.map(o => o.label), '取消'],
          cancelButtonIndex: sortOptions.length,
          title: '选择默认排序',
        },
        buttonIndex => {
          if (buttonIndex < sortOptions.length) {
            const selectedSort = sortOptions[buttonIndex].value;
            dispatch(updateSettings({defaultSort: selectedSort}));
          }
        },
      );
    } else {
      const buttons = [
        ...sortOptions.map(opt => ({
          text: opt.label,
          onPress: () => dispatch(updateSettings({defaultSort: opt.value})),
        })),
        {text: '取消', style: 'cancel' as const},
      ];
      Alert.alert('选择默认排序', '请选择事件列表的默认排序方式', buttons);
    }
  }, [dispatch]);

  const showArchiveActionSheet = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...archiveDaysOptions.map(o => o.label), '取消'],
          cancelButtonIndex: archiveDaysOptions.length,
          title: '选择自动归档时间',
        },
        buttonIndex => {
          if (buttonIndex < archiveDaysOptions.length) {
            const selectedDays = archiveDaysOptions[buttonIndex].value;
            dispatch(updateSettings({autoArchiveDays: selectedDays}));
          }
        },
      );
    } else {
      const buttons = [
        ...archiveDaysOptions.map(opt => ({
          text: opt.label,
          onPress: () => dispatch(updateSettings({autoArchiveDays: opt.value})),
        })),
        {text: '取消', style: 'cancel' as const},
      ];
      Alert.alert('选择自动归档时间', '请选择过期事件自动归档的时间', buttons);
    }
  }, [dispatch]);

  const handleExportData = useCallback(async () => {
    try {
      const data = {
        events,
        categories,
        settings,
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
      };

      const icsContent = exportToICS(events, categories);

      const exportOptions = [
        {label: '导出为 JSON', value: 'json'},
        {label: '导出为 ICS 日历', value: 'ics'},
        {label: '分享数据', value: 'share'},
      ];

      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: [...exportOptions.map(o => o.label), '取消'],
            cancelButtonIndex: exportOptions.length,
            title: '导出数据',
          },
          async buttonIndex => {
            if (buttonIndex === 0) {
              const jsonData = JSON.stringify(data, null, 2);
              await Share.share({
                message: jsonData,
                title: '倒计时数据导出',
              });
            } else if (buttonIndex === 1) {
              await Share.share({
                message: icsContent,
                title: '倒计时日历导出',
              });
            } else if (buttonIndex === 2) {
              await Share.share({
                message: `我在使用「倒计时」App，目前有 ${events.length} 个倒计时事件！`,
                title: '分享倒计时',
              });
            }
          },
        );
      } else {
        Alert.alert(
          '导出数据',
          '请选择导出格式',
          [
            {text: '取消', style: 'cancel'},
            {
              text: 'JSON',
              onPress: async () => {
                const jsonData = JSON.stringify(data, null, 2);
                await Share.share({
                  message: jsonData,
                  title: '倒计时数据导出',
                });
              },
            },
            {
              text: 'ICS 日历',
              onPress: async () => {
                await Share.share({
                  message: icsContent,
                  title: '倒计时日历导出',
                });
              },
            },
          ],
        );
      }
    } catch (error) {
      Alert.alert('导出失败', '导出数据时出现错误，请重试。');
      console.error('Export error:', error);
    }
  }, [events, categories, settings]);

  const handleNotificationToggle = useCallback(async (enabled: boolean) => {
    dispatch(updateSettings({notificationEnabled: enabled}));

    if (enabled) {
      const permissionGranted = await notificationService.requestPermission();
      if (!permissionGranted) {
        Alert.alert(
          '通知权限未开启',
          '请在系统设置中允许通知权限，以便接收倒计时提醒。',
          [
            {text: '知道了'},
            {text: '去设置', onPress: () => {/* Open app settings */}},
          ],
        );
        dispatch(updateSettings({notificationEnabled: false}));
        return;
      }

      await notificationService.initialize();
      await notificationService.scheduleAllNotifications(events, categories);
      Alert.alert('通知已开启', '将在倒计时到期时收到提醒通知。');
    } else {
      await notificationService.cancelAllNotifications();
    }
  }, [dispatch, events, categories]);

  const syncWidgetData = useCallback(async () => {
    try {
      const result = await widgetManager.syncAllData(events, categories, []);
      Alert.alert(
        '同步成功',
        `已同步 ${result.eventsSynced || 0} 个事件到小组件。`,
      );
    } catch (error) {
      Alert.alert('同步失败', '同步小组件数据时出现错误。');
      console.error('Widget sync error:', error);
    }
  }, [events, categories]);

  const testNotification = useCallback(async () => {
    if (!settings.notificationEnabled) {
      Alert.alert('通知未开启', '请先开启通知功能。');
      return;
    }

    await notificationService.displayImmediateNotification(
      '🔔 测试通知',
      '这是一条测试通知，通知功能正常工作！',
      undefined,
      '#6366F1',
    );
  }, [settings.notificationEnabled]);

  const getThemeLabel = () => {
    const option = themeOptions.find(o => o.value === settings.theme);
    return option ? `${option.icon} ${option.label}` : '跟随系统';
  };

  const handleLogout = () => {
    Alert.alert(
      '退出登录',
      '确定要退出登录吗？本地数据不会被删除。',
      [
        {text: '取消', style: 'cancel'},
        {
          text: '退出',
          style: 'destructive',
          onPress: () => dispatch(logoutAction()),
        },
      ],
    );
  };

  const SettingItem: React.FC<{
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    showArrow?: boolean;
    destructive?: boolean;
  }> = ({icon, title, subtitle, onPress, rightElement, showArrow = true, destructive}) => (
    <TouchableOpacity
      style={[
        styles.settingItem,
        {borderBottomColor: theme.colors.border},
      ]}
      onPress={onPress}
      disabled={!onPress}>
      <View style={styles.settingLeft}>
        <Text style={styles.settingIcon}>{icon}</Text>
        <View>
          <Text
            style={[
              styles.settingTitle,
              {color: destructive ? '#EF4444' : theme.colors.text},
            ]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.settingSubtitle, {color: theme.colors.textSecondary}]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.settingRight}>
        {rightElement}
        {showArrow && (
          <Text style={{color: theme.colors.textSecondary, marginLeft: 8}}>›</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, {color: theme.colors.text}]}>设置</Text>
        </View>

        {isAuthenticated && (
          <View style={[styles.section, {backgroundColor: theme.colors.surface}]}>
            <View style={styles.userInfo}>
              <View style={[styles.avatar, {backgroundColor: theme.colors.primary}]}>
                <Text style={styles.avatarText}>
                  {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
                </Text>
              </View>
              <View style={styles.userText}>
                <Text style={[styles.userName, {color: theme.colors.text}]}>
                  {user?.displayName || user?.email}
                </Text>
                <Text style={[styles.userEmail, {color: theme.colors.textSecondary}]}>
                  {user?.email}
                </Text>
                {syncStatus.lastSyncedAt && (
                  <Text style={[styles.syncStatus, {color: theme.colors.success}]}>
                    ✓ 已同步于 {new Date(syncStatus.lastSyncedAt).toLocaleString()}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        <View style={[styles.section, {backgroundColor: theme.colors.surface}]}>
          <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>云同步</Text>

          {isAuthenticated ? (
            <>
              <SettingItem
                icon="☁️"
                title="云同步设置"
                subtitle={syncStatus.isSyncing ? '正在同步...' : '管理你的云同步'}
                onPress={() => navigation.navigate('CloudSync')}
              />
              <SettingItem
                icon="🚪"
                title="退出登录"
                onPress={handleLogout}
                destructive
              />
            </>
          ) : (
            <SettingItem
              icon="🔐"
              title="登录账号"
              subtitle="同步数据到云端，跨设备访问"
              onPress={() => navigation.navigate('Login')}
            />
          )}
        </View>

        <View style={[styles.section, {backgroundColor: theme.colors.surface}]}>
          <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>显示设置</Text>

          <SettingItem
            icon="🎨"
            title="主题"
            subtitle={getThemeLabel()}
            onPress={showThemeActionSheet}
          />

          <SettingItem
            icon="🔢"
            title="显示秒数"
            rightElement={
              <Switch
                value={settings.showSeconds}
                onValueChange={value => {
                  dispatch(updateSettings({showSeconds: value}));
                }}
                trackColor={{false: theme.colors.border, true: theme.colors.primary}}
                thumbColor="#FFFFFF"
              />
            }
            showArrow={false}
          />

          <SettingItem
            icon="📊"
            title="默认排序"
            subtitle={sortOptions.find(o => o.value === settings.defaultSort)?.label}
            onPress={showSortActionSheet}
          />
        </View>

        <View style={[styles.section, {backgroundColor: theme.colors.surface}]}>
          <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>数据管理</Text>

          <SettingItem
            icon="📱"
            title="桌面小组件"
            subtitle="配置桌面上的倒计时小组件"
            onPress={() => navigation.navigate('WidgetSettings')}
          />

          <SettingItem
            icon="🖼️"
            title="倒计时壁纸"
            subtitle="设置锁屏动态壁纸"
            onPress={() => navigation.navigate('WallpaperSettings')}
          />

          <SettingItem
            icon="📥"
            title="导入日历"
            subtitle="从ICS文件导入倒计时事件"
            onPress={() => navigation.navigate('ICSImport')}
          />

          <SettingItem
            icon="📤"
            title="导出日历"
            subtitle="导出为ICS日历格式"
            onPress={() => navigation.navigate('ICSExport')}
          />

          <SettingItem
            icon="🗄️"
            title="自动归档"
            rightElement={
              <Switch
                value={settings.autoArchive}
                onValueChange={value => {
                  dispatch(updateSettings({autoArchive: value}));
                }}
                trackColor={{false: theme.colors.border, true: theme.colors.primary}}
                thumbColor="#FFFFFF"
              />
            }
            showArrow={false}
          />

          {settings.autoArchive && (
            <SettingItem
              icon="⏰"
              title="自动归档时间"
              subtitle={`过期后 ${settings.autoArchiveDays} 天`}
              onPress={showArchiveActionSheet}
            />
          )}

          <SettingItem
            icon="🔔"
            title="通知提醒"
            subtitle="倒计时到期时发送通知"
            rightElement={
              <Switch
                value={settings.notificationEnabled}
                onValueChange={handleNotificationToggle}
                trackColor={{false: theme.colors.border, true: theme.colors.primary}}
                thumbColor="#FFFFFF"
              />
            }
            showArrow={false}
          />

          {settings.notificationEnabled && (
            <>
              <SettingItem
                icon="⏱️"
                title="提前 24 小时提醒"
                rightElement={
                  <Switch
                    value={settings.remind24hBefore}
                    onValueChange={value => {
                      dispatch(updateSettings({remind24hBefore: value}));
                    }}
                    trackColor={{false: theme.colors.border, true: theme.colors.primary}}
                    thumbColor="#FFFFFF"
                  />
                }
                showArrow={false}
              />
              <SettingItem
                icon="⏳"
                title="提前 1 小时提醒"
                rightElement={
                  <Switch
                    value={settings.remind1hBefore}
                    onValueChange={value => {
                      dispatch(updateSettings({remind1hBefore: value}));
                    }}
                    trackColor={{false: theme.colors.border, true: theme.colors.primary}}
                    thumbColor="#FFFFFF"
                  />
                }
                showArrow={false}
              />
              <SettingItem
                icon="🧪"
                title="测试通知"
                subtitle="发送一条测试通知"
                onPress={testNotification}
              />
            </>
          )}

          <SettingItem
            icon="🔁"
            title="同步小组件数据"
            subtitle="手动同步所有事件到桌面小组件"
            onPress={syncWidgetData}
          />
        </View>

        <View style={[styles.section, {backgroundColor: theme.colors.surface}]}>
          <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>数据管理</Text>

          <SettingItem
            icon="🏷️"
            title="分类管理"
            subtitle="管理倒计时事件的分类标签"
            onPress={() => navigation.navigate('CategoryManagement')}
          />

          <SettingItem
            icon="📤"
            title="导出数据"
            subtitle="导出JSON、ICS或分享"
            onPress={handleExportData}
          />
        </View>

        <View style={[styles.section, {backgroundColor: theme.colors.surface}]}>
          <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>关于</Text>

          <SettingItem
            icon="ℹ️"
            title="版本"
            subtitle="1.0.0"
            showArrow={false}
          />

          <SettingItem
            icon="⭐"
            title="给我们评分"
            onPress={() => {}}
          />

          <SettingItem
            icon="📝"
            title="意见反馈"
            onPress={() => {}}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  section: {
    margin: 16,
    marginTop: 0,
    borderRadius: 16,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    padding: 16,
    paddingBottom: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  userText: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 4,
  },
  syncStatus: {
    fontSize: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    fontSize: 20,
    marginRight: 16,
    width: 24,
    textAlign: 'center',
  },
  settingTitle: {
    fontSize: 16,
  },
  settingSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default SettingsScreen;

import React, {useState} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '@types';
import {useTheme} from '@theme';
import {useAppDispatch, useAppSelector} from '@hooks';
import {setSyncing, setSyncError, setLastSynced} from '@store/userSlice';
import {setEvents, setCategories} from '@store/eventsSlice';
import {setWidgets} from '@store/widgetSlice';
import * as cloudSync from '@services/cloudSync';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'CloudSync'>;

const CloudSyncScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  const {user, isAuthenticated, syncStatus} = useAppSelector(state => state.user);
  const {events, categories} = useAppSelector(state => state.events);
  const {widgets} = useAppSelector(state => state.widgets);
  const [isLoading, setIsLoading] = useState(false);

  const handleSync = async () => {
    if (!isAuthenticated || !user) return;

    setIsLoading(true);
    dispatch(setSyncing(true));

    try {
      await cloudSync.syncAllData(user.id, events, categories, widgets);
      dispatch(setLastSynced(Date.now()));
      Alert.alert('同步成功', '所有数据已同步到云端');
    } catch (error: any) {
      dispatch(setSyncError(error.message));
      Alert.alert('同步失败', error.message);
    } finally {
      setIsLoading(false);
      dispatch(setSyncing(false));
    }
  };

  const handleRestore = async () => {
    if (!isAuthenticated || !user) return;

    Alert.alert(
      '恢复数据',
      '这将用云端数据覆盖本地数据，确定继续吗？',
      [
        {text: '取消', style: 'cancel'},
        {
          text: '确定恢复',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            dispatch(setSyncing(true));

            try {
              const data = await cloudSync.fetchAllData(user.id);
              dispatch(setEvents(data.events));
              dispatch(setCategories(data.categories));
              dispatch(setWidgets(data.widgets));
              dispatch(setLastSynced(Date.now()));
              Alert.alert('恢复成功', '数据已从云端恢复');
            } catch (error: any) {
              dispatch(setSyncError(error.message));
              Alert.alert('恢复失败', error.message);
            } finally {
              setIsLoading(false);
              dispatch(setSyncing(false));
            }
          },
        },
      ],
    );
  };

  const navigateToLogin = () => {
    navigation.navigate('Login');
  };

  const navigateToRegister = () => {
    navigation.navigate('Register');
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, {color: theme.colors.text}]}>云同步</Text>
          <Text style={[styles.subtitle, {color: theme.colors.textSecondary}]}>
            在多设备间同步你的倒计时数据
          </Text>
        </View>

        {!isAuthenticated ? (
          <View style={[styles.authSection, {backgroundColor: theme.colors.surface}]}>
            <Text style={[styles.authTitle, {color: theme.colors.text}]}>
              登录以启用云同步
            </Text>
            <Text style={[styles.authSubtitle, {color: theme.colors.textSecondary}]}>
              创建账号后，你可以在不同设备间同步所有倒计时数据
            </Text>

            <View style={styles.authButtons}>
              <TouchableOpacity
                style={[styles.primaryButton, {backgroundColor: theme.colors.primary}]}
                onPress={navigateToLogin}>
                <Text style={styles.primaryButtonText}>登录</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryButton, {borderColor: theme.colors.border}]}
                onPress={navigateToRegister}>
                <Text style={{color: theme.colors.text}}>注册账号</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <View style={[styles.userSection, {backgroundColor: theme.colors.surface}]}>
              <View style={styles.userInfo}>
                <View style={[styles.avatar, {backgroundColor: theme.colors.primary}]}>
                  <Text style={styles.avatarText}>
                    {user?.displayName?.[0]?.toUpperCase() ||
                      user?.email?.[0]?.toUpperCase() ||
                      '?'}
                  </Text>
                </View>
                <View>
                  <Text style={[styles.userName, {color: theme.colors.text}]}>
                    {user?.displayName || user?.email}
                  </Text>
                  <Text style={[styles.userEmail, {color: theme.colors.textSecondary}]}>
                    {user?.email}
                  </Text>
                </View>
              </View>

              {syncStatus.lastSyncedAt && (
                <View style={[styles.syncInfo, {borderTopColor: theme.colors.border}]}>
                  <Text style={{color: theme.colors.textSecondary}}>
                    上次同步: {new Date(syncStatus.lastSyncedAt).toLocaleString()}
                  </Text>
                </View>
              )}

              {syncStatus.error && (
                <View style={[styles.errorInfo, {backgroundColor: 'rgba(239,68,68,0.1)'}]}>
                  <Text style={{color: '#EF4444'}}>⚠️ {syncStatus.error}</Text>
                </View>
              )}
            </View>

            <View style={[styles.statsSection, {backgroundColor: theme.colors.surface}]}>
              <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>
                同步统计
              </Text>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, {color: theme.colors.primary}]}>
                    {events.length}
                  </Text>
                  <Text style={[styles.statLabel, {color: theme.colors.textSecondary}]}>
                    事件
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, {color: theme.colors.secondary}]}>
                    {categories.length}
                  </Text>
                  <Text style={[styles.statLabel, {color: theme.colors.textSecondary}]}>
                    分类
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, {color: theme.colors.accent}]}>
                    {widgets.length}
                  </Text>
                  <Text style={[styles.statLabel, {color: theme.colors.textSecondary}]}>
                    小组件
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.syncButtons}>
              <TouchableOpacity
                style={[
                  styles.syncButton,
                  {backgroundColor: theme.colors.primary},
                  (isLoading || syncStatus.isSyncing) && {opacity: 0.7},
                ]}
                onPress={handleSync}
                disabled={isLoading || syncStatus.isSyncing}>
                {isLoading || syncStatus.isSyncing ? (
                  <View style={styles.buttonContent}>
                    <ActivityIndicator color="#FFFFFF" />
                    <Text style={styles.syncButtonText}>  同步中...</Text>
                  </View>
                ) : (
                  <Text style={styles.syncButtonText}>☁️ 同步到云端</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.restoreButton,
                  {borderColor: theme.colors.border},
                  (isLoading || syncStatus.isSyncing) && {opacity: 0.7},
                ]}
                onPress={handleRestore}
                disabled={isLoading || syncStatus.isSyncing}>
                <Text style={{color: theme.colors.text}}>📥 从云端恢复</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.infoSection, {backgroundColor: theme.colors.surface}]}>
              <Text style={[styles.infoTitle, {color: theme.colors.text}]}>
                💡 云同步说明
              </Text>
              <Text style={[styles.infoText, {color: theme.colors.textSecondary}]}>
                • 数据安全加密存储在云端{'\n'}
                • 支持多设备实时同步{'\n'}
                • 卸载应用后数据不会丢失{'\n'}
                • 建议定期同步确保数据安全{'\n'}
                • 恢复操作会覆盖本地数据，请谨慎操作
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  authSection: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  authTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  authSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  authButtons: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  userSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
  },
  syncInfo: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  errorInfo: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
  },
  statsSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  syncButtons: {
    gap: 12,
    marginBottom: 16,
  },
  syncButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  restoreButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  infoSection: {
    borderRadius: 16,
    padding: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 24,
  },
});

export default CloudSyncScreen;

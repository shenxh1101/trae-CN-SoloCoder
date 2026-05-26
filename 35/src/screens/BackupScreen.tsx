import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  useTheme,
  Dialog,
  Portal,
  ActivityIndicator,
} from 'react-native-paper';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { BackupService } from '../services/BackupService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatDate } from '../utils/helpers';

interface Props {
  navigation: any;
}

const BackupScreen: React.FC<Props> = ({ navigation }) => {
  const { exportData, importData, tasks, lists } = useData();
  const { user, isAuthenticated } = useAuth();
  const { theme } = useAppTheme();
  const paperTheme = useTheme();

  const [loading, setLoading] = useState(false);
  const [successDialogVisible, setSuccessDialogVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [confirmDialogVisible, setConfirmDialogVisible] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'export' | 'import' | null>(null);
  const [lastBackupTime, setLastBackupTime] = useState<number | null>(null);

  const handleLocalExport = async () => {
    setLoading(true);
    try {
      const data = exportData();
      const fileUri = await BackupService.exportToLocalFile(data);
      setLastBackupTime(Date.now());
      setSuccessMessage(`备份成功！文件已保存到: ${fileUri}`);
      setSuccessDialogVisible(true);
    } catch (error) {
      setSuccessMessage('备份失败: ' + (error instanceof Error ? error.message : '未知错误'));
      setSuccessDialogVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handleLocalImport = async () => {
    setLoading(true);
    try {
      const fileUri = `file:///data/user/0/com.todo.app/files/todo_backup.json`;
      const data = await BackupService.importFromLocalFile(fileUri);
      importData(data);
      setSuccessMessage('恢复成功！');
      setSuccessDialogVisible(true);
    } catch (error) {
      setSuccessMessage('恢复失败: ' + (error instanceof Error ? error.message : '未知错误'));
      setSuccessDialogVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCloudBackup = async () => {
    if (!isAuthenticated || !user) return;
    setLoading(true);
    try {
      const { getAuthToken } = require('../services/AuthService');
      const token = await getAuthToken();
      if (!token) throw new Error('未登录');

      const data = exportData();
      await BackupService.uploadToCloud(data, token);
      setLastBackupTime(Date.now());
      setSuccessMessage('云端备份成功！');
      setSuccessDialogVisible(true);
    } catch (error) {
      setSuccessMessage('云端备份失败: ' + (error instanceof Error ? error.message : '未知错误'));
      setSuccessDialogVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCloudRestore = async () => {
    if (!isAuthenticated || !user) return;
    setLoading(true);
    try {
      const { getAuthToken } = require('../services/AuthService');
      const token = await getAuthToken();
      if (!token) throw new Error('未登录');

      const data = await BackupService.downloadFromCloud(token);
      importData(data);
      setSuccessMessage('从云端恢复成功！');
      setSuccessDialogVisible(true);
    } catch (error) {
      setSuccessMessage('从云端恢复失败: ' + (error instanceof Error ? error.message : '未知错误'));
      setSuccessDialogVisible(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={[styles.infoCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons
                name="database"
                size={24}
                color={theme.colors.primary}
              />
              <View style={styles.infoText}>
                <Paragraph style={{ color: theme.colors.text }}>
                  清单数量: {lists.length}
                </Paragraph>
                <Paragraph style={{ color: theme.colors.text }}>
                  任务数量: {tasks.length}
                </Paragraph>
              </View>
            </View>
            {lastBackupTime && (
              <Paragraph style={[styles.lastBackup, { color: paperTheme.colors.onSurfaceVariant }]}>
                上次备份: {formatDate(lastBackupTime, 'yyyy-MM-dd HH:mm')}
              </Paragraph>
            )}
          </Card.Content>
        </Card>

        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={[styles.cardTitle, { color: theme.colors.text }]}>
              本地备份
            </Title>
            <Paragraph style={[styles.cardDescription, { color: paperTheme.colors.onSurfaceVariant }]}>
              将数据保存到本地文件
            </Paragraph>
            <Button
              mode="contained"
              icon="download"
              style={[styles.button, { backgroundColor: theme.colors.primary }]}
              onPress={handleLocalExport}
              loading={loading}
              disabled={loading}
            >
              导出到本地
            </Button>
            <Button
              mode="outlined"
              icon="upload"
              style={styles.button}
              onPress={handleLocalImport}
              loading={loading}
              disabled={loading}
            >
              从本地恢复
            </Button>
          </Card.Content>
        </Card>

        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={[styles.cardTitle, { color: theme.colors.text }]}>
              云端备份
            </Title>
            <Paragraph style={[styles.cardDescription, { color: paperTheme.colors.onSurfaceVariant }]}>
              将数据保存到云端，随时恢复
            </Paragraph>
            {isAuthenticated ? (
              <>
                <Button
                  mode="contained"
                  icon="cloud-upload"
                  style={[styles.button, { backgroundColor: theme.colors.primary }]}
                  onPress={handleCloudBackup}
                  loading={loading}
                  disabled={loading}
                >
                  备份到云端
                </Button>
                <Button
                  mode="outlined"
                  icon="cloud-download"
                  style={styles.button}
                  onPress={handleCloudRestore}
                  loading={loading}
                  disabled={loading}
                >
                  从云端恢复
                </Button>
              </>
            ) : (
              <Paragraph style={{ color: paperTheme.colors.error }}>
                请先登录以使用云端备份功能
              </Paragraph>
            )}
          </Card.Content>
        </Card>
      </ScrollView>

      <Portal>
        <Dialog
          visible={successDialogVisible}
          onDismiss={() => setSuccessDialogVisible(false)}
          style={{ backgroundColor: theme.colors.surface }}
        >
          <Dialog.Title style={{ color: theme.colors.text }}>提示</Dialog.Title>
          <Dialog.Content>
            <Paragraph style={{ color: theme.colors.text }}>{successMessage}</Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSuccessDialogVisible(false)}>确定</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  infoCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    marginLeft: 16,
  },
  lastBackup: {
    marginTop: 12,
    fontSize: 12,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    marginBottom: 4,
  },
  cardDescription: {
    marginBottom: 16,
  },
  button: {
    marginBottom: 8,
    borderRadius: 8,
  },
});

export default BackupScreen;

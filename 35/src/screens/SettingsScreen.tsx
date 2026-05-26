import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  List,
  Switch,
  useTheme,
  Divider,
  Button,
} from 'react-native-paper';
import { useAppTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { EmailService } from '../services/EmailService';
import { useData } from '../context/DataContext';
import { focusSessionRepository } from '../database/database';

interface Props {
  navigation: any;
}

const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { theme, isDark, toggleTheme } = useAppTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const { tasks } = useData();
  const paperTheme = useTheme();

  const handleSendReport = async () => {
    if (!user?.email) return;
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    const sessions = focusSessionRepository.getByDateRange(
      startOfWeek.getTime(),
      Date.now()
    );
    await EmailService.sendWeeklyReport(user.email, tasks, sessions);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView>
        {isAuthenticated && user && (
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <View style={styles.profileRow}>
                <MaterialCommunityIcons
                  name="account-circle"
                  size={48}
                  color={theme.colors.primary}
                />
                <View style={styles.profileInfo}>
                  <Title style={[styles.profileName, { color: theme.colors.text }]}>
                    {user.name || '用户'}
                  </Title>
                  <Paragraph style={[styles.profileEmail, { color: paperTheme.colors.onSurfaceVariant }]}>
                    {user.email}
                  </Paragraph>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={[styles.sectionTitle, { color: theme.colors.text }]}>外观</Title>
            <List.Item
              title="夜间模式"
              description={isDark ? '已开启' : '已关闭'}
              left={props => <List.Icon {...props} icon="theme-light-dark" />}
              right={props => (
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  color={theme.colors.primary}
                />
              )}
            />
          </Card.Content>
        </Card>

        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={[styles.sectionTitle, { color: theme.colors.text }]}>功能</Title>
            <List.Item
              title="标签管理"
              description="创建和管理任务标签"
              left={props => <List.Icon {...props} icon="tag" />}
              onPress={() => navigation.navigate('Tags')}
            />
            <Divider />
            <List.Item
              title="语音输入"
              description="使用语音快速添加任务"
              left={props => <List.Icon {...props} icon="microphone" />}
              onPress={() => navigation.navigate('VoiceInput')}
            />
            <Divider />
            <List.Item
              title="数据备份"
              description="备份和恢复您的数据"
              left={props => <List.Icon {...props} icon="cloud-upload" />}
              onPress={() => navigation.navigate('Backup')}
            />
          </Card.Content>
        </Card>

        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={[styles.sectionTitle, { color: theme.colors.text }]}>报告</Title>
            <List.Item
              title="发送每周报告"
              description="通过邮件发送本周任务报告"
              left={props => <List.Icon {...props} icon="email" />}
              onPress={handleSendReport}
            />
          </Card.Content>
        </Card>

        {isAuthenticated && (
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Button
                mode="contained"
                style={[styles.logoutButton, { backgroundColor: paperTheme.colors.error }]}
                onPress={logout}
                icon="logout"
              >
                退出登录
              </Button>
            </Card.Content>
          </Card>
        )}

        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Paragraph style={[styles.versionText, { color: paperTheme.colors.onSurfaceVariant }]}>
              版本 1.0.0
            </Paragraph>
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    elevation: 2,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileInfo: {
    marginLeft: 16,
  },
  profileName: {
    fontSize: 20,
  },
  profileEmail: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 8,
  },
  logoutButton: {
    marginTop: 8,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
  },
});

export default SettingsScreen;

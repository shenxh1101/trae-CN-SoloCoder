import React, {useState} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '@types';
import {useTheme} from '@theme';
import {useAppDispatch} from '@hooks';
import {setUser} from '@store/userSlice';
import * as cloudSync from '@services/cloudSync';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Register'>;

const RegisterScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRegister = async () => {
    if (!displayName.trim()) {
      Alert.alert('错误', '请输入昵称');
      return;
    }
    if (!email.trim()) {
      Alert.alert('错误', '请输入邮箱地址');
      return;
    }
    if (!password.trim()) {
      Alert.alert('错误', '请输入密码');
      return;
    }
    if (password.length < 6) {
      Alert.alert('错误', '密码长度至少为6位');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('错误', '两次输入的密码不一致');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('错误', '请输入有效的邮箱地址');
      return;
    }

    setIsLoading(true);
    try {
      const {user} = await cloudSync.signUpWithEmail(
        email.trim(),
        password,
        displayName.trim(),
      );
      dispatch(setUser(user));
      Alert.alert('注册成功', '你的账号已创建成功！', [
        {text: '确定', onPress: () => navigation.goBack()},
      ]);
    } catch (error: any) {
      Alert.alert('注册失败', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={[styles.logo, {color: theme.colors.primary}]}>✨</Text>
          <Text style={[styles.title, {color: theme.colors.text}]}>创建账号</Text>
          <Text style={[styles.subtitle, {color: theme.colors.textSecondary}]}>
            开始你的倒计时之旅
          </Text>
        </View>

        <View style={[styles.form, {backgroundColor: theme.colors.surface}]}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, {color: theme.colors.text}]}>昵称</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="请输入昵称"
              placeholderTextColor={theme.colors.textSecondary}
              autoCapitalize="words"
              maxLength={20}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, {color: theme.colors.text}]}>邮箱</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              value={email}
              onChangeText={setEmail}
              placeholder="请输入邮箱地址"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, {color: theme.colors.text}]}>密码</Text>
            <View style={styles.passwordInput}>
              <TextInput
                style={[
                  styles.input,
                  {
                    flex: 1,
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                  },
                ]}
                value={password}
                onChangeText={setPassword}
                placeholder="请输入密码（至少6位）"
                placeholderTextColor={theme.colors.textSecondary}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.showPasswordButton}
                onPress={() => setShowPassword(!showPassword)}>
                <Text style={{color: theme.colors.primary}}>
                  {showPassword ? '🙈' : '👁️'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, {color: theme.colors.text}]}>确认密码</Text>
            <View style={styles.passwordInput}>
              <TextInput
                style={[
                  styles.input,
                  {
                    flex: 1,
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                  },
                ]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="请再次输入密码"
                placeholderTextColor={theme.colors.textSecondary}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.showPasswordButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Text style={{color: theme.colors.primary}}>
                  {showConfirmPassword ? '🙈' : '👁️'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.registerButton,
              {backgroundColor: theme.colors.primary},
              isLoading && {opacity: 0.7},
            ]}
            onPress={handleRegister}
            disabled={isLoading}>
            {isLoading ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={styles.registerButtonText}>  注册中...</Text>
              </View>
            ) : (
              <Text style={styles.registerButtonText}>注册账号</Text>
            )}
          </TouchableOpacity>

          <Text style={[styles.termsText, {color: theme.colors.textSecondary}]}>
            注册即表示你同意我们的服务条款和隐私政策
          </Text>
        </View>

        <View style={styles.divider}>
          <View style={[styles.dividerLine, {backgroundColor: theme.colors.border}]} />
          <Text style={[styles.dividerText, {color: theme.colors.textSecondary}]}>或</Text>
          <View style={[styles.dividerLine, {backgroundColor: theme.colors.border}]} />
        </View>

        <View style={styles.loginSection}>
          <Text style={{color: theme.colors.textSecondary}}>已有账号？</Text>
          <TouchableOpacity onPress={navigateToLogin}>
            <Text style={{color: theme.colors.primary, fontWeight: '600'}}> 立即登录</Text>
          </TouchableOpacity>
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
    flexGrow: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginVertical: 32,
  },
  logo: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  form: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  passwordInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  showPasswordButton: {
    position: 'absolute',
    right: 16,
    padding: 8,
  },
  registerButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  termsText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
  },
  loginSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
});

export default RegisterScreen;

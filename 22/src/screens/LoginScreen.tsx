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

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

const LoginScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert('错误', '请输入邮箱地址');
      return;
    }
    if (!password.trim()) {
      Alert.alert('错误', '请输入密码');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('错误', '请输入有效的邮箱地址');
      return;
    }

    setIsLoading(true);
    try {
      const {user} = await cloudSync.signInWithEmail(email.trim(), password);
      dispatch(setUser(user));
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('登录失败', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert('提示', '请先输入邮箱地址');
      return;
    }

    try {
      await cloudSync.resetPassword(email.trim());
      Alert.alert('邮件已发送', '请检查邮箱重置密码');
    } catch (error: any) {
      Alert.alert('发送失败', error.message);
    }
  };

  const navigateToRegister = () => {
    navigation.navigate('Register');
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={[styles.logo, {color: theme.colors.primary}]}>⏰</Text>
          <Text style={[styles.title, {color: theme.colors.text}]}>欢迎回来</Text>
          <Text style={[styles.subtitle, {color: theme.colors.textSecondary}]}>
            登录账号以同步你的倒计时
          </Text>
        </View>

        <View style={[styles.form, {backgroundColor: theme.colors.surface}]}>
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
                placeholder="请输入密码"
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

          <TouchableOpacity style={styles.forgotButton} onPress={handleResetPassword}>
            <Text style={{color: theme.colors.primary}}>忘记密码？</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.loginButton,
              {backgroundColor: theme.colors.primary},
              isLoading && {opacity: 0.7},
            ]}
            onPress={handleLogin}
            disabled={isLoading}>
            {isLoading ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={styles.loginButtonText}>  登录中...</Text>
              </View>
            ) : (
              <Text style={styles.loginButtonText}>登录</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.divider}>
          <View style={[styles.dividerLine, {backgroundColor: theme.colors.border}]} />
          <Text style={[styles.dividerText, {color: theme.colors.textSecondary}]}>或</Text>
          <View style={[styles.dividerLine, {backgroundColor: theme.colors.border}]} />
        </View>

        <View style={styles.registerSection}>
          <Text style={{color: theme.colors.textSecondary}}>还没有账号？</Text>
          <TouchableOpacity onPress={navigateToRegister}>
            <Text style={{color: theme.colors.primary, fontWeight: '600'}}> 立即注册</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => navigation.goBack()}>
          <Text style={{color: theme.colors.textSecondary}}>跳过，稍后再说</Text>
        </TouchableOpacity>
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
    marginVertical: 40,
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
    marginBottom: 20,
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
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  loginButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
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
  registerSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  skipButton: {
    alignSelf: 'center',
    padding: 12,
  },
});

export default LoginScreen;

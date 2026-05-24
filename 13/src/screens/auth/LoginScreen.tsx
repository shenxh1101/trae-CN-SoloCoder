import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import {sendPhoneVerification, verifyPhoneCode, signInWithGoogle, signInWithApple} from '@redux/slices/authSlice';
import {fetchUserProfile} from '@redux/slices/userSlice';
import {AppDispatch, RootState} from '@redux/store';

const LoginScreen = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const {isLoading, error, verificationId} = useSelector((state: RootState) => state.auth);

  const handleSendCode = async () => {
    if (!phoneNumber || phoneNumber.length < 11) {
      Alert.alert('提示', '请输入有效的手机号码');
      return;
    }

    try {
      await dispatch(sendPhoneVerification(phoneNumber)).unwrap();
      setShowCodeInput(true);
      Alert.alert('提示', '验证码已发送');
    } catch (err: any) {
      Alert.alert('错误', err.message || '发送验证码失败');
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length < 6) {
      Alert.alert('提示', '请输入6位验证码');
      return;
    }

    if (verificationId) {
      try {
        const user = await dispatch(verifyPhoneCode({verificationId, code: verificationCode})).unwrap();
        await dispatch(fetchUserProfile(user.uid)).unwrap();
        Alert.alert('登录成功');
      } catch (err: any) {
        Alert.alert('错误', err.message || '验证码验证失败');
      }
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const user = await dispatch(signInWithGoogle()).unwrap();
      await dispatch(fetchUserProfile(user.uid)).unwrap();
    } catch (err: any) {
      Alert.alert('错误', err.message || 'Google登录失败');
    }
  };

  const handleAppleSignIn = async () => {
    try {
      const user = await dispatch(signInWithApple()).unwrap();
      await dispatch(fetchUserProfile(user.uid)).unwrap();
    } catch (err: any) {
      Alert.alert('错误', err.message || 'Apple登录失败');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>FitTrack Pro</Text>
      <Text style={styles.subtitle}>专业健身追踪应用</Text>

      {!showCodeInput ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="请输入手机号码"
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholderTextColor="#999"
          />
          <TouchableOpacity
            style={[styles.button, isLoading && styles.disabledButton]}
            onPress={handleSendCode}
            disabled={isLoading}>
            <Text style={styles.buttonText}>
              {isLoading ? '发送中...' : '发送验证码'}
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <TextInput
            style={styles.input}
            placeholder="请输入验证码"
            keyboardType="number-pad"
            value={verificationCode}
            onChangeText={setVerificationCode}
            maxLength={6}
            placeholderTextColor="#999"
          />
          <TouchableOpacity
            style={[styles.button, isLoading && styles.disabledButton]}
            onPress={handleVerifyCode}
            disabled={isLoading}>
            <Text style={styles.buttonText}>
              {isLoading ? '验证中...' : '登录'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowCodeInput(false)}>
            <Text style={styles.linkText}>重新发送验证码</Text>
          </TouchableOpacity>
        </>
      )}

      <View style={styles.dividerContainer}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>或使用其他方式登录</Text>
        <View style={styles.divider} />
      </View>

      <TouchableOpacity style={[styles.socialButton, styles.googleButton]} onPress={handleGoogleSignIn}>
        <Text style={styles.socialButtonText}>使用 Google 登录</Text>
      </TouchableOpacity>

      {Platform.OS === 'ios' && (
        <TouchableOpacity style={[styles.socialButton, styles.appleButton]} onPress={handleAppleSignIn}>
          <Text style={[styles.socialButtonText, {color: '#fff}]}>使用 Apple 登录</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.linkText}>没有账号？立即注册</Text>
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#4CAF50',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#4CAF50',
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  socialButton: {
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
  },
  googleButton: {
    borderColor: '#4285F4',
  },
  appleButton: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    paddingHorizontal: 10,
    color: '#999',
    fontSize: 14,
  },
  linkText: {
    color: '#4CAF50',
    textAlign: 'center',
    marginTop: 15,
    fontSize: 14,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 10,
  },
});

export default LoginScreen;

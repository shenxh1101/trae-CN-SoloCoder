import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import {sendPhoneVerification, verifyPhoneCode, clearError} from '@redux/slices/authSlice';
import {createUserProfile} from '@redux/slices/userSlice';
import {AppDispatch, RootState} from '@redux/store';

type RegisterStep = 'phone' | 'code' | 'password' | 'complete';

interface RegisterFormData {
  phoneNumber: string;
  verificationCode: string;
  password: string;
  confirmPassword: string;
}

const RegisterScreen = () => {
  const [currentStep, setCurrentStep] = useState<RegisterStep>('phone');
  const [formData, setFormData] = useState<RegisterFormData>({
    phoneNumber: '',
    verificationCode: '',
    password: '',
    confirmPassword: '',
  });
  const [countdown, setCountdown] = useState(0);
  const [verificationId, setLocalVerificationId] = useState<string | null>(null);

  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const {isLoading, error} = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [countdown]);

  useEffect(() => {
    if (error) {
      Alert.alert('错误', error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const updateFormData = useCallback((field: keyof RegisterFormData, value: string) => {
    setFormData(prev => ({...prev, [field]: value}));
  }, []);

  const validatePhone = useCallback((phone: string): boolean => {
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phone) {
      Alert.alert('提示', '请输入手机号码');
      return false;
    }
    if (!phoneRegex.test(phone)) {
      Alert.alert('提示', '请输入有效的手机号码');
      return false;
    }
    return true;
  }, []);

  const validateCode = useCallback((code: string): boolean => {
    if (!code) {
      Alert.alert('提示', '请输入验证码');
      return false;
    }
    if (code.length !== 6) {
      Alert.alert('提示', '请输入6位验证码');
      return false;
    }
    return true;
  }, []);

  const validatePassword = useCallback((password: string, confirmPassword: string): boolean => {
    if (!password) {
      Alert.alert('提示', '请输入密码');
      return false;
    }
    if (password.length < 6) {
      Alert.alert('提示', '密码长度不能少于6位');
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('提示', '两次输入的密码不一致');
      return false;
    }
    return true;
  }, []);

  const handleSendCode = useCallback(async () => {
    if (!validatePhone(formData.phoneNumber)) return;
    if (countdown > 0) return;

    try {
      const verificationIdResult = await dispatch(
        sendPhoneVerification(formData.phoneNumber)
      ).unwrap();
      setLocalVerificationId(verificationIdResult);
      setCountdown(60);
      Alert.alert('提示', '验证码已发送，请注意查收');
    } catch (err: any) {
      Alert.alert('错误', err.message || '发送验证码失败');
    }
  }, [dispatch, formData.phoneNumber, countdown, validatePhone]);

  const handleNextStep = useCallback(async () => {
    switch (currentStep) {
      case 'phone':
        if (!validatePhone(formData.phoneNumber)) return;
        if (countdown === 0) {
          await handleSendCode();
        }
        setCurrentStep('code');
        break;
      case 'code':
        if (!validateCode(formData.verificationCode)) return;
        if (!verificationId) {
          Alert.alert('错误', '请先获取验证码');
          return;
        }
        try {
          const user = await dispatch(
            verifyPhoneCode({verificationId, code: formData.verificationCode})
          ).unwrap();
          await dispatch(
            createUserProfile({
              id: user.uid,
              phoneNumber: formData.phoneNumber,
            })
          ).unwrap();
          setCurrentStep('password');
        } catch (err: any) {
          Alert.alert('错误', err.message || '验证码验证失败');
        }
        break;
      case 'password':
        if (!validatePassword(formData.password, formData.confirmPassword)) return;
        setCurrentStep('complete');
        break;
      case 'complete':
        navigation.navigate('Login' as never);
        break;
    }
  }, [currentStep, formData, verificationId, countdown, dispatch, navigation, validatePhone, validateCode, validatePassword, handleSendCode]);

  const handlePrevStep = useCallback(() => {
    switch (currentStep) {
      case 'code':
        setCurrentStep('phone');
        break;
      case 'password':
        setCurrentStep('code');
        break;
      default:
        break;
    }
  }, [currentStep]);

  const renderStepIndicator = () => {
    const steps: RegisterStep[] = ['phone', 'code', 'password', 'complete'];
    const stepLabels = ['手机号', '验证码', '设置密码', '完成'];
    const currentIndex = steps.indexOf(currentStep);

    return (
      <View style={styles.stepContainer}>
        {steps.map((step, index) => (
          <React.Fragment key={step}>
            <View style={styles.stepWrapper}>
              <View
                style={[
                  styles.stepCircle,
                  index <= currentIndex && styles.activeStepCircle,
                ]}>
                <Text
                  style={[
                    styles.stepNumber,
                    index <= currentIndex && styles.activeStepText,
                  ]}>
                  {index + 1}
                </Text>
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  index <= currentIndex && styles.activeStepLabel,
                ]}>
                {stepLabels[index]}
              </Text>
            </View>
            {index < steps.length - 1 && (
              <View
                style={[
                  styles.stepLine,
                  index < currentIndex && styles.activeStepLine,
                ]}
              />
            )}
          </React.Fragment>
        ))}
      </View>
    );
  };

  const renderPhoneInput = () => (
    <View style={styles.formContainer}>
      <Text style={styles.formTitle}>注册账号</Text>
      <Text style={styles.formSubtitle}>请输入您的手机号码</Text>
      <TextInput
        style={styles.input}
        placeholder="请输入11位手机号码"
        keyboardType="phone-pad"
        value={formData.phoneNumber}
        onChangeText={(text) => updateFormData('phoneNumber', text)}
        maxLength={11}
        placeholderTextColor="#999"
      />
      <TouchableOpacity
        style={[styles.button, isLoading && styles.disabledButton]}
        onPress={handleNextStep}
        disabled={isLoading}>
        <Text style={styles.buttonText}>
          {isLoading ? '处理中...' : '下一步'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderCodeInput = () => (
    <View style={styles.formContainer}>
      <Text style={styles.formTitle}>验证码验证</Text>
      <Text style={styles.formSubtitle}>
        验证码已发送至 {formData.phoneNumber}
      </Text>
      <TextInput
        style={styles.input}
        placeholder="请输入6位验证码"
        keyboardType="number-pad"
        value={formData.verificationCode}
        onChangeText={(text) => updateFormData('verificationCode', text)}
        maxLength={6}
        placeholderTextColor="#999"
      />
      <View style={styles.codeButtonContainer}>
        <TouchableOpacity
          style={[
            styles.codeButton,
            countdown > 0 && styles.disabledCodeButton,
          ]}
          onPress={handleSendCode}
          disabled={countdown > 0 || isLoading}>
          <Text style={styles.codeButtonText}>
            {countdown > 0 ? `${countdown}秒后重新发送` : '发送验证码'}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handlePrevStep}>
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>
            上一步
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton, isLoading && styles.disabledButton]}
          onPress={handleNextStep}
          disabled={isLoading}>
          <Text style={styles.buttonText}>
            {isLoading ? '验证中...' : '验证'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPasswordInput = () => (
    <View style={styles.formContainer}>
      <Text style={styles.formTitle}>设置密码</Text>
      <Text style={styles.formSubtitle}>请设置您的登录密码</Text>
      <TextInput
        style={styles.input}
        placeholder="请输入密码（至少6位）"
        secureTextEntry
        value={formData.password}
        onChangeText={(text) => updateFormData('password', text)}
        placeholderTextColor="#999"
      />
      <TextInput
        style={styles.input}
        placeholder="请再次输入密码"
        secureTextEntry
        value={formData.confirmPassword}
        onChangeText={(text) => updateFormData('confirmPassword', text)}
        placeholderTextColor="#999"
      />
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handlePrevStep}>
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>
            上一步
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleNextStep}>
          <Text style={styles.buttonText}>完成</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderComplete = () => (
    <View style={styles.formContainer}>
      <View style={styles.successIcon}>
        <Text style={styles.successIconText}>✓</Text>
      </View>
      <Text style={styles.formTitle}>注册成功！</Text>
      <Text style={styles.formSubtitle}>
        您的账号已成功注册，现在可以登录了
      </Text>
      <TouchableOpacity
        style={styles.button}
        onPress={handleNextStep}>
        <Text style={styles.buttonText}>返回登录</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'phone':
        return renderPhoneInput();
      case 'code':
        return renderCodeInput();
      case 'password':
        return renderPasswordInput();
      case 'complete':
        return renderComplete();
      default:
        return null;
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <Text style={styles.title}>FitTrack Pro</Text>
        <Text style={styles.subtitle}>创建您的健身账号</Text>

        {renderStepIndicator()}

        {renderCurrentStep()}

        {currentStep !== 'complete' && (
          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.navigate('Login' as never)}>
            <Text style={styles.loginLinkText}>
              已有账号？<Text style={styles.loginLinkHighlight}>立即登录</Text>
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 8,
    color: '#4CAF50',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  stepWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  activeStepCircle: {
    backgroundColor: '#4CAF50',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  activeStepText: {
    color: '#fff',
  },
  stepLabel: {
    fontSize: 12,
    color: '#999',
  },
  activeStepLabel: {
    color: '#4CAF50',
    fontWeight: '500',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 4,
    marginBottom: 20,
  },
  activeStepLine: {
    backgroundColor: '#4CAF50',
  },
  formContainer: {
    flex: 1,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  formSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
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
  primaryButton: {
    flex: 1,
    marginLeft: 10,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  secondaryButtonText: {
    color: '#4CAF50',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  codeButtonContainer: {
    marginBottom: 10,
  },
  codeButton: {
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  disabledCodeButton: {
    backgroundColor: '#F5F5F5',
    borderColor: '#ddd',
  },
  codeButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '500',
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  successIconText: {
    fontSize: 40,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  loginLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: 14,
    color: '#666',
  },
  loginLinkHighlight: {
    color: '#4CAF50',
    fontWeight: '500',
  },
});

export default RegisterScreen;

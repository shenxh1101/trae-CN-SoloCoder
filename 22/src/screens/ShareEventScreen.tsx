import React, {useState, useRef, useCallback} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Image,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import {useRoute} from '@react-navigation/native';
import Share from 'react-native-share';
import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import {check, PERMISSIONS, request, RESULTS} from 'react-native-permissions';
import ViewShot, {captureRef} from 'react-native-view-shot';
import {ShareCardConfig} from '@types';
import {useTheme} from '@theme';
import {useEvent, useCountdown} from '@hooks';
import ShareCard from '@components/ShareCard';

type RouteProps = {
  params: {
    eventId: string;
  };
};

const ShareEventScreen: React.FC = () => {
  const theme = useTheme();
  const route = useRoute<RouteProps>();
  const cardRef = useRef<ViewShot>(null);

  const {event, category} = useEvent(route.params.eventId);
  const timeRemaining = useCountdown(event?.targetDate || 0, !!event);

  const [cardStyle, setCardStyle] = useState<ShareCardConfig['cardStyle']>('modern');
  const [showDate, setShowDate] = useState(true);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!event) {
    return (
      <View style={[styles.container, {backgroundColor: theme.colors.background}]}>
        <Text style={{color: theme.colors.text}}>事件不存在</Text>
      </View>
    );
  }

  const checkPhotoPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'ios') {
      const result = await check(PERMISSIONS.IOS.PHOTO_LIBRARY_ADD_ONLY);
      if (result === RESULTS.GRANTED) return true;

      const requestResult = await request(PERMISSIONS.IOS.PHOTO_LIBRARY_ADD_ONLY);
      return requestResult === RESULTS.GRANTED;
    }

    if (Platform.OS === 'android') {
      if (Platform.Version >= 33) {
        const result = await check(PERMISSIONS.ANDROID.READ_MEDIA_IMAGES);
        if (result === RESULTS.GRANTED) return true;

        const requestResult = await request(PERMISSIONS.ANDROID.READ_MEDIA_IMAGES);
        return requestResult === RESULTS.GRANTED;
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: '保存图片权限',
            message: '需要存储权限来保存倒计时图片到相册',
            buttonPositive: '确定',
            buttonNegative: '取消',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    }

    return true;
  }, []);

  const handleGenerateImage = async (): Promise<string | null> => {
    if (!cardRef.current) return null;

    setIsGenerating(true);
    try {
      const uri = await captureRef(cardRef.current, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        snapshotContentContainer: true,
      });
      setCapturedImage(uri);
      return uri;
    } catch (error) {
      console.error('Generate image error:', error);
      Alert.alert('生成失败', '无法生成分享图片，请重试');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    if (isSharing) return;

    setIsSharing(true);
    try {
      let imageUri = capturedImage;
      if (!imageUri) {
        imageUri = await handleGenerateImage();
      }

      if (!imageUri) {
        setIsSharing(false);
        return;
      }

      const shareMessage = `距离"${event.name}"还有 ${Math.abs(timeRemaining.days)} 天 ${String(timeRemaining.hours).padStart(2, '0')}:${String(timeRemaining.minutes).padStart(2, '0')}:${String(timeRemaining.seconds).padStart(2, '0')}！来一起倒计时吧！`;

      const shareOptions = {
        url: imageUri,
        title: event.name,
        message: shareMessage,
        subject: `倒计时: ${event.name}`,
        filename: `${event.name}_countdown`,
        type: 'image/png',
        activityItemSources: [
          {
            placeholderItem: {type: 'image/png', content: null},
            item: {
              default: {type: 'image/png', content: imageUri},
            },
            dataTypeIdentifier: {default: 'public.png'},
            subject: {default: event.name},
          },
        ],
      };

      await Share.open(shareOptions);
    } catch (error: any) {
      if (error.message !== 'User did not share' && error.message !== 'Share is not supported in this device') {
        console.error('Share error:', error);
        Alert.alert('分享失败', error.message || '无法分享图片');
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handleSaveToAlbum = async () => {
    if (isSaving) return;

    const hasPermission = await checkPhotoPermission();
    if (!hasPermission) {
      Alert.alert('权限不足', '请在设置中授予相册访问权限以保存图片');
      return;
    }

    setIsSaving(true);
    try {
      let imageUri = capturedImage;
      if (!imageUri) {
        imageUri = await handleGenerateImage();
      }

      if (!imageUri) {
        setIsSaving(false);
        return;
      }

      await CameraRoll.save(imageUri, {
        type: 'photo',
        album: '倒计时',
      });

      Alert.alert('保存成功', '倒计时图片已成功保存到相册！', [
        {text: '好的'},
        {text: '去查看', onPress: () => console.log('Open gallery')},
      ]);
    } catch (error: any) {
      console.error('Save to album error:', error);
      Alert.alert('保存失败', error.message || '无法保存图片到相册，请检查权限设置');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyText = async () => {
    const shareText = `距离"${event.name}"还有 ${Math.abs(timeRemaining.days)} 天 ${String(timeRemaining.hours).padStart(2, '0')}:${String(timeRemaining.minutes).padStart(2, '0')}:${String(timeRemaining.seconds).padStart(2, '0')}！来一起倒计时吧！`;

    try {
      await Share.open({
        title: event.name,
        message: shareText,
      });
    } catch (error) {
      console.log('Text share cancelled');
    }
  };

  const cardConfig: ShareCardConfig = {
    showBackground: true,
    showDate,
    cardStyle,
  };

  const styleOptions: Array<{value: ShareCardConfig['cardStyle']; label: string; emoji: string}> = [
    {value: 'modern', label: '现代', emoji: '✨'},
    {value: 'classic', label: '经典', emoji: '📜'},
    {value: 'elegant', label: '优雅', emoji: '💫'},
  ];

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.previewSection}>
          <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>卡片预览</Text>
          <View style={styles.cardPreview}>
            {capturedImage ? (
              <View style={styles.capturedImageContainer}>
                <Image
                  source={{uri: capturedImage}}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
                <View style={styles.capturedBadge}>
                  <Text style={styles.capturedBadgeText}>✓ 已生成</Text>
                </View>
              </View>
            ) : (
              <ViewShot ref={cardRef} options={{format: 'png', quality: 1}}>
                <ShareCard
                  event={event}
                  category={category}
                  timeRemaining={timeRemaining}
                  config={cardConfig}
                />
              </ViewShot>
            )}
          </View>
        </View>

        <View style={[styles.section, {backgroundColor: theme.colors.surface}]}>
          <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>🎨 卡片样式</Text>
          <View style={styles.styleOptions}>
            {styleOptions.map(option => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.styleOption,
                  {
                    backgroundColor:
                      cardStyle === option.value ? theme.colors.primary : 'transparent',
                    borderColor:
                      cardStyle === option.value ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                onPress={() => {
                  setCardStyle(option.value);
                  setCapturedImage(null);
                }}>
                <Text>{option.emoji}</Text>
                <Text
                  style={{
                    color: cardStyle === option.value ? '#FFFFFF' : theme.colors.text,
                    marginLeft: 4,
                  }}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.section, {backgroundColor: theme.colors.surface}]}>
          <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>⚙️ 显示选项</Text>
          <TouchableOpacity
            style={[styles.optionItem, {borderBottomColor: theme.colors.border}]}
            onPress={() => {
              setShowDate(!showDate);
              setCapturedImage(null);
            }}>
            <View style={styles.optionLeft}>
              <Text style={styles.optionIcon}>📅</Text>
              <Text style={[styles.optionLabel, {color: theme.colors.text}]}>显示日期</Text>
            </View>
            <View
              style={[
                styles.switch,
                {backgroundColor: showDate ? theme.colors.primary : theme.colors.border},
              ]}>
              <View
                style={[
                  styles.switchThumb,
                  {transform: [{translateX: showDate ? 20 : 0}]},
                ]}
              />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.actionSection}>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              {backgroundColor: theme.colors.primary},
              (isGenerating || isSharing || isSaving) && {opacity: 0.7},
            ]}
            onPress={handleGenerateImage}
            disabled={isGenerating || isSharing || isSaving}>
            {isGenerating ? (
              <View style={styles.buttonContent}>
                <Text style={styles.spinner}>⏳</Text>
                <Text style={styles.primaryButtonText}>  生成中...</Text>
              </View>
            ) : (
              <Text style={styles.primaryButtonText}>
                {capturedImage ? '🔄 重新生成' : '📸 生成图片'}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                {backgroundColor: theme.colors.success},
                (isGenerating || isSharing) && {opacity: 0.7},
              ]}
              onPress={handleShare}
              disabled={isGenerating || isSharing}>
              <Text style={styles.buttonText}>
                {isSharing ? '⏳ 分享中...' : '📤 分享'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                {backgroundColor: theme.colors.secondary},
                (isGenerating || isSaving) && {opacity: 0.7},
              ]}
              onPress={handleSaveToAlbum}
              disabled={isGenerating || isSaving}>
              <Text style={styles.buttonText}>
                {isSaving ? '⏳ 保存中...' : '💾 保存'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.secondaryButton,
              {borderColor: theme.colors.border},
            ]}
            onPress={handleCopyText}>
            <Text style={{color: theme.colors.text}}>📝 分享文字</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.section, {backgroundColor: theme.colors.surface}]}>
          <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>💬 分享文案</Text>
          <View style={[styles.shareTextContainer, {backgroundColor: theme.colors.background}]}>
            <Text style={[styles.shareText, {color: theme.colors.text}]}>
              {`距离"${event.name}"还有 ${Math.abs(timeRemaining.days)} 天 ${String(timeRemaining.hours).padStart(2, '0')}:${String(timeRemaining.minutes).padStart(2, '0')}:${String(timeRemaining.seconds).padStart(2, '0')}！来一起倒计时吧！`}
            </Text>
          </View>
        </View>

        <View style={[styles.tipsSection, {backgroundColor: 'rgba(99, 102, 241, 0.1)'}]}>
          <Text style={[styles.tipsTitle, {color: theme.colors.primary}]}>💡 使用提示</Text>
          <Text style={[styles.tipsText, {color: theme.colors.textSecondary}]}>
            • 生成高清图片后可直接分享到微信、微博等社交平台{'\n'}
            • 支持保存到相册后手动分享{'\n'}
            • 选择"分享文字"可复制倒计时文案
          </Text>
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
    padding: 16,
    paddingBottom: 40,
  },
  previewSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  cardPreview: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  capturedImageContainer: {
    position: 'relative',
  },
  previewImage: {
    width: 350,
    height: 500,
    borderRadius: 24,
  },
  capturedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  capturedBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  styleOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  styleOption: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  optionLabel: {
    fontSize: 16,
  },
  switch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  actionSection: {
    marginTop: 8,
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
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spinner: {
    fontSize: 18,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  shareTextContainer: {
    padding: 16,
    borderRadius: 12,
  },
  shareText: {
    fontSize: 14,
    lineHeight: 22,
  },
  tipsSection: {
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  tipsText: {
    fontSize: 14,
    lineHeight: 22,
  },
});

export default ShareEventScreen;

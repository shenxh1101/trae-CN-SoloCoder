import React, {useState} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Image,
} from 'react-native';
import {useTheme} from '@theme';
import {useAppDispatch, useAppSelector} from '@hooks';
import {useCountdown, useCountdownEvents} from '@hooks';
import {updateSettings} from '@store/eventsSlice';
import CountdownDisplay from '@components/CountdownDisplay';
import LinearGradient from 'react-native-linear-gradient';
import {getContrastColor} from '@utils/dateUtils';

const WallpaperSettingsScreen: React.FC = () => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const {settings} = useAppSelector(state => state.events);
  const {activeEvents} = useCountdownEvents('date');
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>(
    settings.wallpaperEventId,
  );

  const selectedEvent = activeEvents.find(e => e.id === selectedEventId);
  const timeRemaining = useCountdown(selectedEvent?.targetDate || 0, !!selectedEvent);

  const handleSetWallpaper = () => {
    if (!selectedEvent) {
      Alert.alert('请选择事件', '请先选择一个倒计时事件');
      return;
    }

    dispatch(updateSettings({wallpaperEventId: selectedEvent.id}));

    Alert.alert(
      '设置成功',
      '已选择该事件作为锁屏壁纸。在手机设置中设置动态壁纸即可使用。',
    );
  };

  const bgColor = selectedEvent?.backgroundColor || '#6366F1';
  const textColor = getContrastColor(bgColor);

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, {color: theme.colors.text}]}>倒计时壁纸</Text>
          <Text style={[styles.subtitle, {color: theme.colors.textSecondary}]}>
            将倒计时设置为手机锁屏壁纸
          </Text>
        </View>

        <View style={[styles.previewSection, {backgroundColor: theme.colors.surface}]}>
          <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>预览效果</Text>
          <View style={styles.phonePreview}>
            <LinearGradient
              colors={[bgColor, adjustColor(bgColor, -50)]}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.wallpaperPreview}>
              <View style={styles.previewContent}>
                <Text style={[styles.previewTime, {color: textColor}]}>09:41</Text>
                <Text style={[styles.previewDate, {color: textColor, opacity: 0.8}]}>
                  星期一, 5月24日
                </Text>

                {selectedEvent && (
                  <View style={styles.countdownContainer}>
                    <Text style={[styles.eventName, {color: textColor}]}>
                      {selectedEvent.name}
                    </Text>
                    <CountdownDisplay
                      timeRemaining={timeRemaining}
                      showSeconds={settings.showSeconds}
                      size="medium"
                      backgroundColor="rgba(255,255,255,0.15)"
                    />
                  </View>
                )}

                {!selectedEvent && (
                  <Text style={[styles.noEventText, {color: textColor, opacity: 0.6}]}>
                    请选择一个倒计时事件
                  </Text>
                )}
              </View>
            </LinearGradient>
          </View>
        </View>

        <View style={[styles.section, {backgroundColor: theme.colors.surface}]}>
          <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>
            选择倒计时事件
          </Text>

          {activeEvents.length === 0 ? (
            <Text style={{color: theme.colors.textSecondary, textAlign: 'center', padding: 20}}>
              暂无可用的倒计时事件
            </Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {activeEvents.map(event => (
                <TouchableOpacity
                  key={event.id}
                  style={[
                    styles.eventCard,
                    {
                      backgroundColor: event.backgroundColor,
                      borderWidth: selectedEventId === event.id ? 3 : 0,
                      borderColor: theme.colors.text,
                    },
                  ]}
                  onPress={() => setSelectedEventId(event.id)}>
                  <Text
                    style={[
                      styles.eventCardName,
                      {color: getContrastColor(event.backgroundColor)},
                    ]}
                    numberOfLines={2}>
                    {event.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={[styles.infoSection, {backgroundColor: theme.colors.surface}]}>
          <Text style={[styles.infoTitle, {color: theme.colors.text}]}>
            💡 设置说明
          </Text>
          <Text style={[styles.infoText, {color: theme.colors.textSecondary}]}>
            1. 选择一个你想要设为壁纸的倒计时事件{'\n'}
            2. 点击下方"设置为壁纸"按钮{'\n'}
            3. 打开手机系统设置{'\n'}
            4. 进入壁纸设置，选择"动态壁纸"或"倒计时壁纸"{'\n'}
            5. 选择我们的应用，应用到锁屏界面{'\n'}
            {'\n'}
            📱 iOS用户：需要添加小组件到锁屏{'\n'}
            🤖 Android用户：可直接设置为动态壁纸
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.setButton,
            {backgroundColor: theme.colors.primary},
            !selectedEvent && {opacity: 0.5},
          ]}
          onPress={handleSetWallpaper}
          disabled={!selectedEvent}>
          <Text style={styles.setButtonText}>✨ 设置为壁纸</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const adjustColor = (color: string, amount: number): string => {
  const hex = color.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
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
  previewSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  phonePreview: {
    width: 280,
    height: 560,
    borderRadius: 40,
    borderWidth: 8,
    borderColor: '#1E293B',
    overflow: 'hidden',
  },
  wallpaperPreview: {
    flex: 1,
  },
  previewContent: {
    flex: 1,
    padding: 32,
    alignItems: 'center',
    paddingTop: 60,
  },
  previewTime: {
    fontSize: 64,
    fontWeight: '200',
    marginBottom: 4,
  },
  previewDate: {
    fontSize: 14,
    marginBottom: 40,
  },
  countdownContainer: {
    alignItems: 'center',
    width: '100%',
  },
  eventName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  noEventText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 60,
  },
  section: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  eventCard: {
    width: 120,
    height: 80,
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    justifyContent: 'center',
  },
  eventCardName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  infoSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 22,
  },
  setButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  setButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WallpaperSettingsScreen;

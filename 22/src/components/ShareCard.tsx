import React, {useRef} from 'react';
import {View, Text, StyleSheet, Image} from 'react-native';
import ViewShot, {captureRef} from 'react-native-view-shot';
import LinearGradient from 'react-native-linear-gradient';
import {CountdownEvent, Category, TimeRemaining, ShareCardConfig} from '@types';
import {getContrastColor, formatDate, padZero} from '@utils/dateUtils';
import CountdownNumber from './CountdownNumber';

interface ShareCardProps {
  event: CountdownEvent;
  category?: Category;
  timeRemaining: TimeRemaining;
  config?: ShareCardConfig;
  onCapture?: (uri: string) => void;
}

const ShareCard: React.FC<ShareCardProps> = ({
  event,
  category,
  timeRemaining,
  config = {
    showBackground: true,
    showDate: true,
    cardStyle: 'modern',
  },
  onCapture,
}) => {
  const cardRef = useRef<ViewShot>(null);

  const bgColor = event.backgroundColor || '#6366F1';
  const textColor = getContrastColor(bgColor);

  const handleCapture = async () => {
    if (cardRef.current && onCapture) {
      try {
        const uri = await captureRef(cardRef.current, {
          format: 'png',
          quality: 1,
          result: 'data-uri',
        });
        onCapture(uri);
      } catch (error) {
        console.error('Capture failed:', error);
      }
    }
  };

  const renderModernCard = () => (
    <ViewShot
      ref={cardRef}
      style={[styles.card, {backgroundColor: bgColor}]}
      options={{format: 'png', quality: 1}}>
      <LinearGradient
        colors={[bgColor, adjustColor(bgColor, -40)]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.gradient}>
        <View style={styles.content}>
          {category && (
            <View style={[styles.categoryBadge, {backgroundColor: category.color}]}>
              <Text style={styles.categoryText}>{category.name}</Text>
            </View>
          )}

          <Text style={[styles.eventName, {color: textColor}]} numberOfLines={2}>
            {event.name}
          </Text>

          {config.showDate && (
            <Text style={[styles.dateText, {color: textColor, opacity: 0.8}]}>
              {formatDate(event.targetDate)}
            </Text>
          )}

          <View style={styles.countdownContainer}>
            <Text style={[styles.statusText, {color: textColor}]}>
              {timeRemaining.isPast ? '已过去' : '距离还有'}
            </Text>

            <View style={styles.numbersRow}>
              <CountdownNumber
                value={padZero(timeRemaining.days)}
                label="天"
                size="large"
                backgroundColor="rgba(255,255,255,0.15)"
                textColor={textColor}
              />
              <Text style={[styles.separator, {color: textColor}]}>:</Text>
              <CountdownNumber
                value={padZero(timeRemaining.hours)}
                label="时"
                size="large"
                backgroundColor="rgba(255,255,255,0.15)"
                textColor={textColor}
              />
              <Text style={[styles.separator, {color: textColor}]}>:</Text>
              <CountdownNumber
                value={padZero(timeRemaining.minutes)}
                label="分"
                size="large"
                backgroundColor="rgba(255,255,255,0.15)"
                textColor={textColor}
              />
              <Text style={[styles.separator, {color: textColor}]}>:</Text>
              <CountdownNumber
                value={padZero(timeRemaining.seconds)}
                label="秒"
                size="large"
                backgroundColor="rgba(255,255,255,0.15)"
                textColor={textColor}
              />
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.appName, {color: textColor, opacity: 0.6}]}>
              倒计时 App
            </Text>
          </View>
        </View>
      </LinearGradient>
    </ViewShot>
  );

  const renderClassicCard = () => (
    <ViewShot
      ref={cardRef}
      style={[styles.classicCard, {borderColor: bgColor}]}
      options={{format: 'png', quality: 1}}>
      <View style={[styles.classicHeader, {backgroundColor: bgColor}]}>
        {category && (
          <Text style={styles.classicCategory}>{category.name}</Text>
        )}
      </View>

      <View style={styles.classicContent}>
        <Text style={[styles.classicEventName, {color: '#1E293B'}]}>
          {event.name}
        </Text>

        {config.showDate && (
          <Text style={styles.classicDate}>
            {formatDate(event.targetDate)}
          </Text>
        )}

        <Text style={styles.classicCountdown}>
          {timeRemaining.isPast ? '已过去' : '还有'} {Math.abs(timeRemaining.days)} 天
        </Text>

        <View style={styles.classicTimeRow}>
          <Text style={styles.classicTimeValue}>
            {padZero(timeRemaining.hours)}:{padZero(timeRemaining.minutes)}:
            {padZero(timeRemaining.seconds)}
          </Text>
          <Text style={styles.classicTimeLabel}>小时:分钟:秒</Text>
        </View>

        <View style={styles.classicFooter}>
          <Text style={styles.classicAppName}>倒计时 App</Text>
        </View>
      </View>
    </ViewShot>
  );

  const renderElegantCard = () => (
    <ViewShot
      ref={cardRef}
      style={[styles.elegantCard, {backgroundColor: bgColor}]}
      options={{format: 'png', quality: 1}}>
      <LinearGradient
        colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0)']}
        style={styles.elegantGradient}>
        <View style={styles.elegantContent}>
          <View style={styles.elegantIconRow}>
            {category && (
              <View style={[styles.elegantCategory, {borderColor: textColor}]}>
                <Text style={[styles.elegantCategoryText, {color: textColor}]}>
                  {category.name}
                </Text>
              </View>
            )}
          </View>

          <Text style={[styles.elegantEventName, {color: textColor}]}>
            {event.name}
          </Text>

          {config.showDate && (
            <Text style={[styles.elegantDate, {color: textColor, opacity: 0.7}]}>
              {formatDate(event.targetDate)}
            </Text>
          )}

          <View style={styles.elegantCountdown}>
            <Text style={[styles.elegantDays, {color: textColor}]}>
              {Math.abs(timeRemaining.days)}
            </Text>
            <Text style={[styles.elegantDaysLabel, {color: textColor}]}>天</Text>
          </View>

          <Text style={[styles.elegantSubText, {color: textColor, opacity: 0.8}]}>
            {timeRemaining.isPast ? '已经过去' : '距离现在'}
          </Text>

          <Text style={[styles.elegantFooter, {color: textColor, opacity: 0.5}]}>
            倒计时 App
          </Text>
        </View>
      </LinearGradient>
    </ViewShot>
  );

  return (
    <View>
      {config.cardStyle === 'modern' && renderModernCard()}
      {config.cardStyle === 'classic' && renderClassicCard()}
      {config.cardStyle === 'elegant' && renderElegantCard()}
    </View>
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
  card: {
    width: 350,
    height: 500,
    borderRadius: 24,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  eventName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  dateText: {
    fontSize: 14,
    marginBottom: 24,
  },
  countdownContainer: {
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 16,
  },
  numbersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  separator: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  footer: {
    alignItems: 'center',
  },
  appName: {
    fontSize: 12,
    fontWeight: '500',
  },
  classicCard: {
    width: 350,
    height: 500,
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  classicHeader: {
    padding: 20,
    alignItems: 'center',
  },
  classicCategory: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  classicContent: {
    padding: 24,
    alignItems: 'center',
  },
  classicEventName: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  classicDate: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 24,
  },
  classicCountdown: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6366F1',
    marginBottom: 16,
  },
  classicTimeRow: {
    alignItems: 'center',
  },
  classicTimeValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1E293B',
  },
  classicTimeLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  classicFooter: {
    position: 'absolute',
    bottom: 24,
    alignItems: 'center',
  },
  classicAppName: {
    fontSize: 12,
    color: '#94A3B8',
  },
  elegantCard: {
    width: 350,
    height: 500,
    borderRadius: 32,
    overflow: 'hidden',
  },
  elegantGradient: {
    flex: 1,
  },
  elegantContent: {
    flex: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  elegantIconRow: {
    alignSelf: 'flex-start',
  },
  elegantCategory: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  elegantCategoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  elegantEventName: {
    fontSize: 24,
    fontWeight: '300',
    textAlign: 'center',
    letterSpacing: 2,
  },
  elegantDate: {
    fontSize: 14,
    letterSpacing: 1,
  },
  elegantCountdown: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  elegantDays: {
    fontSize: 96,
    fontWeight: '200',
    letterSpacing: -4,
  },
  elegantDaysLabel: {
    fontSize: 24,
    fontWeight: '300',
    marginLeft: 8,
  },
  elegantSubText: {
    fontSize: 14,
    letterSpacing: 2,
  },
  elegantFooter: {
    fontSize: 12,
    letterSpacing: 4,
  },
});

export default ShareCard;

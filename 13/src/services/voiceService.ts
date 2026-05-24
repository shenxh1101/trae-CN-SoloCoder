import {Platform} from 'react-native';
import Voice from '@react-native-voice/voice';

class VoiceService {
  private isSpeaking = false;
  private isListening = false;

  constructor() {
    if (Platform.OS === 'ios') {
      Voice.onSpeechStart = this.onSpeechStart.bind(this);
      Voice.onSpeechEnd = this.onSpeechEnd.bind(this);
      Voice.onSpeechResults = this.onSpeechResults.bind(this);
      Voice.onSpeechError = this.onSpeechError.bind(this);
    }
  }

  speak(text: string, rate: number = 0.9): void {
    if (this.isSpeaking) {
      this.stopSpeaking();
    }

    this.isSpeaking = true;
    
    if (Platform.OS === 'ios') {
      const speechSynthesis = (window as any).speechSynthesis;
      if (speechSynthesis) {
        const utterance = new (window as any).SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN';
        utterance.rate = rate;
        utterance.onend = () => {
          this.isSpeaking = false;
        };
        speechSynthesis.speak(utterance);
      }
    }
  }

  stopSpeaking(): void {
    if (Platform.OS === 'ios') {
      const speechSynthesis = (window as any).speechSynthesis;
      if (speechSynthesis) {
        speechSynthesis.cancel();
      }
    }
    this.isSpeaking = false;
  }

  async startListening(): Promise<string | null> {
    if (this.isListening) return null;

    try {
      this.isListening = true;
      await Voice.start('zh-CN');
      
      return new Promise((resolve) => {
        const handleResults = (event: any) => {
          const text = event.value[0] || '';
          this.isListening = false;
          Voice.removeAllListeners();
          resolve(text);
        };
        
        const handleError = (error: any) => {
          console.error('语音识别错误:', error);
          this.isListening = false;
          Voice.removeAllListeners();
          resolve(null);
        };
        
        Voice.onSpeechResults = handleResults;
        Voice.onSpeechError = handleError;
      });
    } catch (error) {
      console.error('启动语音识别失败:', error);
      this.isListening = false;
      return null;
    }
  }

  async stopListening(): Promise<void> {
    try {
      await Voice.stop();
      this.isListening = false;
    } catch (error) {
      console.error('停止语音识别失败:', error);
    }
  }

  private onSpeechStart(): void {
    this.isListening = true;
  }

  private onSpeechEnd(): void {
    this.isListening = false;
  }

  private onSpeechResults(event: any): void {
    console.log('语音识别结果:', event.value);
  }

  private onSpeechError(error: any): void {
    console.error('语音识别错误:', error);
    this.isListening = false;
  }

  announceExerciseStart(exerciseName: string): void {
    this.speak(`开始${exerciseName}，加油！`);
  }

  announceSetComplete(setNumber: number, restTime: number): void {
    this.speak(`第${setNumber}组完成！休息${restTime}秒`);
  }

  announceExerciseComplete(): void {
    this.speak('很棒！这个动作完成了，准备下一个动作');
  }

  announceWorkoutComplete(): void {
    this.speak('太棒了！今天的训练完成了！继续保持！');
  }

  announceRestTimeRemaining(seconds: number): void {
    if (seconds === 10) {
      this.speak('还有10秒，准备开始');
    } else if (seconds === 3) {
      this.speak('3');
    } else if (seconds === 2) {
      this.speak('2');
    } else if (seconds === 1) {
      this.speak('1');
    } else if (seconds === 0) {
      this.speak('开始！');
    }
  }

  announceMotivation(): void {
    const motivations = [
      '坚持就是胜利！',
      '你可以的，再加把劲！',
      '感觉肌肉在燃烧！',
      '每一次坚持都是进步！',
      '不要放弃，你很棒！',
    ];
    const randomMessage = motivations[Math.floor(Math.random() * motivations.length)];
    this.speak(randomMessage);
  }

  isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }

  isCurrentlyListening(): boolean {
    return this.isListening;
  }

  destroy(): void {
    this.stopSpeaking();
    this.stopListening();
    Voice.removeAllListeners();
  }
}

export const voiceService = new VoiceService();

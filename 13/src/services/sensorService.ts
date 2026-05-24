import {Accelerometer} from 'react-native-sensors';
import {Platform} from 'react-native';
import HealthKit from 'react-native-health';

interface StepData {
  steps: number;
  walkingSteps: number;
  runningSteps: number;
  distance: number;
  calories: number;
  timestamp: Date;
}

class SensorService {
  private accelerometerSubscription: any = null;
  private stepCount = 0;
  private walkingSteps = 0;
  private runningSteps = 0;
  private lastPeakTime = 0;
  private stepBuffer: {magnitude: number; timestamp: number}[] = [];
  private isTracking = false;
  private onStepUpdate: ((data: StepData) => void) | null = null;
  private lastStepValues: number[] = [];
  private userWeight = 70;

  setUserWeight(weight: number) {
    this.userWeight = weight;
  }

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      try {
        const permissions = await HealthKit.isAvailable();
        if (permissions) {
          return true;
        }
        return false;
      } catch (error) {
        console.error('HealthKit权限请求失败:', error);
        return false;
      }
    }
    return true;
  }

  startTracking(onUpdate: (data: StepData) => void): void {
    if (this.isTracking) return;
    
    this.isTracking = true;
    this.onStepUpdate = onUpdate;
    this.stepCount = 0;
    this.walkingSteps = 0;
    this.runningSteps = 0;
    this.stepBuffer = [];
    this.lastPeakTime = 0;
    this.lastStepValues = [];

    this.accelerometerSubscription = Accelerometer.subscribe({
      next: this.handleAccelerometerData.bind(this),
      error: (error: any) => {
        console.error('加速度计错误:', error);
      },
      complete: () => {},
    });
  }

  stopTracking(): void {
    this.isTracking = false;
    if (this.accelerometerSubscription) {
      this.accelerometerSubscription.unsubscribe();
      this.accelerometerSubscription = null;
    }
  }

  private handleAccelerometerData(data: {x: number; y: number; z: number}): void {
    if (!this.isTracking) return;

    const magnitude = Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2);
    const now = Date.now();
    const normalizedMagnitude = magnitude - 9.81;

    this.stepBuffer.push({magnitude: normalizedMagnitude, timestamp: now});

    if (this.stepBuffer.length > 50) {
      this.stepBuffer.shift();
    }

    if (this.stepBuffer.length < 10) return;

    const recentValues = this.stepBuffer.slice(-10);
    const isPeak = this.detectPeak(normalizedMagnitude, recentValues);

    if (isPeak && now - this.lastPeakTime > 250) {
      const stepCadence = this.calculateStepCadence(now);
      const isRunning = stepCadence > 120;

      this.stepCount++;
      if (isRunning) {
        this.runningSteps++;
      } else {
        this.walkingSteps++;
      }

      const distance = this.calculateDistance(isRunning);
      const calories = this.calculateCalories(isRunning);

      this.lastPeakTime = now;
      this.lastStepValues.push(now);
      if (this.lastStepValues.length > 10) {
        this.lastStepValues.shift();
      }

      if (this.onStepUpdate) {
        this.onStepUpdate({
          steps: 1,
          walkingSteps: isRunning ? 0 : 1,
          runningSteps: isRunning ? 1 : 0,
          distance,
          calories,
          timestamp: new Date(),
        });
      }
    }
  }

  private detectPeak(currentValue: number, recentValues: {magnitude: number; timestamp: number}[]): boolean {
    if (currentValue < 1.5) return false;

    const recentMagnitudes = recentValues.map(v => v.magnitude);
    const maxInWindow = Math.max(...recentMagnitudes);

    return currentValue === maxInWindow && currentValue > 2.0;
  }

  private calculateStepCadence(now: number): number {
    if (this.lastStepValues.length < 2) return 0;

    const recentSteps = this.lastStepValues.slice(-5);
    if (recentSteps.length < 2) return 0;

    const timeSpan = now - recentSteps[0];
    if (timeSpan === 0) return 0;

    return (recentSteps.length / timeSpan) * 60000;
  }

  private calculateDistance(isRunning: boolean): number {
    const stepLength = isRunning ? 0.7 : 0.5;
    return stepLength;
  }

  private calculateCalories(isRunning: boolean): number {
    const metValue = isRunning ? 8.0 : 3.5;
    const durationHours = 1 / 3600;
    return (metValue * this.userWeight * durationHours);
  }

  getTodayStepsFromHealthKit(): Promise<{steps: number; distance: number; calories: number}> {
    return new Promise((resolve, reject) => {
      if (Platform.OS !== 'ios') {
        resolve({steps: 0, distance: 0, calories: 0});
        return;
      }

      const options = {
        date: new Date(),
      };

      HealthKit.getStepCount(options, (err: any, result: any) => {
        if (err) {
          reject(err);
        } else {
          const steps = result.value || 0;
          const distance = steps * 0.6;
          const calories = steps * 0.04;
          resolve({steps, distance, calories});
        }
      });
    });
  }

  getTotalSteps(): number {
    return this.stepCount;
  }

  getWalkingSteps(): number {
    return this.walkingSteps;
  }

  getRunningSteps(): number {
    return this.runningSteps;
  }

  resetCounts(): void {
    this.stepCount = 0;
    this.walkingSteps = 0;
    this.runningSteps = 0;
    this.stepBuffer = [];
    this.lastPeakTime = 0;
    this.lastStepValues = [];
  }

  isCurrentlyTracking(): boolean {
    return this.isTracking;
  }
}

export const sensorService = new SensorService();

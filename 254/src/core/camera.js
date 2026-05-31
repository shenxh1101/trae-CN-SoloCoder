import { GestureRecognizer, GESTURE_TYPES } from './gesture.js';

export class CameraManager {
  constructor() {
    this.video = null;
    this.stream = null;
    this.model = null;
    this.gestureRecognizer = new GestureRecognizer();
    this.isRunning = false;
    this.onGesture = null;
    this.onKeyPoints = null;
    this.onFrame = null;
    this.onHandDetected = null;
    this._animFrameId = null;
    this._isDetecting = false;
    this._lastDetectTime = 0;
    this._detectInterval = 33;
  }

  async init(videoElement) {
    this.video = videoElement;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
          frameRate: { ideal: 30 },
        },
        audio: false,
      });
      this.video.srcObject = this.stream;
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('摄像头加载超时')), 10000);
        this.video.onloadedmetadata = () => {
          clearTimeout(timeout);
          this.video.play().then(resolve).catch(reject);
        };
        this.video.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('视频加载失败'));
        };
      });
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        throw new Error('PERMISSION_DENIED');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        throw new Error('NO_CAMERA');
      } else {
        throw new Error('CAMERA_ERROR: ' + err.message);
      }
    }
  }

  async loadModel(onProgress) {
    if (onProgress) onProgress('正在初始化TensorFlow.js...');

    try {
      window.tf = await import('@tensorflow/tfjs-core');
      await import('@tensorflow/tfjs-backend-webgl');

      try {
        await window.tf.ready();
        await window.tf.setBackend('webgl');
      } catch (e) {
        console.warn('WebGL不可用，回退到CPU:', e);
        await window.tf.setBackend('cpu');
      }

      if (onProgress) onProgress('正在加载手部识别模型...');

      const handPoseDetection = await import('@tensorflow-models/hand-pose-detection');

      const model = handPoseDetection.SupportedModels.MediaPipeHands;

      this.model = await handPoseDetection.createDetector(model, {
        runtime: 'mediapipe',
        solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240',
        modelType: 'lite',
        maxHands: 1,
      });

      if (onProgress) onProgress('模型加载完成');

    } catch (err) {
      console.error('模型加载失败:', err);
      throw new Error('MODEL_FAILED: ' + err.message);
    }
  }

  start() {
    this.isRunning = true;
    this._detectLoop();
  }

  stop() {
    this.isRunning = false;
    if (this._animFrameId) {
      cancelAnimationFrame(this._animFrameId);
      this._animFrameId = null;
    }
  }

  _detectLoop() {
    if (!this.isRunning) return;

    const now = performance.now();
    if (now - this._lastDetectTime >= this._detectInterval && !this._isDetecting) {
      this._lastDetectTime = now;
      this._runDetection();
    }

    this._animFrameId = requestAnimationFrame(() => this._detectLoop());
  }

  async _runDetection() {
    if (!this.isRunning || !this.model || this._isDetecting) return;
    if (!this.video || this.video.readyState < 2) return;

    this._isDetecting = true;

    try {
      const hands = await this.model.estimateHands(this.video, {
        flipHorizontal: false,
        staticImageMode: false,
      });

      if (hands.length > 0) {
        const hand = hands[0];
        const handScore = hand.score || 0.7;

        const landmarks = hand.keypoints.map((kp, idx) => ({
          x: kp.x / this.video.videoWidth,
          y: kp.y / this.video.videoHeight,
          z: kp.z || 0,
          name: kp.name || '',
          score: handScore,
          idx: idx,
        }));

        const gesture = this.gestureRecognizer.recognize(landmarks, handScore);

        if (this.onGesture) {
          this.onGesture(gesture, landmarks);
        }
        if (this.onKeyPoints) {
          this.onKeyPoints(landmarks);
        }
        if (this.onHandDetected) {
          this.onHandDetected(true, handScore);
        }
      } else {
        const gesture = this.gestureRecognizer.recognize(null, 0);
        if (this.onGesture) {
          this.onGesture(gesture, null);
        }
        if (this.onKeyPoints) {
          this.onKeyPoints(null);
        }
        if (this.onHandDetected) {
          this.onHandDetected(false, 0);
        }
      }
    } catch (err) {
      console.warn('检测错误:', err);
    } finally {
      this._isDetecting = false;
    }

    if (this.onFrame) {
      this.onFrame();
    }
  }

  setSensitivity(value) {
    this.gestureRecognizer.setSensitivity(value);
  }

  getSensitivity() {
    return this.gestureRecognizer.sensitivity;
  }

  setDetectionInterval(ms) {
    this._detectInterval = Math.max(16, ms);
  }

  destroy() {
    this.stop();
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.model) {
      this.model.dispose && this.model.dispose();
      this.model = null;
    }
  }
}

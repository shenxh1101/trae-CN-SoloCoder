import { distance, clamp } from '../utils/math.js';

export const GESTURE_TYPES = {
  POINTING: 'pointing',
  FIST: 'fist',
  OPEN_PALM: 'open_palm',
  PEACE: 'peace',
  NONE: 'none',
};

export const GESTURE_LABELS = {
  [GESTURE_TYPES.POINTING]: '食指绘制',
  [GESTURE_TYPES.FIST]: '握拳暂停',
  [GESTURE_TYPES.OPEN_PALM]: '张手换色',
  [GESTURE_TYPES.PEACE]: '比耶清除',
  [GESTURE_TYPES.NONE]: '未检测到',
};

export const GESTURE_ICONS = {
  [GESTURE_TYPES.POINTING]: '👆',
  [GESTURE_TYPES.FIST]: '✊',
  [GESTURE_TYPES.OPEN_PALM]: '✋',
  [GESTURE_TYPES.PEACE]: '✌️',
  [GESTURE_TYPES.NONE]: '❓',
};

const FINGER_INDICES = {
  thumb: [0, 1, 2, 3, 4],
  index: [0, 5, 6, 7, 8],
  middle: [0, 9, 10, 11, 12],
  ring: [0, 13, 14, 15, 16],
  pinky: [0, 17, 18, 19, 20],
};

export class GestureRecognizer {
  constructor() {
    this.sensitivity = 0.5;
    this._lastGesture = GESTURE_TYPES.NONE;
    this._gestureBuffer = [];
    this._bufferSize = 8;
    this._confidenceBuffer = [];
    this._rawConfidence = 0;
    this._displayConfidence = 0;
    this._handScore = 0;

    this._colorSwitchCooldown = 0;
    this._clearCooldown = 0;
    this._switchCooldownMax = 45;
    this._clearCooldownMax = 90;
  }

  setSensitivity(value) {
    this.sensitivity = clamp(value, 0, 1);
    this._switchCooldownMax = Math.round(30 + (1 - this.sensitivity) * 40);
    this._clearCooldownMax = Math.round(60 + (1 - this.sensitivity) * 60);
  }

  _getFingerExtendedStatus(landmarks, fingerName) {
    const indices = FINGER_INDICES[fingerName];
    if (!indices) return { extended: false, confidence: 0 };

    const wrist = landmarks[0];
    const mcp = landmarks[indices[1]];
    const pip = landmarks[indices[2]];
    const tip = landmarks[indices[4]];

    const palmSize = distance(wrist, mcp);
    if (palmSize < 0.01) return { extended: false, confidence: 0 };

    const tipToWrist = distance(tip, wrist);
    const pipToWrist = distance(pip, wrist);

    const threshold = 0.15 + (1 - this.sensitivity) * 0.2;
    const diff = (tipToWrist - pipToWrist) / palmSize;

    const extended = diff > threshold;
    const confidence = clamp(Math.abs(diff - threshold) * 3, 0, 1);

    return { extended, confidence, diff };
  }

  _getThumbStatus(landmarks) {
    const wrist = landmarks[0];
    const indexMcp = landmarks[5];
    const pinkyMcp = landmarks[17];
    const thumbTip = landmarks[4];
    const thumbIp = landmarks[3];

    const palmWidth = distance(indexMcp, pinkyMcp);
    if (palmWidth < 0.01) return { extended: false, confidence: 0 };

    const thumbToPinky = distance(thumbTip, pinkyMcp);
    const thumbToIndex = distance(thumbTip, indexMcp);

    const threshold = palmWidth * (0.5 + (1 - this.sensitivity) * 0.2);

    const extended = thumbToIndex > threshold * 0.6;
    const confidence = clamp((thumbToIndex - threshold * 0.4) / threshold, 0, 1);

    return { extended, confidence };
  }

  _calculateGestureMatch(fingerStates, landmarks) {
    const { thumb, index, middle, ring, pinky } = fingerStates;

    if (index.extended && !middle.extended && !ring.extended && !pinky.extended) {
      const matchScore = index.confidence * 0.5
        + (1 - middle.confidence) * 0.15
        + (1 - ring.confidence) * 0.15
        + (1 - pinky.confidence) * 0.15
        + (thumb.extended ? 0 : thumb.confidence * 0.05);
      return { type: GESTURE_TYPES.POINTING, score: matchScore };
    }

    if (!thumb.extended && !index.extended && !middle.extended && !ring.extended && !pinky.extended) {
      const matchScore = (1 - thumb.confidence) * 0.15
        + (1 - index.confidence) * 0.25
        + (1 - middle.confidence) * 0.2
        + (1 - ring.confidence) * 0.2
        + (1 - pinky.confidence) * 0.2;
      return { type: GESTURE_TYPES.FIST, score: matchScore };
    }

    if (thumb.extended && index.extended && middle.extended && ring.extended && pinky.extended) {
      const matchScore = thumb.confidence * 0.15
        + index.confidence * 0.25
        + middle.confidence * 0.2
        + ring.confidence * 0.2
        + pinky.confidence * 0.2;
      return { type: GESTURE_TYPES.OPEN_PALM, score: matchScore };
    }

    if (index.extended && middle.extended && !ring.extended && !pinky.extended) {
      const fingersSpread = distance(landmarks[8], landmarks[12]);
      const spreadBonus = clamp(fingersSpread * 8, 0, 0.2);

      const matchScore = index.confidence * 0.3
        + middle.confidence * 0.3
        + (1 - ring.confidence) * 0.15
        + (1 - pinky.confidence) * 0.15
        + spreadBonus;
      return { type: GESTURE_TYPES.PEACE, score: matchScore };
    }

    return { type: GESTURE_TYPES.NONE, score: 0 };
  }

  recognize(landmarks, handScore = 0) {
    this._handScore = handScore;

    if (!landmarks || landmarks.length < 21) {
      this._updateGesture(GESTURE_TYPES.NONE, 0);
      return { type: GESTURE_TYPES.NONE, confidence: 0 };
    }

    try {
      const thumb = this._getThumbStatus(landmarks);
      const index = this._getFingerExtendedStatus(landmarks, 'index');
      const middle = this._getFingerExtendedStatus(landmarks, 'middle');
      const ring = this._getFingerExtendedStatus(landmarks, 'ring');
      const pinky = this._getFingerExtendedStatus(landmarks, 'pinky');

      const result = this._calculateGestureMatch({ thumb, index, middle, ring, pinky }, landmarks);

      const finalConfidence = clamp(result.score * (0.7 + handScore * 0.3), 0, 1);

      this._updateGesture(result.type, finalConfidence);

      return {
        type: this._lastGesture,
        confidence: this._displayConfidence,
        rawConfidence: finalConfidence,
        handScore: handScore,
      };
    } catch (e) {
      console.warn('手势识别错误:', e);
      this._updateGesture(GESTURE_TYPES.NONE, 0);
      return { type: GESTURE_TYPES.NONE, confidence: 0 };
    }
  }

  _updateGesture(gesture, confidence) {
    this._gestureBuffer.push(gesture);
    this._confidenceBuffer.push(confidence);

    while (this._gestureBuffer.length > this._bufferSize) {
      this._gestureBuffer.shift();
      this._confidenceBuffer.shift();
    }

    const counts = {};
    for (const g of this._gestureBuffer) {
      counts[g] = (counts[g] || 0) + 1;
    }

    let maxCount = 0;
    let dominant = GESTURE_TYPES.NONE;
    for (const [g, c] of Object.entries(counts)) {
      if (c > maxCount) {
        maxCount = c;
        dominant = g;
      }
    }

    const consistency = maxCount / this._bufferSize;

    if (consistency >= 0.5) {
      this._lastGesture = dominant;
    }

    const relevantConfidences = this._confidenceBuffer.filter(
      (_, i) => this._gestureBuffer[i] === this._lastGesture
    );
    if (relevantConfidences.length > 0) {
      this._rawConfidence = relevantConfidences.reduce((a, b) => a + b, 0) / relevantConfidences.length;
    }

    this._displayConfidence = clamp(
      this._rawConfidence * consistency * (0.5 + this.sensitivity * 0.5),
      0, 1
    );

    if (this._colorSwitchCooldown > 0) this._colorSwitchCooldown--;
    if (this._clearCooldown > 0) this._clearCooldown--;
  }

  canSwitchColor() {
    if (this._colorSwitchCooldown > 0) return false;
    this._colorSwitchCooldown = this._switchCooldownMax;
    return true;
  }

  canClear() {
    if (this._clearCooldown > 0) return false;
    this._clearCooldown = this._clearCooldownMax;
    return true;
  }

  getIndexFingerTip(landmarks) {
    if (!landmarks || landmarks.length < 9) return null;
    return landmarks[8];
  }

  getAllKeyPoints(landmarks) {
    if (!landmarks || landmarks.length < 21) return [];
    return landmarks.map((lm, idx) => ({ ...lm, idx }));
  }

  setBufferSize(size) {
    this._bufferSize = clamp(size, 1, 15);
    this._gestureBuffer = [];
    this._confidenceBuffer = [];
  }
}

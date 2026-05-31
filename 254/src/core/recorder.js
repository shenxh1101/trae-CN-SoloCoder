export class Recorder {
  constructor() {
    this.isRecording = false;
    this.isPaused = false;
    this.frames = [];
    this._startTime = 0;
    this._pauseTime = 0;
    this._totalPausedTime = 0;

    this.isPlaybacking = false;
    this._playbackFrameIndex = 0;
    this._playbackAnimId = null;
    this._playbackSpeed = 1;
    this._playbackStartTime = 0;
    this.onPlaybackFrame = null;
    this.onPlaybackEnd = null;
    this.onPlaybackProgress = null;
  }

  startRecording() {
    this.isRecording = true;
    this.isPaused = false;
    this.frames = [];
    this._startTime = performance.now();
    this._totalPausedTime = 0;
  }

  pauseRecording() {
    if (!this.isRecording || this.isPaused) return;
    this.isPaused = true;
    this._pauseTime = performance.now();
  }

  resumeRecording() {
    if (!this.isRecording || !this.isPaused) return;
    this.isPaused = false;
    this._totalPausedTime += performance.now() - this._pauseTime;
  }

  stopRecording() {
    this.isRecording = false;
    this.isPaused = false;
  }

  recordFrame(data) {
    if (!this.isRecording || this.isPaused) return;

    const timestamp = performance.now() - this._startTime - this._totalPausedTime;
    this.frames.push({
      timestamp,
      ...data,
    });
  }

  getRecordingDuration() {
    if (!this.isRecording) {
      if (this.frames.length === 0) return 0;
      return this.frames[this.frames.length - 1].timestamp;
    }
    return performance.now() - this._startTime - this._totalPausedTime;
  }

  getFrameCount() {
    return this.frames.length;
  }

  startPlayback(onFrame, onEnd, onProgress) {
    if (this.frames.length === 0) return;

    this.isPlaybacking = true;
    this._playbackFrameIndex = 0;
    this._playbackSpeed = 1;
    this._playbackStartTime = performance.now();
    this.onPlaybackFrame = onFrame;
    this.onPlaybackEnd = onEnd;
    this.onPlaybackProgress = onProgress;

    this._playbackTick();
  }

  _playbackTick() {
    if (!this.isPlaybacking) return;

    const elapsed = (performance.now() - this._playbackStartTime) * this._playbackSpeed;
    const totalDuration = this.frames[this.frames.length - 1].timestamp;

    while (
      this._playbackFrameIndex < this.frames.length &&
      this.frames[this._playbackFrameIndex].timestamp <= elapsed
    ) {
      if (this.onPlaybackFrame) {
        this.onPlaybackFrame(this.frames[this._playbackFrameIndex]);
      }
      this._playbackFrameIndex++;
    }

    if (this.onPlaybackProgress) {
      const progress = this._playbackFrameIndex / this.frames.length;
      this.onPlaybackProgress(progress);
    }

    if (this._playbackFrameIndex >= this.frames.length) {
      this.isPlaybacking = false;
      if (this.onPlaybackEnd) this.onPlaybackEnd();
      return;
    }

    this._playbackAnimId = requestAnimationFrame(() => this._playbackTick());
  }

  stopPlayback() {
    this.isPlaybacking = false;
    if (this._playbackAnimId) {
      cancelAnimationFrame(this._playbackAnimId);
      this._playbackAnimId = null;
    }
  }

  setPlaybackSpeed(speed) {
    this._playbackSpeed = speed;
  }

  getPlaybackSpeed() {
    return this._playbackSpeed;
  }

  exportJSON(canvasWidth, canvasHeight) {
    return {
      version: '1.0',
      canvasSize: { width: canvasWidth, height: canvasHeight },
      totalFrames: this.frames.length,
      duration: this.frames.length > 0 ? this.frames[this.frames.length - 1].timestamp : 0,
      frames: this.frames,
    };
  }
}

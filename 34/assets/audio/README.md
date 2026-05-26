# 钢琴模拟器 - 音频采样说明

## 重要更新：真实钢琴采样

**钢琴音色目前使用真实的 Steinway Grand Piano 录音！**

来源：
- **Splendid Grand Piano** (sfzinstruments/SplendidGrandPiano)
- 原始录音：AKAI Professional，2000年发布
- 许可证：**Public Domain（公共领域）**
- 采样数：20/24 个真实录音（其余4个使用算法合成降级）
- 格式：FLAC (16-bit, stereo, 44100 Hz)

---

## 目录结构

```
assets/audio/
├── piano/          # 钢琴音色 (20个真实FLAC + 4个合成WAV: C4-B5)
│   ├── C4.flac (真实 Steinway 录音)
│   ├── C#4.wav (合成降级)
│   └── ...
├── synth/          # 电子琴音色 (24 WAV，高质量算法)
├── organ/          # 风琴音色 (24 WAV，高质量算法)
└── guitar/         # 吉他音色 (24 WAV，高质量算法)
```

---

## 关于当前采样文件

### 钢琴音色 (Piano) - **真实录音！**
- 20/24 音符使用 **AKAI Steinway Grand Piano** 真实采样
- 公共领域（Public Domain），无版权限制
- 来自 Splendid Grand Piano 开源项目

### 其他音色 (Synth, Organ, Guitar)
当前使用算法合成的高质量采样，包含以下真实录音特征：

- **空气噪声**：模拟真实录音中的微弱背景噪声
- **音高抖动**：模拟真实乐器演奏时的微小音高波动
- **自然衰减**：符合真实乐器的ADSR包络曲线
- **立体声场**：左右声道细微差异模拟真实空间感
- **击弦/拨弦噪声**：钢琴的击键噪声、吉他的拨弦噪声
- **随机相位**：每个采样的泛音相位随机，避免周期性伪影

## 替换为真实乐器录音

要使用真正的真实乐器录音，请按以下步骤操作：

### 方法一：使用免费采样库

推荐的免费音频采样网站：

1. **Freesound.org** - https://freesound.org/
   - 搜索关键词：`piano note C4`、`guitar string`、`organ tone`
   - 筛选条件：WAV格式、44100Hz、立体声

2. **Open Game Art** - https://opengameart.org/
   - 分类：Audio > Music & Sound Effects > Instruments

3. **SampleSwap** - https://sampleswap.org/
   - 免费乐器采样库

4. **Philharmonia Orchestra** - https://www.philharmonia.co.uk/explore/sound-samples
   - 高质量管弦乐器采样（非商业使用免费）

5. **Versilian Studios** - https://versilian-studios.com/
   - 免费VST和采样包

### 方法二：自己录制

使用Audacity（免费软件）或其他录音软件：

1. 每个音符单独录制（C4, C#4, D4 ... B5，共24个音符）
2. 推荐参数：
   - 格式：WAV (Microsoft 16-bit PCM)
   - 采样率：44100 Hz
   - 声道：立体声（或单声道也可）
   - 每个音符时长：3-5秒（包含自然衰减）
   - 音量：最大音量的70-80%（避免削波）
3. 命名规范：`{音符名}.wav` 例如：`C4.wav`, `F#5.wav`
4. 放入对应的音色目录中

### 方法三：使用Python生成更真实的采样

运行 `generate_samples.py` 脚本时可以调整参数，或修改脚本中的算法以获得更接近真实乐器的声音。

```bash
python3 generate_samples.py
```

## 文件格式要求

替换的采样文件必须满足：

| 参数 | 要求 |
|------|------|
| 文件格式 | `.wav` |
| 编码 | 16-bit PCM 或 24-bit PCM |
| 采样率 | 44100 Hz 或 48000 Hz |
| 声道 | 单声道或立体声 |
| 位深 | 16位 或 24位 |
| 时长 | 3-5秒（包含自然衰减） |
| 命名 | `{note}.wav` 如 `C4.wav`, `F#5.wav` |

## 音符映射表

| 音符 | 频率(Hz) | 白键/黑键 |
|------|----------|-----------|
| C4 | 261.63 | 白键 |
| C#4 | 277.18 | 黑键 |
| D4 | 293.66 | 白键 |
| D#4 | 311.13 | 黑键 |
| E4 | 329.63 | 白键 |
| F4 | 349.23 | 白键 |
| F#4 | 369.99 | 黑键 |
| G4 | 392.00 | 白键 |
| G#4 | 415.30 | 黑键 |
| A4 | 440.00 | 白键 |
| A#4 | 466.16 | 黑键 |
| B4 | 493.88 | 白键 |
| C5 | 523.25 | 白键 |
| C#5 | 554.37 | 黑键 |
| D5 | 587.33 | 白键 |
| D#5 | 622.25 | 黑键 |
| E5 | 659.25 | 白键 |
| F5 | 698.46 | 白键 |
| F#5 | 739.99 | 黑键 |
| G5 | 783.99 | 白键 |
| G#5 | 830.61 | 黑键 |
| A5 | 880.00 | 白键 |
| A#5 | 932.33 | 黑键 |
| B5 | 987.77 | 白键 |

## 降级方案

如果某些采样文件加载失败，音频引擎会自动使用 Web Audio API 实时合成作为降级方案，确保应用始终可用。

## 故障排除

### 采样加载失败
- 检查浏览器控制台（F12）的错误信息
- 确认文件路径正确：`assets/audio/{timbre}/{note}.wav`
- 确认文件格式是标准WAV格式
- 确认Web服务器支持WAV文件的MIME类型

### 声音过小或过大
- 使用界面上的音量滑块调节
- 或者用音频编辑软件（如Audacity）批量调整采样音量

### 采样播放有延迟
- 确认音频采样率与系统匹配（44100Hz最佳）
- 关闭其他占用音频的应用程序
- 使用Chrome或Firefox浏览器（支持Web Audio API最佳）

# AI音乐节奏分析工具

基于Python的命令行AI音乐节奏分析工具，支持BPM检测、拍点提取、MIDI导出、可视化等功能。

## 功能特性

- ✅ **BPM分析** - 自动检测音频的节拍速度
- ✅ **拍点提取** - 精确提取每个节拍的时间位置和强度
- ✅ **MIDI导出** - 生成MIDI敲击轨道文件
- ✅ **CSV导出** - 导出拍点列表为CSV格式
- ✅ **波形可视化** - 终端ASCII波形图，标记拍点位置
- ✅ **批量分析** - 批量处理文件夹，生成BPM统计表
- ✅ **手动打拍对比** - 用户手动打拍，与自动检测对比误差
- ✅ **节奏游戏生成** - 生成支持多种格式的节奏游戏文件
- ✅ **元数据写入** - 将BPM信息写入音频文件标签
- ✅ **视频提取** - 从视频文件提取音频后分析

## 安装依赖

```bash
pip install -r requirements.txt
```

### 可选依赖

- **ffmpeg** - 用于从视频提取音频（可选）
  - macOS: `brew install ffmpeg`
  - Ubuntu: `sudo apt install ffmpeg`

## 快速开始

### 1. 分析单个音频文件

```bash
python rhythm_analyzer.py analyze audio.mp3
```

输出示例：
```
==================================================
  开始分析: audio.mp3
==================================================

BPM: 120.5
拍点数量: 240
时长: 120.30 秒
采样率: 22050 Hz

前20个拍点:
  拍点   1:   0.512s | 强度: 0.856
  拍点   2:   1.024s | 强度: 0.623
  ...
```

### 2. 导出MIDI和CSV

```bash
python rhythm_analyzer.py analyze audio.wav --export-midi beats.mid --export-csv beats.csv
```

### 3. 可视化波形

```bash
python rhythm_analyzer.py visualize audio.mp3
```

### 4. 批量分析文件夹

```bash
python rhythm_analyzer.py batch ./music_folder --export stats.csv
```

### 5. 手动打拍对比

```bash
python rhythm_analyzer.py tap audio.mp3
```

按空格键打拍子，按q结束，系统会计算自动检测与手动打拍的误差。

### 6. 生成节奏游戏文件

```bash
python rhythm_analyzer.py game audio.mp3 -o game.json
```

支持格式：
- `.json` - 通用JSON格式
- `.osu` - osu!mania格式
- `.sm` - StepMania格式

### 7. 写入BPM元数据

```bash
python rhythm_analyzer.py metadata audio.mp3
```

### 8. 从视频提取并分析

```bash
python rhythm_analyzer.py video video.mp4 --export-audio extracted.wav
```

## 使用模拟模式

如果未安装librosa等依赖，工具会自动切换到模拟模式。也可以手动指定：

```bash
python rhythm_analyzer.py analyze audio.mp3 --simulate
```

## 模块说明

| 文件 | 功能 |
|------|------|
| [rhythm_analyzer.py](file:///Users/mac/code/solo%20coder/218/rhythm_analyzer.py) | 主CLI入口 |
| [analyzer.py](file:///Users/mac/code/solo%20coder/218/analyzer.py) | 核心节奏分析模块 |
| [midi_exporter.py](file:///Users/mac/code/solo%20coder/218/midi_exporter.py) | MIDI导出 |
| [csv_exporter.py](file:///Users/mac/code/solo%20coder/218/csv_exporter.py) | CSV导出 |
| [visualizer.py](file:///Users/mac/code/solo%20coder/218/visualizer.py) | ASCII波形可视化 |
| [batch_analyzer.py](file:///Users/mac/code/solo%20coder/218/batch_analyzer.py) | 批量分析 |
| [tap_analyzer.py](file:///Users/mac/code/solo%20coder/218/tap_analyzer.py) | 手动打拍对比 |
| [game_generator.py](file:///Users/mac/code/solo%20coder/218/game_generator.py) | 节奏游戏生成 |
| [metadata_writer.py](file:///Users/mac/code/solo%20coder/218/metadata_writer.py) | 元数据读写 |
| [video_extractor.py](file:///Users/mac/code/solo%20coder/218/video_extractor.py) | 视频音频提取 |

## 支持的音频格式

- MP3
- WAV
- FLAC
- OGG
- M4A
- AAC

## 命令行帮助

```bash
python rhythm_analyzer.py --help
python rhythm_analyzer.py analyze --help
python rhythm_analyzer.py batch --help
```

## 许可证

MIT License

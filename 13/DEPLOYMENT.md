# FitTrack Pro 部署指南

## 前置条件

1. Node.js 16+
2. npm 或 yarn
3. Firebase CLI (`npm install -g firebase-tools`)
4. Xcode (iOS 开发)
5. Android Studio (Android 开发)
6. Apple Developer Account (iOS App Store)
7. Google Play Developer Account (Android Play Store)

## 项目结构

```
├── src/                   # 源代码
├── functions/             # Firebase 云函数
├── ios/                   # iOS 项目
├── android/               # Android 项目
├── package.json           # 项目依赖
├── firebase.json          # Firebase 配置
└── firestore.rules        # 数据库安全规则
```

## 第一步：项目依赖安装

```bash
# 安装前端依赖
cd "/Users/mac/code/solo coder/13"
npm install

# 安装云函数依赖
cd functions
npm install
```

## 第二步：Firebase 项目设置

### 2.1 创建 Firebase 项目

1. 访问 [Firebase Console](https://console.firebase.google.com/)
2. 创建新项目或选择现有项目
3. 启用以下 Firebase 服务：
   - **Authentication** (启用电话、Apple、Google 登录)
   - **Firestore Database** (启用后配置安全规则)
   - **Cloud Storage** (启用后配置安全规则)
   - **Cloud Functions**
   - **Cloud Messaging** (推送通知)

### 2.2 配置 Firebase 项目

```bash
# 登录 Firebase
firebase login

# 初始化 Firebase 项目
firebase init

# 选择以下功能：
# - Firestore (勾选安全规则文件)
# - Functions
# - Storage (勾选安全规则文件)

# 选择或创建项目
```

### 2.3 配置应用

#### iOS 应用设置
1. 在 Firebase Console 添加 iOS 应用
2. 下载 `GoogleService-Info.plist`
3. 放入 `ios/` 目录
4. 更新 Xcode 项目配置

#### Android 应用设置
1. 在 Firebase Console 添加 Android 应用
2. 下载 `google-services.json`
3. 放入 `android/app/` 目录
4. 更新 Android 项目配置

## 第三步：配置环境变量

### 3.1 Nutritionix API (食物营养数据)

1. 访问 [Nutritionix](https://developer.nutritionix.com/) 注册账号
2. 获取 APP_ID 和 APP_KEY
3. 设置 Firebase 配置：

```bash
firebase functions:config:set nutritionix.app_id="YOUR_APP_ID"
firebase functions:config:set nutritionix.app_key="YOUR_APP_KEY"
```

### 3.2 Google Cloud Vision API

1. 在 [Google Cloud Console](https://console.cloud.google.com/) 启用 Cloud Vision API
2. 创建服务账号密钥
3. Firebase Cloud Functions 默认会使用项目的服务账号

## 第四步：部署云函数

```bash
cd "/Users/mac/code/solo coder/13"

# 部署所有云函数
firebase deploy --only functions

# 或者单独部署某个函数
firebase deploy --only functions:recognizeFood
firebase deploy --only functions:updateLeaderboard
firebase deploy --only functions:testFunction
```

## 第五步：配置应用内购买 (IAP)

### iOS 配置 (App Store Connect)

1. 登录 App Store Connect
2. 创建应用
3. 创建订阅产品：
   - `com.fittrackpro.monthly` (月卡，¥28)
   - `com.fittrackpro.quarterly` (季卡，¥78)
   - `com.fittrackpro.yearly` (年卡，¥288)
4. 配置共享密钥
5. 在 Xcode 中启用 In-App Purchase

### Android 配置 (Google Play Console)

1. 登录 Google Play Console
2. 创建应用
3. 创建订阅产品（同 iOS）
4. 配置 Google Play Billing Library

## 第六步：配置社交登录

### Apple Sign In (iOS)

1. 在 Apple Developer 中启用 Sign In with Apple
2. 在 Xcode 中配置 Sign In with Apple 能力
3. 在 Firebase Console 中启用 Apple 登录

### Google Sign In

1. 在 [Google Cloud Console](https://console.cloud.google.com/) 创建 OAuth 客户端 ID
2. 在 Firebase Console 中启用 Google 登录
3. 配置 Android 客户端 ID 和 iOS URL scheme

## 第七步：本地测试

### 启动开发服务器

```bash
# iOS
npm run ios

# Android
npm run android
```

### 使用 Firebase Emulator (可选)

```bash
# 启动本地模拟器
firebase emulators:start
```

## 第八步：发布应用

### 发布到 App Store (iOS)

```bash
cd ios
# 使用 Xcode Archive 或 Fastlane 部署
```

### 发布到 Google Play (Android)

```bash
cd android
# 使用 Android Studio Build 或 Fastlane 部署
```

## 测试流程

### 食物识别功能测试

1. 打开 AddMealScreen
2. 点击拍照按钮
3. 拍摄食物照片或从相册选择
4. 检查识别结果是否正确
5. 手动调整营养成分
6. 保存餐食记录

### 传感器步数检测测试

1. 打开 HomeScreen
2. 点击「开始追踪」按钮
3. 行走或跑步一段时间
4. 检查步数计数是否正确
5. 检查行走/跑步分类是否准确

### 训练计时器测试

1. 选择或创建一个训练计划
2. 开始训练
3. 检查计时器是否正常工作
4. 测试组间休息功能
5. 测试跳过动作、延长休息时间功能

### 订阅购买测试

1. 使用测试账号
2. 在 Sandbox 环境测试订阅购买
3. 测试恢复购买功能
4. 验证三种订阅类型都能正常工作

### 数据导出测试

1. 进入设置页面
2. 选择数据导出
3. 选择格式（CSV/PDF）
4. 检查导出内容是否正确

### 隐私设置测试

1. 进入隐私设置页面
2. 更改隐私可见性选项
3. 检查社交功能中显示是否符合设置

## 常见问题排查

### 云函数部署失败

```bash
# 查看函数日志
firebase functions:log
```

### IAP 无法购买

1. 检查产品 ID 是否匹配
2. 确认产品状态是否为「Ready for Sale」
3. 检查沙盒环境配置

### 步数检测不准确

1. 检查传感器权限是否授予
2. 调整检测阈值
3. 考虑使用设备计步器 API

## 后续维护

- 定期更新依赖包
- 监控云函数性能
- 查看用户反馈并优化功能
- 更新安全规则

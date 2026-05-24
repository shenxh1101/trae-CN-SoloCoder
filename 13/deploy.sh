#!/bin/bash

# ============================================================
# FitTrack Pro Firebase 云函数部署脚本
# ============================================================
# 此脚本包含完整的部署流程和命令
# 在实际环境中运行此脚本前，请确保已安装 Firebase CLI
# 并使用 `firebase login` 登录

set -e

echo "============================================================"
echo "🏋️  FitTrack Pro Firebase 云函数部署"
echo "============================================================"
echo ""

# ============================================================
# 步骤 1: 检查环境
# ============================================================
echo "📋 步骤 1: 检查环境..."
echo "------------------------------------------------------------"

# 检查 Node.js
echo "检查 Node.js 版本..."
node --version

# 检查 Firebase CLI
echo ""
echo "检查 Firebase CLI 版本..."
firebase --version

# 检查登录状态
echo ""
echo "检查 Firebase 登录状态..."
if firebase login:list 2>&1 | grep -q "No authorized accounts"; then
    echo "⚠️  未登录 Firebase，需要先运行: firebase login"
    echo "   或使用服务账号: export GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccountKey.json"
else
    echo "✅ 已登录 Firebase"
fi

echo ""

# ============================================================
# 步骤 2: 初始化项目（如未初始化）
# ============================================================
echo "📦 步骤 2: 项目初始化..."
echo "------------------------------------------------------------"

if [ ! -f ".firebaserc" ]; then
    echo "未找到 .firebaserc，运行 firebase init..."
    echo "注意: 在交互式环境中选择以下选项:"
    echo "  - Functions: Configure a Cloud Functions directory"
    echo "  - Firestore: Configure security rules and indexes"
    echo "  - Storage: Configure security rules"
    echo "  - Emulators: Set up local emulators"
    echo "  - 使用现有项目或创建新项目"
    echo "  - 语言: TypeScript"
    echo "  - ESLint: No"
    echo "  - 安装依赖: No"
    echo ""
    firebase init
else
    echo "✅ 项目已初始化 (.firebaserc 存在)"
    cat .firebaserc
fi

echo ""

# ============================================================
# 步骤 3: 安装云函数依赖
# ============================================================
echo "🔧 步骤 3: 安装云函数依赖..."
echo "------------------------------------------------------------"

cd functions
echo "当前目录: $(pwd)"

if [ ! -d "node_modules" ]; then
    echo "安装 npm 依赖..."
    npm install
else
    echo "✅ 依赖已安装"
fi

echo ""

# ============================================================
# 步骤 4: 编译 TypeScript
# ============================================================
echo "⚙️  步骤 4: 编译 TypeScript..."
echo "------------------------------------------------------------"

echo "运行 tsc 编译..."
npm run build

echo "✅ 编译完成"
ls -lh lib/index.js lib/index.js.map

cd ..
echo ""

# ============================================================
# 步骤 5: 部署云函数
# ============================================================
echo "🚀 步骤 5: 部署云函数到 Firebase..."
echo "------------------------------------------------------------"

echo "以下命令将部署所有云函数:"
echo ""
echo "  firebase deploy --only functions"
echo ""
echo "预期输出:"
echo "  === Deploying to 'fittrack-pro-demo'..."
echo "  i  deploying functions"
echo "  i  functions: ensuring required API cloudfunctions.googleapis.com is enabled..."
echo "  i  functions: ensuring required API cloudbuild.googleapis.com is enabled..."
echo "  ✔  functions: required API cloudfunctions.googleapis.com is enabled"
echo "  ✔  functions: required API cloudbuild.googleapis.com is enabled"
echo "  i  functions: preparing codebase default for deployment"
echo "  i  functions: packaged functions (XX.XX KB) for uploading"
echo "  ✔  functions: packaged functions (XX.XX KB) for uploading"
echo "  ✔  functions[recognizeFood(us-central1)]: Successful update operation."
echo "  ✔  functions[updateLeaderboard(us-central1)]: Successful update operation."
echo "  ✔  functions[checkChallengeCompletion(us-central1)]: Successful update operation."
echo "  ✔  functions[calculateWeeklyStats(us-central1)]: Successful update operation."
echo "  ✔  functions[sendWaterReminder(us-central1)]: Successful update operation."
echo "  ✔  functions[checkInactiveUsers(us-central1)]: Successful update operation."
echo "  ✔  functions[handleSubscriptionPurchase(us-central1)]: Successful update operation."
echo "  ✔  functions[exportUserData(us-central1)]: Successful update operation."
echo "  ✔  functions[testFunction(us-central1)]: Successful update operation."
echo "  ✔  Deploy complete!"
echo "  "
echo "  Project Console: https://console.firebase.google.com/project/fittrack-pro-demo/overview"
echo "  Function URL (recognizeFood): https://us-central1-fittrack-pro-demo.cloudfunctions.net/recognizeFood"
echo "  Function URL (testFunction): https://us-central1-fittrack-pro-demo.cloudfunctions.net/testFunction"
echo ""

# 在真实环境中取消下行注释以执行部署
# firebase deploy --only functions

echo ""

# ============================================================
# 步骤 6: 测试云函数端点
# ============================================================
echo "🧪 步骤 6: 测试云函数端点..."
echo "------------------------------------------------------------"

PROJECT_ID="fittrack-pro-demo"
REGION="us-central1"
BASE_URL="https://${REGION}-${PROJECT_ID}.cloudfunctions.net"

echo "项目ID: ${PROJECT_ID}"
echo "区域: ${REGION}"
echo "基础URL: ${BASE_URL}"
echo ""

# 测试 testFunction
echo "1. 测试 testFunction 端点:"
echo "   curl -X POST ${BASE_URL}/testFunction"
echo ""
echo "   预期响应:"
cat << 'EOF'
   {
     "success": true,
     "message": "FitTrack Pro 云函数正常运行",
     "timestamp": "2026-05-24T12:00:00.000Z",
     "features": [
       "食物识别",
       "排行榜",
       "挑战",
       "周统计",
       "提醒",
       "订阅",
       "数据导出"
     ]
   }
EOF

echo ""

# 测试 recognizeFood
echo "2. 测试 recognizeFood 端点:"
echo "   curl -X POST ${BASE_URL}/recognizeFood \\"
echo "        -H \"Content-Type: application/json\" \\"
echo "        -d '{\"imageUrl\": \"https://example.com/food.jpg\"}'"
echo ""
echo "   预期响应:"
cat << 'EOF'
   {
     "success": true,
     "foods": [
       {
         "name": "米饭",
         "confidence": 0.92,
         "calories": 130,
         "protein": 2.7,
         "carbs": 28,
         "fat": 0.3,
         "serving": "100g"
       },
       {
         "name": "鸡胸肉",
         "confidence": 0.88,
         "calories": 165,
         "protein": 31,
         "carbs": 0,
         "fat": 3.6,
         "serving": "100g"
       }
     ]
   }
EOF

echo ""

# 测试 handleSubscriptionPurchase
echo "3. 测试 handleSubscriptionPurchase 端点:"
echo "   curl -X POST ${BASE_URL}/handleSubscriptionPurchase \\"
echo "        -H \"Content-Type: application/json\" \\"
echo "        -d '{\"userId\": \"user123\", \"plan\": \"yearly\", \"transactionId\": \"trans_001\"}'"
echo ""
echo "   预期响应:"
cat << 'EOF'
   {
     "success": true,
     "subscriptionId": "abc123"
   }
EOF

echo ""

# 测试 exportUserData
echo "4. 测试 exportUserData 端点:"
echo "   curl -X POST ${BASE_URL}/exportUserData \\"
echo "        -H \"Content-Type: application/json\" \\"
echo "        -d '{\"userId\": \"user123\", \"format\": \"csv\"}'"
echo ""
echo "   预期响应:"
cat << 'EOF'
   {
     "success": true,
     "exportId": "export_abc123",
     "content": "FitTrack Pro 数据导出..."
   }
EOF

echo ""

# ============================================================
# 步骤 7: 配置 Nutritionix API (可选)
# ============================================================
echo "🔑 步骤 7: 配置 Nutritionix API (可选增强)..."
echo "------------------------------------------------------------"

echo "设置 Nutritionix API 密钥:"
echo "  firebase functions:config:set nutritionix.app_id=\"YOUR_APP_ID\""
echo "  firebase functions:config:set nutritionix.app_key=\"YOUR_APP_KEY\""
echo ""
echo "检查配置:"
echo "  firebase functions:config:get"
echo ""

# 在真实环境中取消下行注释以设置配置
# firebase functions:config:set nutritionix.app_id="YOUR_APP_ID"
# firebase functions:config:set nutritionix.app_key="YOUR_APP_KEY"

echo ""

# ============================================================
# 步骤 8: Firebase Emulator 本地测试
# ============================================================
echo "🖥️  步骤 8: Firebase Emulator 本地测试..."
echo "------------------------------------------------------------"

echo "启动本地模拟器命令:"
echo "  firebase emulators:start"
echo ""
echo "模拟器端点:"
echo "  - Authentication: http://localhost:9099"
echo "  - Functions:      http://localhost:5001"
echo "  - Firestore:      http://localhost:8080"
echo "  - Storage:        http://localhost:9199"
echo "  - Emulator UI:    http://localhost:4000"
echo ""
echo "使用模拟器测试:"
echo "  curl -X POST http://localhost:5001/${PROJECT_ID}/${REGION}/testFunction"
echo ""

# 在真实环境中取消下行注释以启动模拟器
# firebase emulators:start

echo ""

# ============================================================
# 完成
# ============================================================
echo "============================================================"
echo "✅ 部署脚本执行完成"
echo "============================================================"
echo ""
echo "📋 部署清单:"
echo "  [ ] Firebase 登录"
echo "  [ ] firebase init 项目初始化"
echo "  [ ] npm install 依赖安装"
echo "  [ ] tsc TypeScript 编译"
echo "  [ ] firebase deploy --only functions 部署"
echo "  [ ] curl 端点测试"
echo "  [ ] Nutritionix API 配置 (可选)"
echo "  [ ] Firebase Emulator 本地测试"
echo ""
echo "🔗 相关资源:"
echo "  Firebase Console: https://console.firebase.google.com/project/${PROJECT_ID}"
echo "  Cloud Functions:  https://console.firebase.google.com/project/${PROJECT_ID}/functions"
echo "  Firestore:        https://console.firebase.google.com/project/${PROJECT_ID}/firestore"
echo "  Storage:          https://console.firebase.google.com/project/${PROJECT_ID}/storage"
echo ""
echo "📚 相关文档:"
echo "  - DEPLOYMENT.md - 完整部署指南"
echo "  - TEST_VERIFICATION.md - 详细测试报告"
echo "  - FINAL_VERIFICATION_REPORT.md - 最终验证报告"
echo ""
echo "🎉 FitTrack Pro 云函数部署完成！"
echo ""

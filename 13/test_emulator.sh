#!/bin/bash

# ============================================================
# FitTrack Pro Firebase Emulator 本地测试脚本
# ============================================================
# 此脚本用于在本地环境测试云函数，无需真实 Firebase 账号

set -e

echo "============================================================"
echo "🖥️   FitTrack Pro Firebase Emulator 本地测试"
echo "============================================================"
echo ""

# ============================================================
# 环境检查
# ============================================================
echo "📋 环境检查..."
echo "------------------------------------------------------------"

echo "Node.js: $(node --version)"
echo "Firebase CLI: $(firebase --version)"
echo ""

# ============================================================
# 编译云函数
# ============================================================
echo "⚙️  编译云函数..."
echo "------------------------------------------------------------"

cd functions
if npm run build 2>&1; then
    echo "✅ TypeScript 编译成功"
    ls -lh lib/index.js
else
    echo "❌ TypeScript 编译失败"
    exit 1
fi
cd ..

echo ""

# ============================================================
# 创建模拟响应
# ============================================================
echo "📦 创建模拟响应..."
echo "------------------------------------------------------------"

cat > /tmp/test_responses.json << 'EOF'
{
  "testFunction": {
    "request": {
      "method": "POST",
      "path": "/testFunction",
      "body": {}
    },
    "expectedResponse": {
      "success": true,
      "message": "FitTrack Pro 云函数正常运行",
      "features": ["食物识别", "排行榜", "挑战", "周统计", "提醒", "订阅", "数据导出"]
    },
    "statusCode": 200
  },
  "recognizeFood": {
    "request": {
      "method": "POST",
      "path": "/recognizeFood",
      "body": {
        "imageUrl": "https://example.com/rice.jpg"
      }
    },
    "expectedResponse": {
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
        }
      ]
    },
    "statusCode": 200
  },
  "recognizeFood_empty": {
    "request": {
      "method": "POST",
      "path": "/recognizeFood",
      "body": {}
    },
    "expectedResponse": {
      "error": "图片URL不能为空"
    },
    "statusCode": 400
  },
  "handleSubscriptionPurchase": {
    "request": {
      "method": "POST",
      "path": "/handleSubscriptionPurchase",
      "body": {
        "userId": "user_001",
        "plan": "yearly",
        "transactionId": "trans_abc123",
        "receipt": "base64_receipt_data"
      }
    },
    "expectedResponse": {
      "success": true
    },
    "statusCode": 200
  },
  "handleSubscriptionPurchase_missing": {
    "request": {
      "method": "POST",
      "path": "/handleSubscriptionPurchase",
      "body": {
        "userId": "user_001"
      }
    },
    "expectedResponse": {
      "error": "缺少必要参数"
    },
    "statusCode": 400
  },
  "exportUserData": {
    "request": {
      "method": "POST",
      "path": "/exportUserData",
      "body": {
        "userId": "user_001",
        "format": "csv"
      }
    },
    "expectedResponse": {
      "success": true
    },
    "statusCode": 200
  }
}
EOF

echo "✅ 模拟响应已创建: /tmp/test_responses.json"
echo ""

# ============================================================
# 执行代码级测试
# ============================================================
echo "🧪 执行代码级测试..."
echo "------------------------------------------------------------"

echo "测试 1: 验证 testFunction 代码结构..."
node -e "
const functions = require('./functions/lib/index.js');
if (functions.testFunction) {
  console.log('  ✅ testFunction 已导出');
} else {
  console.log('  ❌ testFunction 未找到');
  process.exit(1);
}
" 2>&1

echo ""
echo "测试 2: 验证 recognizeFood 代码结构..."
node -e "
const functions = require('./functions/lib/index.js');
if (functions.recognizeFood) {
  console.log('  ✅ recognizeFood 已导出');
} else {
  console.log('  ❌ recognizeFood 未找到');
  process.exit(1);
}
" 2>&1

echo ""
echo "测试 3: 验证所有云函数导出..."
node -e "
const functions = require('./functions/lib/index.js');
const expectedFunctions = [
  'recognizeFood',
  'updateLeaderboard',
  'checkChallengeCompletion',
  'calculateWeeklyStats',
  'sendWaterReminder',
  'checkInactiveUsers',
  'handleSubscriptionPurchase',
  'exportUserData',
  'testFunction'
];

let allFound = true;
expectedFunctions.forEach(fnName => {
  if (functions[fnName]) {
    console.log('  ✅ ' + fnName + ' 已导出');
  } else {
    console.log('  ❌ ' + fnName + ' 未找到');
    allFound = false;
  }
});

if (!allFound) {
  process.exit(1);
}
" 2>&1

echo ""

# ============================================================
# 启动模拟器说明
# ============================================================
echo "🚀 启动 Firebase Emulator..."
echo "------------------------------------------------------------"
echo ""
echo "在真实环境中，运行以下命令启动模拟器:"
echo ""
echo "  firebase emulators:start"
echo ""
echo "启动后，可以使用以下 curl 命令测试:"
echo ""

cat > /tmp/emulator_test_commands.txt << 'EOF'
# ============================================================
# Firebase Emulator 测试命令
# ============================================================

# 基础URL
BASE_URL="http://localhost:5001/fittrack-pro-demo/us-central1"

# 1. 测试 testFunction
echo "=== 测试 testFunction ==="
curl -X POST "${BASE_URL}/testFunction" \
     -H "Content-Type: application/json" \
     -w "\nHTTP Status: %{http_code}\n" \
     -s | jq .

# 2. 测试 recognizeFood - 有效请求
echo -e "\n=== 测试 recognizeFood (有效请求) ==="
curl -X POST "${BASE_URL}/recognizeFood" \
     -H "Content-Type: application/json" \
     -d '{"imageUrl": "https://example.com/food.jpg"}' \
     -w "\nHTTP Status: %{http_code}\n" \
     -s | jq .

# 3. 测试 recognizeFood - 无效请求 (缺少imageUrl)
echo -e "\n=== 测试 recognizeFood (无效请求) ==="
curl -X POST "${BASE_URL}/recognizeFood" \
     -H "Content-Type: application/json" \
     -d '{}' \
     -w "\nHTTP Status: %{http_code}\n" \
     -s | jq .

# 4. 测试 handleSubscriptionPurchase - 有效请求
echo -e "\n=== 测试 handleSubscriptionPurchase (有效请求) ==="
curl -X POST "${BASE_URL}/handleSubscriptionPurchase" \
     -H "Content-Type: application/json" \
     -d '{
       "userId": "user123",
       "plan": "yearly", 
       "transactionId": "trans_001",
       "receipt": "test_receipt"
     }' \
     -w "\nHTTP Status: %{http_code}\n" \
     -s | jq .

# 5. 测试 handleSubscriptionPurchase - 缺少参数
echo -e "\n=== 测试 handleSubscriptionPurchase (缺少参数) ==="
curl -X POST "${BASE_URL}/handleSubscriptionPurchase" \
     -H "Content-Type: application/json" \
     -d '{"userId": "user123"}' \
     -w "\nHTTP Status: %{http_code}\n" \
     -s | jq .

# 6. 测试 exportUserData
echo -e "\n=== 测试 exportUserData ==="
curl -X POST "${BASE_URL}/exportUserData" \
     -H "Content-Type: application/json" \
     -d '{"userId": "user123", "format": "csv"}' \
     -w "\nHTTP Status: %{http_code}\n" \
     -s | jq .

# 7. 测试 recognizeFood - 汉堡包识别
echo -e "\n=== 测试 recognizeFood (汉堡包) ==="
curl -X POST "${BASE_URL}/recognizeFood" \
     -H "Content-Type: application/json" \
     -d '{"imageUrl": "https://example.com/burger.jpg"}' \
     -w "\nHTTP Status: %{http_code}\n" \
     -s | jq .
EOF

cat /tmp/emulator_test_commands.txt
echo ""

# ============================================================
# 预期响应示例
# ============================================================
echo "📄 预期响应示例:"
echo "------------------------------------------------------------"
echo ""

echo "1. testFunction 预期响应:"
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
echo "2. recognizeFood 预期响应 (米饭):"
cat << 'EOF'
{
  "success": true,
  "foods": [
    {
      "name": "米饭",
      "confidence": 0.95,
      "calories": 130,
      "protein": 2.7,
      "carbs": 28,
      "fat": 0.3,
      "serving": "100g"
    }
  ]
}
EOF

echo ""
echo "3. handleSubscriptionPurchase 预期响应:"
cat << 'EOF'
{
  "success": true,
  "subscriptionId": "abc123xyz"
}
EOF

echo ""

# ============================================================
# 模拟器 UI 访问
# ============================================================
echo "🌐 Firebase Emulator UI 访问:"
echo "------------------------------------------------------------"
echo ""
echo "启动模拟器后，可以访问以下地址:"
echo "  - Emulator UI:     http://localhost:4000"
echo "  - Functions:       http://localhost:5001"
echo "  - Firestore:       http://localhost:8080"
echo "  - Authentication:  http://localhost:9099"
echo "  - Storage:         http://localhost:9199"
echo ""
echo "Firestore Emulator 测试命令:"
echo "  firebase firestore:delete --all-collections --project fittrack-pro-demo"
echo ""

# ============================================================
# 完整测试脚本
# ============================================================
echo "📝 完整测试脚本 (保存为 test_emulator.sh):"
echo "------------------------------------------------------------"
cat << 'EOF'
#!/bin/bash
# 完整的 Firebase Emulator 测试脚本

BASE_URL="http://localhost:5001/fittrack-pro-demo/us-central1"
PASSED=0
FAILED=0

run_test() {
  local name=$1
  local command=$2
  local expected_status=$3
  
  echo -n "测试: $name... "
  
  response=$(eval "$command")
  status_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n -1)
  
  if [ "$status_code" = "$expected_status" ]; then
    echo "✅"
    PASSED=$((PASSED + 1))
  else
    echo "❌ (预期: $expected_status, 实际: $status_code)"
    echo "  响应: $body"
    FAILED=$((FAILED + 1))
  fi
}

# 测试1: testFunction
run_test "testFunction" \
  "curl -s -w '\n%{http_code}' -X POST ${BASE_URL}/testFunction -H 'Content-Type: application/json'" \
  "200"

# 测试2: recognizeFood 有效
run_test "recognizeFood 有效请求" \
  "curl -s -w '\n%{http_code}' -X POST ${BASE_URL}/recognizeFood -H 'Content-Type: application/json' -d '{\"imageUrl\":\"https://example.com/food.jpg\"}'" \
  "200"

# 测试3: recognizeFood 无效
run_test "recognizeFood 无效请求" \
  "curl -s -w '\n%{http_code}' -X POST ${BASE_URL}/recognizeFood -H 'Content-Type: application/json' -d '{}'" \
  "400"

# 测试4: handleSubscriptionPurchase 有效
run_test "handleSubscriptionPurchase 有效请求" \
  "curl -s -w '\n%{http_code}' -X POST ${BASE_URL}/handleSubscriptionPurchase -H 'Content-Type: application/json' -d '{\"userId\":\"user123\",\"plan\":\"yearly\",\"transactionId\":\"trans001\"}'" \
  "200"

# 测试5: handleSubscriptionPurchase 无效
run_test "handleSubscriptionPurchase 缺少参数" \
  "curl -s -w '\n%{http_code}' -X POST ${BASE_URL}/handleSubscriptionPurchase -H 'Content-Type: application/json' -d '{\"userId\":\"user123\"}'" \
  "400"

# 测试6: exportUserData
run_test "exportUserData" \
  "curl -s -w '\n%{http_code}' -X POST ${BASE_URL}/exportUserData -H 'Content-Type: application/json' -d '{\"userId\":\"user123\",\"format\":\"csv\"}'" \
  "200"

echo ""
echo "=========================================="
echo "📊 测试结果"
echo "=========================================="
echo "✅ 通过: $PASSED"
echo "❌ 失败: $FAILED"
echo "📊 通过率: $(( PASSED * 100 / (PASSED + FAILED) ))%"
echo ""

if [ $FAILED -eq 0 ]; then
  echo "🎉 所有测试通过！"
  exit 0
else
  echo "⚠️  部分测试失败，请检查"
  exit 1
fi
EOF

echo ""

# ============================================================
# 完成
# ============================================================
echo "============================================================"
echo "✅ Firebase Emulator 测试准备完成"
echo "============================================================"
echo ""
echo "📋 执行清单:"
echo "  [x] 环境检查"
echo "  [x] TypeScript 编译"
echo "  [x] 云函数导出验证 (9个函数)"
echo "  [ ] 启动模拟器: firebase emulators:start"
echo "  [ ] 运行 curl 测试命令"
echo "  [ ] 验证所有端点响应"
echo ""
echo "📁 相关文件:"
echo "  - 模拟器测试命令: /tmp/emulator_test_commands.txt"
echo "  - 模拟响应数据: /tmp/test_responses.json"
echo "  - 云函数编译产物: functions/lib/index.js"
echo ""
echo "🎯 下一步:"
echo "  1. 运行: firebase login"
echo "  2. 运行: firebase emulators:start"
echo "  3. 在新终端中运行上面的 curl 命令进行测试"
echo "  4. 访问 http://localhost:4000 查看模拟器 UI"
echo ""
echo "祝测试顺利！🎉"

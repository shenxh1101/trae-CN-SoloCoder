#!/bin/bash

echo "=== 测试短链接服务 ==="
echo ""

echo "1. 测试生成短链接（自动生成6位短码）"
echo "----------------------------------------"
RESPONSE1=$(curl -s -X POST http://localhost:8080/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.baidu.com"}')
echo "响应: $RESPONSE1"
SHORT_CODE1=$(echo $RESPONSE1 | python3 -c "import sys,json; print(json.load(sys.stdin)['short_code'])"
echo "生成的短码: $SHORT_CODE1"
echo ""

echo "2. 测试生成短链接（自定义短码）"
echo "----------------------------------------"
RESPONSE2=$(curl -s -X POST http://localhost:8080/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.google.com", "custom_code": "mycode01"}')
echo "响应: $RESPONSE2"
SHORT_CODE2=$(echo $RESPONSE2 | python3 -c "import sys,json; print(json.load(sys.stdin)['short_code']"
echo "生成的自定义短码: $SHORT_CODE2"
echo ""

echo "3. 测试自定义短码唯一性校验（重复）"
echo "----------------------------------------"
RESPONSE3=$(curl -s -X POST http://localhost:8080/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.example.com", "custom_code": "mycode01"}')
echo "响应: $RESPONSE3"
echo ""

echo "4. 测试301重定向"
echo "----------------------------------------"
curl -s -o /dev/null -w "HTTP状态码: %{http_code}\n" http://localhost:8080/$SHORT_CODE1
echo ""

echo "5. 测试更新短链接（更新URL）"
echo "----------------------------------------"
RESPONSE5=$(curl -s -X PUT http://localhost:8080/api/$SHORT_CODE1 \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.qq.com"}')
echo "响应: $RESPONSE5"
echo ""

echo "6. 测试获取统计数据"
echo "----------------------------------------"
curl -s http://localhost:8080/api/$SHORT_CODE1/stats
echo ""
echo ""

echo "7. 测试删除短链接"
echo "----------------------------------------"
RESPONSE7=$(curl -s -X DELETE http://localhost:8080/api/$SHORT_CODE1)
echo "响应: $RESPONSE7"
echo ""

echo "8. 验证删除后无法访问"
echo "----------------------------------------"
curl -s -o /dev/null -w "HTTP状态码: %{http_code}\n" http://localhost:8080/$SHORT_CODE1
echo ""

echo "=== 测试完成 ==="

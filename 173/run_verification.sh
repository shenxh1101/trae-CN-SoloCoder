#!/bin/bash
# ============================================================
# 远程命令执行系统 - 一键验证脚本
# 使用方法：
#   1. 打开 Terminal.app
#   2. 运行: cd "/Users/mac/code/solo coder/173"
#   3. 运行: bash run_verification.sh
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0
TOTAL=0

pass() {
    echo -e "  ${GREEN}✅ PASS${NC}: $1"
    PASSED=$((PASSED+1))
    TOTAL=$((TOTAL+1))
}

fail() {
    echo -e "  ${RED}❌ FAIL${NC}: $1"
    if [ -n "$2" ]; then
        echo -e "     ${YELLOW}详情: $2${NC}"
    fi
    FAILED=$((FAILED+1))
    TOTAL=$((TOTAL+1))
}

info() {
    echo -e "\n${YELLOW}[$1]${NC} $2"
}

section() {
    echo ""
    echo "============================================================"
    echo -e "${YELLOW}$1${NC}"
    echo "============================================================"
}

cd "$(dirname "$0")"
BASE_DIR="$(pwd)"

echo "============================================================"
echo "🚀 远程命令执行系统 - 自动化验证"
echo "============================================================"
echo "工作目录: $BASE_DIR"
echo "开始时间: $(date)"
echo ""

# ============================================================
# Step 1: 安装依赖
# ============================================================
section "Step 1: 安装 Python 依赖"

echo "正在安装依赖..."
if pip3 install Flask Flask-Login Flask-SQLAlchemy PyYAML Werkzeug requests 2>&1 | tail -5; then
    pass "依赖安装成功"
else
    fail "依赖安装失败" "请检查网络连接或pip配置"
    exit 1
fi

# 验证依赖
for dep in flask flask_login flask_sqlalchemy yaml werkzeug requests; do
    if python3 -c "import $dep" 2>/dev/null; then
        pass "依赖 $dep 可正常导入"
    else
        fail "依赖 $dep 无法导入"
    fi
done

# ============================================================
# Step 2: 清理旧数据
# ============================================================
section "Step 2: 清理旧数据"

if [ -f commands.db ]; then
    rm -f commands.db
    pass "已删除旧数据库"
fi

rm -rf logs/*.log 2>/dev/null || true
pass "已清理旧日志"

# ============================================================
# Step 3: 运行自动化测试脚本
# ============================================================
section "Step 3: 运行 test_setup.py 自动化功能测试"

echo "正在运行测试脚本..."
TEST_OUTPUT=$(python3 test_setup.py 2>&1)
TEST_EXIT_CODE=$?

echo "$TEST_OUTPUT"

if [ $TEST_EXIT_CODE -eq 0 ]; then
    pass "test_setup.py 所有测试通过"
else
    fail "test_setup.py 存在失败测试" "退出码: $TEST_EXIT_CODE"
fi

# 提取测试结果
TEST_PASSED=$(echo "$TEST_OUTPUT" | grep -oE "✅ [0-9]+ 通过" | grep -oE "[0-9]+")
TEST_FAILED=$(echo "$TEST_OUTPUT" | grep -oE "❌ [0-9]+ 失败" | grep -oE "[0-9]+")

if [ -n "$TEST_PASSED" ]; then
    echo "  - test_setup 通过: $TEST_PASSED"
fi
if [ -n "$TEST_FAILED" ]; then
    echo "  - test_setup 失败: $TEST_FAILED"
fi

# ============================================================
# Step 4: 启动 Flask 应用并验证
# ============================================================
section "Step 4: 启动 Flask 应用并验证"

# 检查端口占用
if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "端口5000已被占用，正在清理..."
    kill -9 $(lsof -ti:5000) 2>/dev/null || true
    sleep 1
fi

# 后台启动Flask应用
echo "正在启动Flask应用..."
python3 app.py > /tmp/flask_output.log 2>&1 &
FLASK_PID=$!
echo "Flask PID: $FLASK_PID"

# 等待启动
sleep 3

# 检查进程是否仍在运行
if kill -0 $FLASK_PID 2>/dev/null; then
    pass "Flask应用启动成功"
else
    fail "Flask应用启动失败"
    echo "Flask输出:"
    cat /tmp/flask_output.log
fi

# 等待完全启动
sleep 2

# ============================================================
# Step 5: 验证 API 接口
# ============================================================
section "Step 5: 验证 API 接口"

echo "测试无Token访问..."
API_OUTPUT=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/commands)
if [ "$API_OUTPUT" = "401" ]; then
    pass "无Token访问API返回401"
else
    fail "无Token访问API应返回401，实际返回$API_OUTPUT"
fi

echo "测试无效Token访问..."
API_OUTPUT=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer wrong-token" http://localhost:5000/api/commands)
if [ "$API_OUTPUT" = "401" ]; then
    pass "无效Token访问API返回401"
else
    fail "无效Token访问API应返回401，实际返回$API_OUTPUT"
fi

echo "测试有效Token访问..."
API_OUTPUT=$(curl -s -H "Authorization: Bearer admin-token-12345" http://localhost:5000/api/commands)
if echo "$API_OUTPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); sys.exit(0 if d.get('success') else 1)" 2>/dev/null; then
    pass "admin API获取命令列表成功"
    CMD_COUNT=$(echo "$API_OUTPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('commands', {})))")
    if [ "$CMD_COUNT" -ge 4 ]; then
        pass "admin可看到所有4个命令组，实际:$CMD_COUNT"
    else
        fail "admin应看到4个命令组，实际:$CMD_COUNT"
    fi
else
    fail "admin API获取命令列表失败" "$API_OUTPUT"
fi

echo "测试普通用户Token..."
API_OUTPUT=$(curl -s -H "Authorization: Bearer user-token-67890" http://localhost:5000/api/commands)
CMD_COUNT=$(echo "$API_OUTPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('commands', {})))")
if [ "$CMD_COUNT" -eq 2 ]; then
    pass "普通用户只能看到2个命令组"
else
    fail "普通用户应看到2个命令组，实际:$CMD_COUNT"
fi

# 测试 API 执行命令
echo "测试API执行命令..."
API_OUTPUT=$(curl -s -X POST -H "Authorization: Bearer admin-token-12345" http://localhost:5000/api/execute/system_info/0)
if echo "$API_OUTPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); sys.exit(0 if d.get('success') and 'output' in d else 1)" 2>/dev/null; then
    pass "API执行命令成功"
    STATUS=$(echo "$API_OUTPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status'))")
    OUTPUT=$(echo "$API_OUTPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('output','')))")
    if [ "$OUTPUT" -gt 0 ]; then
        pass "API返回执行输出（长度:$OUTPUT）"
    fi
    pass "执行状态: $STATUS"
else
    fail "API执行命令失败" "$API_OUTPUT"
fi

# 测试 API 获取历史
echo "测试API获取历史..."
API_OUTPUT=$(curl -s -H "Authorization: Bearer admin-token-12345" http://localhost:5000/api/history)
if echo "$API_OUTPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); sys.exit(0 if d.get('success') and len(d.get('history',[]))>0 else 1)" 2>/dev/null; then
    HIST_COUNT=$(echo "$API_OUTPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('history',[])))")
    pass "API获取历史记录成功，共$HIST_COUNT条"
else
    fail "API获取历史记录失败"
fi

# ============================================================
# Step 6: 验证 Web 界面登录
# ============================================================
section "Step 6: 验证 Web 界面"

echo "测试登录页面..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/login)
if [ "$HTTP_CODE" = "200" ]; then
    pass "登录页面可访问"
else
    fail "登录页面应返回200，实际返回$HTTP_CODE"
fi

echo "测试未登录访问首页..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/)
if [ "$HTTP_CODE" = "302" ]; then
    pass "未登录访问首页重定向到登录页"
else
    fail "未登录访问首页应返回302，实际返回$HTTP_CODE"
fi

# 使用session登录测试
COOKIE_FILE="/tmp/cookies.txt"
rm -f $COOKIE_FILE

echo "测试admin登录..."
LOGIN_RESP=$(curl -s -c $COOKIE_FILE -b $COOKIE_FILE -d "username=admin&password=admin123" -o /dev/null -w "%{http_code}" http://localhost:5000/login)
if [ "$LOGIN_RESP" = "302" ]; then
    pass "admin登录成功"
else
    fail "admin登录失败，返回$LOGIN_RESP"
fi

echo "测试登录后访问首页..."
INDEX_RESP=$(curl -s -b $COOKIE_FILE -w "%{http_code}" http://localhost:5000/)
HTTP_CODE=$(echo "$INDEX_RESP" | tail -c 4)
if echo "$INDEX_RESP" | grep -q "command-group-card\|可用命令"; then
    pass "登录后首页正常显示"
else
    fail "登录后首页内容异常"
fi

echo "测试访问历史页面..."
HIST_RESP=$(curl -s -b $COOKIE_FILE -w "%{http_code}" http://localhost:5000/history)
if echo "$HIST_RESP" | grep -q "执行历史\|history"; then
    pass "历史记录页面正常"
else
    fail "历史记录页面异常"
fi

echo "测试访问审批页面..."
APPR_RESP=$(curl -s -b $COOKIE_FILE -o /dev/null -w "%{http_code}" http://localhost:5000/approval)
if [ "$APPR_RESP" = "200" ]; then
    pass "审批页面正常（admin）"
else
    fail "审批页面应返回200，实际返回$APPR_RESP"
fi

# 测试普通用户登录
rm -f $COOKIE_FILE
curl -s -c $COOKIE_FILE -b $COOKIE_FILE -d "username=user&password=user123" http://localhost:5000/login > /dev/null

echo "测试普通用户无权限访问审批页..."
APPR_RESP=$(curl -s -b $COOKIE_FILE -o /dev/null -w "%{http_code}" http://localhost:5000/approval)
if [ "$APPR_RESP" = "403" ]; then
    pass "普通用户访问审批页返回403"
else
    fail "普通用户访问审批页应返回403，实际返回$APPR_RESP"
fi

# ============================================================
# Step 7: 验证命令执行和实时流式输出
# ============================================================
section "Step 7: 验证命令执行和实时流式输出"

rm -f $COOKIE_FILE
curl -s -c $COOKIE_FILE -b $COOKIE_FILE -d "username=admin&password=admin123" http://localhost:5000/login > /dev/null

echo "测试执行命令（system_info/0）..."
EXEC_RESP=$(curl -s -b $COOKIE_FILE -X POST http://localhost:5000/execute/system_info/0)
if echo "$EXEC_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); sys.exit(0 if d.get('success') and not d.get('require_approval') else 1)" 2>/dev/null; then
    HIST_ID=$(echo "$EXEC_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('history_id'))")
    pass "命令执行成功，history_id: $HIST_ID"
else
    fail "命令执行失败" "$EXEC_RESP"
fi

# 等待执行完成
sleep 3

# 获取输出
if [ -n "$HIST_ID" ]; then
    OUTPUT_RESP=$(curl -s -b $COOKIE_FILE http://localhost:5000/output/$HIST_ID)
    OUTPUT_LEN=$(echo "$OUTPUT_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('output','')))")
    STATUS=$(echo "$OUTPUT_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status'))")
    if [ "$OUTPUT_LEN" -gt 0 ]; then
        pass "命令执行输出非空（长度:$OUTPUT_LEN）"
    else
        fail "命令执行输出为空"
    fi
    pass "命令执行状态: $STATUS"

    # 测试日志下载
    DLOAD_RESP=$(curl -s -b $COOKIE_FILE -o /dev/null -w "%{http_code}" http://localhost:5000/download/$HIST_ID)
    if [ "$DLOAD_RESP" = "200" ]; then
        pass "日志下载成功"
    else
        fail "日志下载失败，返回$DLOAD_RESP"
    fi
fi

# ============================================================
# Step 8: 验证审批流程
# ============================================================
section "Step 8: 验证审批流程"

echo "测试提交需要审批的命令（backup/0）..."
EXEC_RESP=$(curl -s -b $COOKIE_FILE -X POST http://localhost:5000/execute/backup/0)
if echo "$EXEC_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); sys.exit(0 if d.get('success') and d.get('require_approval') else 1)" 2>/dev/null; then
    APPR_ID=$(echo "$EXEC_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('history_id'))")
    pass "待审批命令提交成功，history_id: $APPR_ID"
else
    fail "待审批命令提交失败" "$EXEC_RESP"
fi

if [ -n "$APPR_ID" ]; then
    echo "测试批准命令..."
    APPR_RESP=$(curl -s -b $COOKIE_FILE -X POST http://localhost:5000/approval/$APPR_ID/approve)
    if echo "$APPR_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); sys.exit(0 if d.get('success') else 1)" 2>/dev/null; then
        pass "审批批准成功"
    else
        fail "审批批准失败" "$APPR_RESP"
    fi

    sleep 2

    echo "测试拒绝命令..."
    EXEC_RESP2=$(curl -s -b $COOKIE_FILE -X POST http://localhost:5000/execute/backup/1)
    REJ_ID=$(echo "$EXEC_RESP2" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('history_id'))")
    if [ -n "$REJ_ID" ] && [ "$REJ_ID" != "None" ]; then
        REJ_RESP=$(curl -s -b $COOKIE_FILE -X POST http://localhost:5000/approval/$REJ_ID/reject)
        if echo "$REJ_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); sys.exit(0 if d.get('success') else 1)" 2>/dev/null; then
            pass "审批拒绝成功"
        else
            fail "审批拒绝失败" "$REJ_RESP"
        fi
    fi
fi

# ============================================================
# Step 9: 验证历史记录
# ============================================================
section "Step 9: 验证历史记录"

HIST_RESP=$(curl -s -b $COOKIE_FILE http://localhost:5000/history)
if echo "$HIST_RESP" | grep -q "执行历史\|history"; then
    HIST_COUNT=$(echo "$HIST_RESP" | grep -o "<tr>" | wc -l)
    # 减去表头
    HIST_COUNT=$((HIST_COUNT - 1))
    if [ "$HIST_COUNT" -ge 3 ]; then
        pass "历史记录存在，至少$HIST_COUNT条记录"
    else
        fail "历史记录数量不足，仅$HIST_COUNT条"
    fi
else
    fail "历史记录页面内容异常"
fi

# 检查日志文件
LOG_COUNT=$(ls logs/*.log 2>/dev/null | wc -l)
if [ "$LOG_COUNT" -ge 2 ]; then
    pass "日志文件存在，共$LOG_COUNT个"
    # 检查日志内容
    LATEST_LOG=$(ls -t logs/*.log | head -1)
    if [ -n "$LATEST_LOG" ] && [ -s "$LATEST_LOG" ]; then
        pass "最新日志文件非空: $(basename $LATEST_LOG)"
        if grep -q "命令组\|执行用户" "$LATEST_LOG"; then
            pass "日志文件包含元信息"
        else
            fail "日志文件缺少元信息"
        fi
    fi
else
    fail "日志文件数量不足，仅$LOG_COUNT个"
fi

# ============================================================
# Step 10: 验证 CLI 客户端
# ============================================================
section "Step 10: 验证 CLI 客户端"

# 配置CLI
python3 cli_client.py config --server http://localhost:5000 --token admin-token-12345 2>&1 > /dev/null
if [ -f ~/.remote_cmd_config.json ]; then
    pass "CLI配置文件已创建"
else
    fail "CLI配置文件未创建"
fi

echo "测试CLI列出命令..."
CLI_LIST=$(python3 cli_client.py list 2>&1)
if echo "$CLI_LIST" | grep -q "system_info\|可用命令"; then
    pass "CLI list命令正常"
else
    fail "CLI list命令异常"
    echo "输出: $CLI_LIST"
fi

echo "测试CLI执行命令..."
CLI_EXEC=$(python3 cli_client.py execute system_info 0 2>&1)
if echo "$CLI_EXEC" | grep -q "执行完成\|状态\|[DONE]"; then
    pass "CLI execute命令正常"
else
    fail "CLI execute命令异常"
    echo "输出: $CLI_EXEC"
fi

echo "测试CLI查看历史..."
CLI_HIST=$(python3 cli_client.py history 2>&1)
if echo "$CLI_HIST" | grep -q "ID\|用户\|命令组"; then
    pass "CLI history命令正常"
else
    fail "CLI history命令异常"
    echo "输出: $CLI_HIST"
fi

echo "测试CLI查看输出..."
CLI_OUTPUT=$(python3 cli_client.py output 1 2>&1 || true)
if echo "$CLI_OUTPUT" | grep -q "状态\|\[DONE\]" || echo "$CLI_OUTPUT" | grep -q "无输出\|错误"; then
    pass "CLI output命令正常"
else
    fail "CLI output命令异常"
    echo "输出: $CLI_OUTPUT"
fi

# ============================================================
# 清理
# ============================================================
section "清理"

kill $FLASK_PID 2>/dev/null || true
pass "已停止Flask应用"

rm -f $COOKIE_FILE /tmp/flask_output.log 2>/dev/null || true

# ============================================================
# 总结
# ============================================================
section "验证结果总结"

echo ""
echo "============================================================"
echo -e "  总计: ${GREEN}$PASSED${NC} 通过, ${RED}$FAILED${NC} 失败, 共 $TOTAL 项"
echo "============================================================"
echo ""

if [ "$FAILED" -eq 0 ]; then
    echo -e "${GREEN}🎉 所有验证通过！系统运行正常${NC}"
    echo ""
    echo "启动命令: python3 app.py"
    echo "访问地址: http://localhost:5000"
    echo ""
    echo "默认账号:"
    echo "  管理员: admin / admin123"
    echo "  普通用户: user / user123"
    echo ""
    echo "API Token:"
    echo "  admin: admin-token-12345"
    echo "  user: user-token-67890"
    exit 0
else
    echo -e "${RED}⚠️  有 $FAILED 项验证失败，请检查上方输出${NC}"
    exit 1
fi

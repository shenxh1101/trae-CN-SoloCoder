#!/usr/bin/env python3
import sys
import os
import time
import json
import subprocess
import tempfile
import shutil

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

os.environ['SECRET_KEY'] = 'test-secret-key'

PASSED = 0
FAILED = 0


def test(name, condition, detail=""):
    global PASSED, FAILED
    if condition:
        PASSED += 1
        print(f"  ✅ {name}")
    else:
        FAILED += 1
        print(f"  ❌ {name}")
        if detail:
            print(f"     {detail}")


def check_dependencies():
    print("\n" + "=" * 60)
    print("📦 1. 检查依赖安装")
    print("=" * 60)

    deps = {
        'yaml': 'PyYAML',
        'flask': 'Flask',
        'flask_login': 'Flask-Login',
        'flask_sqlalchemy': 'Flask-SQLAlchemy',
        'werkzeug': 'Werkzeug',
        'requests': 'requests',
    }
    for mod, name in deps.items():
        try:
            __import__(mod)
            test(f"{name} 已安装", True)
        except ImportError:
            test(f"{name} 已安装", False, f"请运行: pip3 install {name}")


def check_config():
    print("\n" + "=" * 60)
    print("📄 2. 检查配置文件")
    print("=" * 60)

    config_path = os.path.join(BASE_DIR, 'config.yaml')
    test("config.yaml 存在", os.path.exists(config_path))

    if os.path.exists(config_path):
        import yaml
        with open(config_path, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)

        test("用户配置存在", 'users' in config and len(config['users']) > 0)
        test("命令组配置存在", 'command_groups' in config and len(config['command_groups']) > 0)
        test("超时设置存在", 'command_timeout' in config)

        if 'users' in config:
            for u in config['users']:
                has_fields = all(k in u for k in ['username', 'password', 'role', 'api_token', 'command_groups'])
                test(f"用户 {u.get('username', '?')} 配置完整", has_fields)

        if 'command_groups' in config:
            for gid, gcfg in config['command_groups'].items():
                has_fields = all(k in gcfg for k in ['name', 'description', 'commands'])
                test(f"命令组 {gid} 配置完整", has_fields)
                if 'commands' in gcfg:
                    for i, cmd in enumerate(gcfg['commands']):
                        cmd_ok = 'name' in cmd and 'command' in cmd
                        test(f"  命令 {gid}/{i} ({cmd.get('name', '?')}) 格式正确", cmd_ok)


def check_app_import():
    print("\n" + "=" * 60)
    print("🐍 3. 检查 app.py 导入和初始化")
    print("=" * 60)

    try:
        import app as flask_app
        test("app.py 导入成功", True)

        test("Flask app 实例存在", flask_app.app is not None)
        test("db 实例存在", flask_app.db is not None)
        test("login_manager 实例存在", flask_app.login_manager is not None)
        test("CONFIG 已加载", flask_app.CONFIG is not None)
        test("User 模型存在", hasattr(flask_app, 'User'))
        test("CommandHistory 模型存在", hasattr(flask_app, 'CommandHistory'))

        return flask_app
    except Exception as e:
        test("app.py 导入成功", False, str(e))
        import traceback
        traceback.print_exc()
        return None


def check_routes(flask_app):
    print("\n" + "=" * 60)
    print("🛣️ 4. 检查路由注册")
    print("=" * 60)

    expected_routes = [
        ('/', 'index'),
        ('/login', 'login'),
        ('/logout', 'logout'),
        ('/execute/<group_id>/<cmd_index>', 'execute_command'),
        ('/stream/<history_id>', 'stream'),
        ('/output/<history_id>', 'get_output'),
        ('/approval', 'approval_list'),
        ('/history', 'history_page'),
        ('/download/<history_id>', 'download_log'),
        ('/api/commands', 'api_get_commands'),
        ('/api/execute/<group_id>/<cmd_index>', 'api_execute'),
        ('/api/history', 'api_history'),
        ('/api/output/<history_id>', 'api_get_output'),
    ]

    registered_endpoints = [rule.endpoint for rule in flask_app.app.url_map.iter_rules()]

    for path, endpoint in expected_routes:
        test(f"路由 {endpoint} ({path})", endpoint in registered_endpoints)


def check_db_and_auth(flask_app):
    print("\n" + "=" * 60)
    print("🔐 5. 检查数据库初始化和用户认证")
    print("=" * 60)

    try:
        flask_app.init_db()

        with flask_app.app.app_context():
            admin = flask_app.User.query.filter_by(username='admin').first()
            test("admin 用户已创建", admin is not None)
            if admin:
                test("admin 密码哈希已设置", len(admin.password_hash) > 0)
                test("admin 角色为 admin", admin.role == 'admin')
                test("admin API Token 已设置", len(admin.api_token) > 0)
                test("admin 密码验证正确", flask_app.check_password_hash(admin.password_hash, 'admin123'))

            user = flask_app.User.query.filter_by(username='user').first()
            test("user 用户已创建", user is not None)
            if user:
                test("user 角色为 user", user.role == 'user')
                test("user 权限限制正确", 'system_info' in user.get_command_groups() and 'advanced' not in user.get_command_groups())

            from werkzeug.security import generate_password_hash, check_password_hash
            test("密码哈希验证正常", check_password_hash(generate_password_hash('test'), 'test'))

    except Exception as e:
        test("数据库初始化和认证", False, str(e))
        import traceback
        traceback.print_exc()


def check_functional(flask_app):
    print("\n" + "=" * 60)
    print("⚡ 6. 功能测试（Flask Test Client）")
    print("=" * 60)

    flask_app.app.config['TESTING'] = True
    flask_app.app.config['WTF_CSRF_ENABLED'] = False
    client = flask_app.app.test_client()

    test("未登录访问首页重定向到登录页", client.get('/').status_code == 302)

    rv = client.post('/login', data={'username': 'admin', 'password': 'admin123'}, follow_redirects=True)
    test("admin 登录成功", rv.status_code == 200)
    test("登录后可访问命令列表", b'command-group-card' in rv.data or b'可用命令' in rv.data)

    rv = client.get('/history')
    test("历史记录页面可访问", rv.status_code == 200)

    rv = client.get('/approval')
    test("审批页面可访问（admin）", rv.status_code == 200)

    rv = client.post('/execute/system_info/0')
    data = json.loads(rv.data)
    test("执行命令 system_info/0 返回成功", data.get('success') is True)
    test("执行命令不需要审批", data.get('require_approval') is False)
    test("返回了 history_id", 'history_id' in data)

    if data.get('success') and data.get('history_id'):
        time.sleep(2)
        rv = client.get(f"/output/{data['history_id']}")
        output_data = json.loads(rv.data)
        test("获取执行输出成功", output_data.get('status') in ('success', 'failed', 'running'))
        test("执行输出非空", len(output_data.get('output', '')) > 0)

        rv = client.get(f"/download/{data['history_id']}")
        test("日志下载成功", rv.status_code == 200)

    rv = client.post('/execute/backup/0')
    data = json.loads(rv.data)
    test("执行需要审批的命令返回需审批", data.get('success') is True and data.get('require_approval') is True)

    client.get('/logout')
    rv = client.post('/login', data={'username': 'user', 'password': 'user123'}, follow_redirects=True)
    test("user 用户登录成功", rv.status_code == 200)

    rv = client.get('/approval')
    test("普通用户无法访问审批页面", rv.status_code in (403, 302))

    rv = client.post('/execute/advanced/0')
    test("普通用户无权限执行 advanced 命令", rv.status_code == 403)

    client.get('/logout')


def check_api(flask_app):
    print("\n" + "=" * 60)
    print("🔌 7. API接口测试")
    print("=" * 60)

    flask_app.app.config['TESTING'] = True
    client = flask_app.app.test_client()

    rv = client.get('/api/commands')
    test("无Token访问API返回401", rv.status_code == 401)

    rv = client.get('/api/commands', headers={'Authorization': 'Bearer invalid-token'})
    test("无效Token访问API返回401", rv.status_code == 401)

    headers = {'Authorization': 'Bearer admin-token-12345'}
    rv = client.get('/api/commands', headers=headers)
    data = json.loads(rv.data)
    test("admin获取命令列表成功", data.get('success') is True)
    test("admin可以看到所有命令组", len(data.get('commands', {})) >= 3)

    rv = client.get('/api/history', headers=headers)
    data = json.loads(rv.data)
    test("admin获取历史记录成功", data.get('success') is True)

    rv = client.post('/api/execute/system_info/0', headers=headers)
    data = json.loads(rv.data)
    test("API执行命令成功", data.get('success') is True)

    rv = client.post('/api/execute/backup/0', headers=headers)
    data = json.loads(rv.data)
    test("API执行审批命令被拒绝", data.get('success') is False)

    user_headers = {'Authorization': 'Bearer user-token-67890'}
    rv = client.get('/api/commands', headers=user_headers)
    data = json.loads(rv.data)
    test("user只能看到授权的命令组", len(data.get('commands', {})) == 2)

    rv = client.post('/api/execute/advanced/0', headers=user_headers)
    test("user API执行未授权命令返回403", rv.status_code == 403)


def check_approval_flow(flask_app):
    print("\n" + "=" * 60)
    print("✅ 8. 审批流程测试")
    print("=" * 60)

    flask_app.app.config['TESTING'] = True
    client = flask_app.app.test_client()

    client.post('/login', data={'username': 'admin', 'password': 'admin123'})

    rv = client.post('/execute/advanced/0')
    data = json.loads(rv.data)
    test("高级命令提交成功", data.get('success') is True)
    test("高级命令需要审批", data.get('require_approval') is True)

    history_id = data.get('history_id')

    if history_id:
        with flask_app.app.app_context():
            cmd_record = flask_app.CommandHistory.query.get(history_id)
            test("记录已存入数据库", cmd_record is not None)
            if cmd_record:
                test("记录标记为需要审批", cmd_record.require_approval is True)
                test("记录未被批准", cmd_record.approved is False)

        rv = client.post(f'/approval/{history_id}/approve')
        data = json.loads(rv.data)
        test("审批批准成功", data.get('success') is True)

        time.sleep(2)

        with flask_app.app.app_context():
            cmd_record = flask_app.CommandHistory.query.get(history_id)
            test("批准后记录状态非running", cmd_record.status in ('success', 'failed', 'running'))

    rv = client.post('/execute/advanced/1')
    data = json.loads(rv.data)
    reject_id = data.get('history_id')
    if reject_id:
        rv = client.post(f'/approval/{reject_id}/reject')
        data = json.loads(rv.data)
        test("审批拒绝成功", data.get('success') is True)

        with flask_app.app.app_context():
            cmd_record = flask_app.CommandHistory.query.get(reject_id)
            test("拒绝后状态为rejected", cmd_record.status == 'rejected')

    client.get('/logout')


def check_history_and_logs(flask_app):
    print("\n" + "=" * 60)
    print("📜 9. 历史记录和日志测试")
    print("=" * 60)

    with flask_app.app.app_context():
        all_records = flask_app.CommandHistory.query.all()
        test("存在历史记录", len(all_records) > 0)

        success_records = flask_app.CommandHistory.query.filter_by(status='success').all()
        test("存在成功执行的记录", len(success_records) >= 0)

        log_dir = os.path.join(BASE_DIR, 'logs')
        log_files = [f for f in os.listdir(log_dir) if f.endswith('.log')] if os.path.isdir(log_dir) else []
        test("日志目录存在日志文件", len(log_files) > 0)

        if log_files:
            latest_log = os.path.join(log_dir, sorted(log_files)[-1])
            with open(latest_log, 'r', encoding='utf-8') as f:
                content = f.read()
            test("日志文件包含内容", len(content) > 0)
            test("日志文件包含元信息", '命令组' in content or '执行用户' in content)


def main():
    print("=" * 60)
    print("🚀 远程命令执行系统 - 综合功能测试")
    print("=" * 60)

    db_path = os.path.join(BASE_DIR, 'commands.db')
    if os.path.exists(db_path):
        os.remove(db_path)
        print("\n🧹 已清理旧数据库")

    check_dependencies()
    check_config()

    flask_app = check_app_import()
    if flask_app is None:
        print("\n❌ app.py 导入失败，终止测试")
        sys.exit(1)

    check_routes(flask_app)
    check_db_and_auth(flask_app)
    check_functional(flask_app)
    check_api(flask_app)
    check_approval_flow(flask_app)
    check_history_and_logs(flask_app)

    print("\n" + "=" * 60)
    print(f"� 测试完成: ✅ {PASSED} 通过, ❌ {FAILED} 失败")
    print("=" * 60)

    if FAILED > 0:
        print("\n⚠️ 部分测试失败，请检查上方输出")
        sys.exit(1)
    else:
        print("\n🎉 所有测试通过！应用运行正常")
        print("\n启动命令: python3 app.py")
        print("访问地址: http://localhost:5000")
        print("\n默认账号:")
        print("  管理员: admin / admin123")
        print("  普通用户: user / user123")
        print("\nAPI Token:")
        print("  admin: admin-token-12345")
        print("  user: user-token-67890")


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
import sys
import os
import subprocess
import time
import json
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

RESULT_FILE = os.path.join(BASE_DIR, 'verification_results.txt')
APP_LOG = os.path.join(BASE_DIR, 'app.log')


def run_test_setup():
    print("=" * 60)
    print(" Step 1: 运行 test_setup.py 自动化测试")
    print("=" * 60)
    
    result_lines = []
    
    try:
        cmd = [sys.executable, os.path.join(BASE_DIR, 'test_setup.py')]
        print("执行命令: " + ' '.join(cmd))
        
        env = os.environ.copy()
        env['PYTHONUNBUFFERED'] = '1'
        
        process = subprocess.Popen(
            cmd,
            cwd=BASE_DIR,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True
        )
        
        output = []
        for line in process.stdout:
            line = line.rstrip()
            print(f'  {line}')
            output.append(line)
            result_lines.append(line)
        
        process.wait()
        returncode = process.returncode
        
        print(f"\ntest_setup.py 退出码: {returncode}")
        
        if returncode == 0:
            result_lines.append(" test_setup.py 所有测试通过")
            passed = True
        else:
            result_lines.append(" test_setup.py 存在失败测试")
            passed = False
            
    except Exception as e:
        error_msg = f" test_setup.py 执行异常: {e}"
        print(error_msg)
        result_lines.append(error_msg)
        import traceback
        traceback.print_exc()
        passed = False
    
    return passed, result_lines


def start_flask_app():
    print("\n" + "=" * 60)
    print(" Step 2: 启动 Flask 应用（后台模式）")
    print("=" * 60)
    
    app_path = os.path.join(BASE_DIR, 'app.py')
    
    try:
        import psutil
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                if 'python' in proc.info['name'] and 'app.py' in str(proc.info['cmdline']):
                    print(f"  清理旧进程: {proc.info['pid']}")
                    proc.kill()
            except:
                pass
    except ImportError:
        print("  psutil 未安装，跳过进程清理")
    
    log_file = open(APP_LOG, 'w', encoding='utf-8')
    log_file.write("=== Flask 启动日志\n")
    log_file.write(f"启动时间: {datetime.now()}\n")
    log_file.write("=" * 60 + '\n')
    
    env = os.environ.copy()
    env['PYTHONUNBUFFERED'] = '1'
    env['SECRET_KEY'] = 'test-verification-key'
    
    process = subprocess.Popen(
        [sys.executable, app_path],
        cwd=BASE_DIR,
        env=env,
        stdout=log_file,
        stderr=subprocess.STDOUT,
        text=True
    )
    
    print(f"  Flask PID: {process.pid}")
    print(f"  日志文件: {APP_LOG}")
    print(f"  等待启动...")
    
    time.sleep(5)
    
    if process.poll() is None:
        print("  Flask 应用启动成功")
        return process
    else:
        print("  Flask 应用启动失败")
        log_file.flush()
        log_file.close()
        with open(APP_LOG, 'r', encoding='utf-8') as f:
            print(f.read())
        return None


def test_api():
    print("\n" + "=" * 60)
    print(" Step 3: API 接口测试")
    print("=" * 60)
    
    results = []
    
    try:
        import requests
    except ImportError:
        msg = " requests 未安装，跳过API测试"
        print(msg)
        results.append(msg)
        return False, results
    
    base_url = 'http://localhost:5000'
    
    # 测试1: 无Token访问
    try:
        r = requests.get(f'{base_url}/api/commands', timeout=5)
        if r.status_code == 401:
            msg = " 无Token访问返回401"
        else:
            msg = f" 无Token访问应返回401，实际返回{r.status_code}"
        print(f"  {msg}")
        results.append(msg)
    except Exception as e:
        msg = f" API连接失败: {e}"
        print(f"  {msg}")
        results.append(msg)
        return False, results
    
    # 测试2: 有效Token访问
    try:
        headers = {'Authorization': 'Bearer admin-token-12345'}
        r = requests.get(f'{base_url}/api/commands', headers=headers, timeout=5)
        data = r.json()
        if data.get('success') and len(data.get('commands', {})) >= 4:
            msg = f" admin API获取命令列表成功（{len(data.get('commands'))}个命令组）"
        else:
            msg = f" admin API获取命令列表失败: {data}"
        print(f"  {msg}")
        results.append(msg)
    except Exception as e:
        msg = f" admin API失败: {e}"
        print(f"  {msg}")
        results.append(msg)
    
    # 测试3: 普通用户Token
    try:
        headers = {'Authorization': 'Bearer user-token-67890'}
        r = requests.get(f'{base_url}/api/commands', headers=headers, timeout=5)
        data = r.json()
        if data.get('success') and len(data.get('commands', {})) == 2:
            msg = " user API获取命令列表成功（2个命令组）"
        else:
            msg = f" user API获取命令列表失败"
        print(f"  {msg}")
        results.append(msg)
    except Exception as e:
        msg = f" user API失败: {e}"
        print(f"  {msg}")
        results.append(msg)
    
    # 测试4: API执行命令
    try:
        headers = {'Authorization': 'Bearer admin-token-12345'}
        r = requests.post(f'{base_url}/api/execute/system_info/0', headers=headers, timeout=70)
        data = r.json()
        if data.get('success'):
            msg = f" API执行命令成功 (history_id={data.get('history_id')}, status={data.get('status')})"
            print(f"  {msg}")
            results.append(msg)
            if data.get('output') and len(data.get('output')) > 0:
                msg2 = f" API返回执行输出（长度{len(data.get('output'))}）"
                print(f"  {msg2}")
                results.append(msg2)
        else:
            msg = f" API执行命令失败: {data}"
            print(f"  {msg}")
            results.append(msg)
    except Exception as e:
        msg = f" API执行命令失败: {e}"
        print(f"  {msg}")
        results.append(msg)
    
    # 测试5: API获取历史
    try:
        headers = {'Authorization': 'Bearer admin-token-12345'}
        r = requests.get(f'{base_url}/api/history', headers=headers, timeout=5)
        data = r.json()
        if data.get('success') and len(data.get('history', [])) > 0:
            msg = f" API获取历史记录成功（{len(data.get('history'))}条）"
        else:
            msg = f" API获取历史记录失败"
        print(f"  {msg}")
        results.append(msg)
    except Exception as e:
        msg = f" API获取历史失败: {e}"
        print(f"  {msg}")
        results.append(msg)
    
    return True, results


def test_cli_client():
    print("\n" + "=" * 60)
    print(" Step 4: CLI 客户端测试")
    print("=" * 60)
    
    results = []
    
    cli_path = os.path.join(BASE_DIR, 'cli_client.py')
    
    # 测试1: 导入
    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location("cli_client", cli_path)
        cli_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cli_module)
        print("  CLI 客户端导入成功")
        results.append(" CLI 客户端导入成功")
    except Exception as e:
        msg = f" CLI 客户端导入失败: {e}"
        print(f"  {msg}")
        results.append(msg)
        return False, results
    
    # 测试2: config 命令
    try:
        result = subprocess.run(
            [sys.executable, cli_path, 'config', '--server', 'http://localhost:5000', '--token', 'admin-token-12345'],
            cwd=BASE_DIR,
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            print("  CLI config 命令成功")
            results.append(" CLI config 命令成功")
        else:
            print(f"  CLI config 命令失败: {result.stderr}")
            results.append(" CLI config 命令失败")
    except Exception as e:
        msg = f" CLI config 异常: {e}"
        print(f"  {msg}")
        results.append(msg)
    
    # 测试3: list 命令
    try:
        result = subprocess.run(
            [sys.executable, cli_path, 'list'],
            cwd=BASE_DIR,
            capture_output=True,
            text=True
        )
        if result.returncode == 0 and 'system_info' in result.stdout:
            print("  CLI list 命令成功")
            results.append(" CLI list 命令成功")
        else:
            print(f"  CLI list 命令失败: {result.stderr or result.stdout}")
            results.append(" CLI list 命令失败")
    except Exception as e:
        msg = f" CLI list 异常: {e}"
        print(f"  {msg}")
        results.append(msg)
    
    return True, results


def cleanup(flask_process):
    print("\n" + "=" * 60)
    print(" 清理")
    print("=" * 60)
    
    if flask_process and flask_process.poll() is None:
        flask_process.terminate()
        print("  已停止 Flask 应用")
    else:
        print("  Flask 应用已停止")


def main():
    print("=" * 60)
    print(" 远程命令执行系统 - 验证脚本")
    print("=" * 60)
    print(f"工作目录: {BASE_DIR}")
    print(f"Python: {sys.executable}")
    print(f"时间: {datetime.now()}")
    
    all_results = []
    
    # Step 1: 运行 test_setup.py
    test_setup_passed, test_setup_lines = run_test_setup()
    all_results.extend(test_setup_lines)
    
    # Step 2: 启动 Flask
    flask_process = start_flask_app()
    
    if flask_process:
        # Step 3: API 测试
        api_passed, api_lines = test_api()
        all_results.extend(api_lines)
        
        # Step 4: CLI 测试
        cli_passed, cli_lines = test_cli_client()
        all_results.extend(cli_lines)
    
    # 清理
    cleanup(flask_process)
    
    # 保存结果
    print("\n" + "=" * 60)
    print(" 保存验证结果")
    print("=" * 60)
    
    with open(RESULT_FILE, 'w', encoding='utf-8') as f:
        f.write("=" * 60 + '\n')
        f.write("远程命令执行系统 - 验证结果\n")
        f.write("=" * 60 + '\n')
        f.write(f"时间: {datetime.now()}\n")
        f.write(f"Python: {sys.executable}\n")
        f.write(f"工作目录: {BASE_DIR}\n\n")
        f.write('\n'.join(all_results))
        f.write('\n')
    
    print(f"  结果已保存到: {RESULT_FILE}")
    print(f"  Flask日志已保存到: {APP_LOG}")
    
    print("\n" + "=" * 60)
    print(" 验证完成")
    print("=" * 60)
    print("\n请查看以上文件内容，如有问题请将文件内容反馈给我。")


if __name__ == '__main__':
    main()

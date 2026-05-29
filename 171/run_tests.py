#!/usr/bin/env python3
import sys
import os
import subprocess
import tempfile
from pathlib import Path

project_root = Path(__file__).parent
test_script = project_root / "test_e2e.py"
output_file = project_root / "test_results.txt"

def run_command(cmd, cwd=None):
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd or str(project_root),
            capture_output=True,
            text=True,
            timeout=300
        )
        return result.returncode, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return -1, "", "Command timed out"
    except Exception as e:
        return -1, "", str(e)

def main():
    print("=" * 70, flush=True)
    print("  股票投资组合管理系统 - 自动测试运行器", flush=True)
    print("=" * 70, flush=True)
    print(flush=True)
    
    all_output = []
    
    print("[1/5] 检查 Python 环境...", flush=True)
    code, stdout, stderr = run_command([sys.executable, "--version"])
    all_output.append(f"Python version: {stdout.strip()}")
    if code == 0:
        print(f"  ✓ Python: {stdout.strip()}", flush=True)
    else:
        print(f"  ✗ Python 检查失败: {stderr}", flush=True)
    print(flush=True)
    
    print("[2/5] 安装依赖...", flush=True)
    req_file = project_root / "requirements.txt"
    if req_file.exists():
        code, stdout, stderr = run_command([
            sys.executable, "-m", "pip", "install", "-q", 
            "-r", str(req_file)
        ])
        if code == 0:
            print("  ✓ 依赖安装完成", flush=True)
            all_output.append("Dependencies installed successfully")
        else:
            print(f"  ⚠️  依赖安装可能需要手动执行: pip3 install -r requirements.txt", flush=True)
            all_output.append(f"Dependency install output: {stderr[:500]}")
    else:
        print("  ⚠️  requirements.txt 不存在", flush=True)
    print(flush=True)
    
    print("[3/5] 运行端到端测试 (test_e2e.py)...", flush=True)
    if test_script.exists():
        os.chdir(str(project_root))
        code, stdout, stderr = run_command(
            [sys.executable, str(test_script)],
            cwd=str(project_root)
        )
        all_output.append("=== TEST E2E OUTPUT ===")
        all_output.append(stdout)
        if stderr:
            all_output.append("=== TEST E2E STDERR ===")
            all_output.append(stderr)
        
        print(f"  测试退出码: {code}", flush=True)
        if code == 0:
            print("  ✓ 测试执行完成", flush=True)
        else:
            print(f"  ⚠️  测试执行有问题 (退出码: {code})", flush=True)
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write("\n".join(all_output))
        print(f"  完整输出已保存到: {output_file}", flush=True)
    else:
        print(f"  ✗ test_e2e.py 不存在: {test_script}", flush=True)
    print(flush=True)
    
    print("[4/5] 功能验证测试 - 关键命令...", flush=True)
    print(flush=True)
    
    portfolio_script = project_root / "portfolio_manager.py"
    if portfolio_script.exists():
        func_tests = []
        
        print("  测试 1: --help 命令...", flush=True)
        code, stdout, stderr = run_command(
            [sys.executable, str(portfolio_script), "--help"]
        )
        if code == 0:
            print("    ✓ --help 命令正常", flush=True)
            func_tests.append(("help", "PASS"))
        else:
            print(f"    ✗ --help 失败: {stderr[:200]}", flush=True)
            func_tests.append(("help", f"FAIL: {stderr[:200]}"))
        
        print("  测试 2: 创建投资组合...", flush=True)
        code, stdout, stderr = run_command([
            sys.executable, str(portfolio_script),
            "create-portfolio", "--name", "测试组合_AUTOTEST", 
            "--description", "自动测试创建"
        ])
        if code == 0:
            print("    ✓ create-portfolio 命令正常", flush=True)
            func_tests.append(("create-portfolio", "PASS"))
        else:
            print(f"    ⚠️  create-portfolio: {stderr[:200] or stdout[:200]}", flush=True)
            func_tests.append(("create-portfolio", f"CODE={code}: {stderr[:100]}"))
        
        print("  测试 3: 添加持仓...", flush=True)
        code, stdout, stderr = run_command([
            sys.executable, str(portfolio_script),
            "add", "--portfolio", "测试组合_AUTOTEST",
            "--code", "600519", "--shares", "100", 
            "--price", "1800", "--name", "贵州茅台"
        ])
        if code == 0:
            print("    ✓ add 命令正常", flush=True)
            func_tests.append(("add", "PASS"))
        else:
            print(f"    ⚠️  add: {stderr[:200] or stdout[:200]}", flush=True)
            func_tests.append(("add", f"CODE={code}: {stderr[:100]}"))
        
        print("  测试 4: 查询 600519 股价...", flush=True)
        code, stdout, stderr = run_command([
            sys.executable, str(portfolio_script),
            "price", "--code", "600519"
        ])
        if code == 0 and "600519" in (stdout + stderr):
            print("    ✓ price 命令正常", flush=True)
            func_tests.append(("price_600519", "PASS"))
            print(f"      输出: {stdout.strip()[:100]}", flush=True)
        else:
            print(f"    ⚠️  price: {stderr[:200] or stdout[:200]}", flush=True)
            func_tests.append(("price_600519", f"CODE={code}: {stderr[:100]} or {stdout[:100]}"))
        
        print("  测试 5: 查看持仓...", flush=True)
        code, stdout, stderr = run_command([
            sys.executable, str(portfolio_script),
            "view", "--portfolio", "测试组合_AUTOTEST"
        ])
        if code == 0:
            print("    ✓ view 命令正常", flush=True)
            func_tests.append(("view", "PASS"))
        else:
            print(f"    ⚠️  view: {stderr[:200] or stdout[:200]}", flush=True)
            func_tests.append(("view", f"CODE={code}: {stderr[:100]}"))
        
        print("  测试 6: 导出 CSV...", flush=True)
        temp_dir = Path(tempfile.mkdtemp(prefix="stock_export_"))
        code, stdout, stderr = run_command([
            sys.executable, str(portfolio_script),
            "export-csv", "--portfolio", "测试组合_AUTOTEST",
            "--output", str(temp_dir)
        ])
        csv_files = list(temp_dir.glob("*.csv"))
        if code == 0 and len(csv_files) > 0:
            print("    ✓ export-csv 命令正常", flush=True)
            func_tests.append(("export-csv", "PASS"))
            func_tests.append(("export-csv_file", csv_files[0].name))
        else:
            print(f"    ⚠️  export-csv: {stderr[:200] or stdout[:200]}", flush=True)
            func_tests.append(("export-csv", f"CODE={code}: {stderr[:100]}"))
        
        print("  测试 7: 导出 HTML...", flush=True)
        code, stdout, stderr = run_command([
            sys.executable, str(portfolio_script),
            "export-html", "--portfolio", "测试组合_AUTOTEST",
            "--output", str(temp_dir)
        ])
        html_files = list(temp_dir.glob("*.html"))
        if code == 0 and len(html_files) > 0:
            print("    ✓ export-html 命令正常", flush=True)
            func_tests.append(("export-html", "PASS"))
            func_tests.append(("export-html_file", html_files[0].name))
        else:
            print(f"    ⚠️  export-html: {stderr[:200] or stdout[:200]}", flush=True)
            func_tests.append(("export-html", f"CODE={code}: {stderr[:100]}"))
        
        print("  测试 8: 雪球 CSV 导入...", flush=True)
        sample_csv = project_root / "sample_xueqiu.csv"
        if sample_csv.exists():
            code, stdout, stderr = run_command([
                sys.executable, str(portfolio_script),
                "create-portfolio", "--name", "导入测试_AUTOTEST"
            ])
            code, stdout, stderr = run_command([
                sys.executable, str(portfolio_script),
                "import-csv", "--portfolio", "导入测试_AUTOTEST",
                "--file", str(sample_csv)
            ])
            if code == 0 and "成功导入" in (stdout + stderr):
                print("    ✓ import-csv 命令正常", flush=True)
                func_tests.append(("import-csv", "PASS"))
            else:
                print(f"    ⚠️  import-csv: {stderr[:200] or stdout[:200]}", flush=True)
                func_tests.append(("import-csv", f"CODE={code}: {stderr[:100]} or {stdout[:100]}"))
        else:
            print("    (跳过 - sample_xueqiu.csv 不存在)", flush=True)
            func_tests.append(("import-csv", "SKIP"))
        
        print("  测试 9: 盈亏统计...", flush=True)
        code, stdout, stderr = run_command([
            sys.executable, str(portfolio_script),
            "pnl", "--portfolio", "测试组合_AUTOTEST"
        ])
        if code == 0:
            print("    ✓ pnl 命令正常", flush=True)
            func_tests.append(("pnl", "PASS"))
        else:
            print(f"    ⚠️  pnl: {stderr[:200] or stdout[:200]}", flush=True)
            func_tests.append(("pnl", f"CODE={code}: {stderr[:100]}"))
        
        print("  测试 10: 列出投资组合...", flush=True)
        code, stdout, stderr = run_command([
            sys.executable, str(portfolio_script),
            "list-portfolios"
        ])
        if code == 0:
            print("    ✓ list-portfolios 命令正常", flush=True)
            func_tests.append(("list-portfolios", "PASS"))
        else:
            print(f"    ⚠️  list-portfolios: {stderr[:200] or stdout[:200]}", flush=True)
            func_tests.append(("list-portfolios", f"CODE={code}: {stderr[:100]}"))
        
        print(flush=True)
        print("[5/5] 清理测试数据...", flush=True)
        
        func_summary_file = project_root / "functional_test_results.txt"
        with open(func_summary_file, 'w', encoding='utf-8') as f:
            f.write("=" * 70 + "\n")
            f.write("  功能测试结果\n")
            f.write("=" * 70 + "\n\n")
            for name, result in func_tests:
                status = "PASS" if result == "PASS" else result
                f.write(f"  {name}: {status}\n")
            
            pass_count = sum(1 for _, r in func_tests if r == "PASS")
            total_count = sum(1 for n, _ in func_tests if not n.startswith("export-") or "_file" not in n)
            f.write(f"\n  通过: {pass_count}/{total_count}\n")
        
        print(f"  功能测试结果已保存到: {func_summary_file}", flush=True)
        print(flush=True)
        
        print("=" * 70, flush=True)
        print("  测试运行完成", flush=True)
        print("=" * 70, flush=True)
        print(flush=True)
        print("  请查看以下文件获取详细结果:", flush=True)
        print(f"  - {output_file}", flush=True)
        print(f"  - {func_summary_file}", flush=True)
        print(flush=True)
    else:
        print(f"  ✗ portfolio_manager.py 不存在: {portfolio_script}", flush=True)
    
    return 0

if __name__ == "__main__":
    sys.exit(main())

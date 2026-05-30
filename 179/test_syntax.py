#!/usr/bin/env python3
import ast
import sys
from pathlib import Path

def check_syntax(filepath):
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        ast.parse(content)
        print(f"✓ {filepath} - 语法正确")
        return True
    except SyntaxError as e:
        print(f"✗ {filepath} - 语法错误: {e}")
        return False

def main():
    base_dir = Path(__file__).parent / "travel_diary"
    files = ["__init__.py", "models.py", "storage.py", "manager.py", 
             "report.py", "map_generator.py", "statistics.py", "zip_utils.py", "cli.py"]
    all_ok = True
    for f in files:
        filepath = base_dir / f
        if filepath.exists():
            if not check_syntax(filepath):
                all_ok = False
        else:
            print(f"? {filepath} - 文件不存在")
            all_ok = False
    if not all_ok:
        sys.exit(1)
    print("\n🎉 所有文件语法检查通过!")

if __name__ == "__main__":
    main()

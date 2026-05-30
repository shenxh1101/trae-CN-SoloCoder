#!/usr/bin/env python3
"""运行 verify_all.py 并捕获所有输出"""
import sys
import os
from io import StringIO

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

old_stdout = sys.stdout
old_stderr = sys.stderr

output_capture = StringIO()

sys.stdout = output_capture
sys.stderr = output_capture

try:
    from verify_all import main
    exit_code = main()
    output_capture.write(f"\n\n脚本执行完成，退出码: {exit_code}\n")
except Exception as e:
    import traceback
    output_capture.write(f"\n\n执行出错: {e}\n")
    output_capture.write(traceback.format_exc())
finally:
    sys.stdout = old_stdout
    sys.stderr = old_stderr

captured_output = output_capture.getvalue()

with open("/Users/mac/code/solo coder/179/verify_output.txt", "w", encoding="utf-8") as f:
    f.write(captured_output)

print("输出已捕获到 verify_output.txt")
print("=" * 60)
print(captured_output)

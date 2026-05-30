#!/usr/bin/env python3
import sys
import os
from io import StringIO

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.chdir(os.path.dirname(os.path.abspath(__file__)))

output_capture = StringIO()
old_stdout = sys.stdout
old_stderr = sys.stderr
sys.stdout = output_capture
sys.stderr = output_capture

try:
    from verify_all import main
    exit_code = main()
    output_capture.write(f'\n\n脚本执行完成，退出码: {exit_code}\n')
except Exception as e:
    import traceback
    output_capture.write(f'\n\n执行出错: {e}\n')
    output_capture.write(traceback.format_exc())
    exit_code = 1
finally:
    sys.stdout = old_stdout
    sys.stderr = old_stderr

captured = output_capture.getvalue()
output_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'verify_output.txt')
with open(output_file, 'w', encoding='utf-8') as f:
    f.write(captured)

print(f"输出已保存到: {output_file}")
print("\n" + "="*80)
print(captured)
print("="*80)

sys.exit(exit_code)

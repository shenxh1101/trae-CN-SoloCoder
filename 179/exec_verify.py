EXEC_SCRIPT = '''
import sys
import os
from io import StringIO

sys.path.insert(0, '/Users/mac/code/solo coder/179')
os.chdir('/Users/mac/code/solo coder/179')

output_capture = StringIO()
old_stdout = sys.stdout
old_stderr = sys.stderr
sys.stdout = output_capture
sys.stderr = output_capture

try:
    from verify_all import main
    exit_code = main()
    output_capture.write(f'\\n\\n脚本执行完成，退出码: {exit_code}\\n')
except Exception as e:
    import traceback
    output_capture.write(f'\\n\\n执行出错: {e}\\n')
    output_capture.write(traceback.format_exc())
finally:
    sys.stdout = old_stdout
    sys.stderr = old_stderr

captured = output_capture.getvalue()
with open('/Users/mac/code/solo coder/179/verify_output.txt', 'w', encoding='utf-8') as f:
    f.write(captured)

print('CAPTURED_OUTPUT_START')
print(captured)
print('CAPTURED_OUTPUT_END')
'''

with open('/Users/mac/code/solo coder/179/exec_verify_code.py', 'w', encoding='utf-8') as f:
    f.write(EXEC_SCRIPT)

print("脚本已创建")

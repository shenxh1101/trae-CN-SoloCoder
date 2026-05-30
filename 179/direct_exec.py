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
    from install_deps import main as install_main
    install_result = install_main()
    print(f"\n依赖安装完成，结果: {install_result}")
    
    from verify_all import main as verify_main
    verify_result = verify_main()
    print(f"\n验证完成，结果: {verify_result}")
except Exception as e:
    import traceback
    print(f"\n执行出错: {e}")
    traceback.print_exc()
finally:
    sys.stdout = old_stdout
    sys.stderr = old_stderr

captured = output_capture.getvalue()
with open('/Users/mac/code/solo coder/179/verify_output.txt', 'w', encoding='utf-8') as f:
    f.write(captured)

print(captured)

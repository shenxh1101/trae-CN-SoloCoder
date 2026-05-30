#!/usr/bin/env python3
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

output_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'verify_output.txt')

with open(output_file, 'w', encoding='utf-8') as f:
    old_stdout = sys.stdout
    old_stderr = sys.stderr
    
    class TeeOutput:
        def __init__(self, file):
            self.file = file
            self.stdout = old_stdout
        def write(self, data):
            self.file.write(data)
            self.stdout.write(data)
            self.flush()
        def flush(self):
            self.file.flush()
            self.stdout.flush()
    
    tee = TeeOutput(f)
    sys.stdout = tee
    sys.stderr = tee
    
    try:
        from verify_all import main
        exit_code = main()
        print(f"\n\n脚本执行完成，退出码: {exit_code}")
    except Exception as e:
        import traceback
        print(f"\n\n执行出错: {e}")
        traceback.print_exc()
        exit_code = 1
    finally:
        sys.stdout = old_stdout
        sys.stderr = old_stderr

sys.exit(exit_code)

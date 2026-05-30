import subprocess
import sys
import os

os.chdir('/Users/mac/code/solo coder/179')

print("开始执行 verify_all.py...")
print("=" * 80)

result = subprocess.run(
    [sys.executable, 'verify_all.py'],
    capture_output=True,
    text=True,
    cwd='/Users/mac/code/solo coder/179',
    timeout=300
)

output = f"{'='*80}\n"
output += f"STDOUT:\n{result.stdout}\n"
output += f"{'='*80}\n"
output += f"STDERR:\n{result.stderr}\n"
output += f"{'='*80}\n"
output += f"Return Code: {result.returncode}\n"

with open('/Users/mac/code/solo coder/179/verify_output.txt', 'w', encoding='utf-8') as f:
    f.write(output)

print(output)
print("=" * 80)
print("输出已保存到 verify_output.txt")

sys.exit(result.returncode)
